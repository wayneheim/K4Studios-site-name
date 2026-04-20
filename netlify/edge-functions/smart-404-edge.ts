const IMAGE_ID_MAP_URL = 'https://www.k4studios.com/imageIdMap.json';
const CACHE_TTL_MS = 5 * 60 * 1000;

type ImageIdMap = Record<string, string[] | string>;

let imageIdMapCache: ImageIdMap | null = null;
let imageIdMapCacheTime = 0;

function normalizePath(pathname: string): string {
  if (!pathname) return '';
  const trimmed = String(pathname).trim();
  if (!trimmed) return '';
  return trimmed.length > 1 ? trimmed.replace(/\/+$/g, '') : trimmed;
}

function extractImageId(pathname: string): string {
  const match = normalizePath(pathname).match(/\/(i-[A-Za-z0-9-]+)(?:\/[A-Z])?$/);
  return match ? match[1] : '';
}

function getParentGalleryPath(pathname: string): string {
  let normalized = normalizePath(pathname);
  normalized = normalized.replace(/\/(i-[A-Za-z0-9-]+)\/[A-Z]$/, '/$1');
  return normalized.replace(/\/[iI]-[A-Za-z0-9-]+$/, '');
}

function findMatchingGalleryPath(requestedPath: string, candidates: string[]): string {
  const requestedGalleryPath = normalizePath(getParentGalleryPath(requestedPath)).toLowerCase();
  if (!requestedGalleryPath) return '';

  return candidates.find((candidate) => {
    return normalizePath(String(candidate || '')).toLowerCase() === requestedGalleryPath;
  }) || '';
}

function pickCanonicalGalleryPath(requestedPath: string, candidates: string[]): string {
  if (!Array.isArray(candidates) || candidates.length === 0) return '';
  if (candidates.length === 1) return candidates[0];

  const requestedLower = String(requestedPath || '').toLowerCase();
  const matchedByType = candidates.find((candidate) => {
    const candidateLower = String(candidate || '').toLowerCase();
    if (requestedLower.includes('/painterly-fine-art-photography/') && candidateLower.includes('/painterly-fine-art-photography/')) {
      return true;
    }
    if (
      requestedLower.includes('/fine-art-photography/') &&
      !requestedLower.includes('/painterly-fine-art-photography/') &&
      candidateLower.includes('/fine-art-photography/') &&
      !candidateLower.includes('/painterly-fine-art-photography/')
    ) {
      return true;
    }
    return false;
  });

  if (matchedByType) return matchedByType;

  const painterlyPreferred = candidates.find((candidate) => {
    return String(candidate || '').toLowerCase().includes('/painterly-fine-art-photography/');
  });

  return painterlyPreferred || candidates[0];
}

async function getImageIdMap(): Promise<ImageIdMap> {
  const now = Date.now();
  if (imageIdMapCache && now - imageIdMapCacheTime < CACHE_TTL_MS) {
    return imageIdMapCache;
  }

  const response = await fetch(IMAGE_ID_MAP_URL, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`imageIdMap fetch failed: ${response.status}`);
  }

  const json = (await response.json()) as ImageIdMap;
  imageIdMapCache = json;
  imageIdMapCacheTime = now;
  return json;
}

export default async function smart404Edge(request: Request, context: { next: () => Promise<Response> }) {
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);

  if (!/^\/(?:Galleries|galleries|Other|other|Photography-Galleries)\//.test(pathname)) {
    return context.next();
  }

  const imageId = extractImageId(pathname);
  if (!imageId) {
    return context.next();
  }

  try {
    const imageIdMap = await getImageIdMap();
    const rawPaths = imageIdMap[imageId];
    if (!rawPaths) {
      return context.next();
    }

    const canonicalPaths = (Array.isArray(rawPaths) ? rawPaths : [rawPaths])
      .map((candidate) => normalizePath(String(candidate || '')))
      .filter(Boolean);
    if (canonicalPaths.length === 0) {
      return context.next();
    }

    const matchingGalleryPath = findMatchingGalleryPath(pathname, canonicalPaths);
    if (matchingGalleryPath) {
      const canonicalUrlPath = `${matchingGalleryPath}/${imageId}`;
      if (canonicalUrlPath.toLowerCase() !== pathname.toLowerCase()) {
        return Response.redirect(`${url.origin}${canonicalUrlPath}${url.search}`, 301);
      }

      return context.next();
    }

    const canonicalGalleryPath = pickCanonicalGalleryPath(pathname, canonicalPaths);
    if (!canonicalGalleryPath) {
      return context.next();
    }

    const canonicalUrlPath = `${canonicalGalleryPath}/${imageId}`;
    if (canonicalUrlPath.toLowerCase() === pathname.toLowerCase()) {
      return context.next();
    }

    return Response.redirect(`${url.origin}${canonicalUrlPath}${url.search}`, 301);
  } catch (_error) {
    return context.next();
  }
}