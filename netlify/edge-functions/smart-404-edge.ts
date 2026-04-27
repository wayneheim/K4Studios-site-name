const IMAGE_ID_MAP_URL = 'https://www.k4studios.com/imageIdMap.json';
const IMAGE_MANIFEST_URL = 'https://www.k4studios.com/image-manifest.json';
const CACHE_TTL_MS = 5 * 60 * 1000;

// IDs intentionally omitted from imageIdMap (for example hidden archive items)
// can still receive a deterministic smart-404 redirect target.
const ARCHIVE_FALLBACK_BY_ID: Record<string, string> = {
  'i-fkmpxjf': '/Other/Archive',
};

type ImageIdMap = Record<string, string[] | string>;
const GHOST_IMAGE_ID = 'i-k4studios';

let imageIdMapCache: ImageIdMap | null = null;
let imageIdMapCacheTime = 0;
let imageManifestIdSetCache: Set<string> | null = null;
let imageManifestMapCache: Record<string, any> | null = null;
let imageManifestCacheTime = 0;

function normalizePath(pathname: string): string {
  if (!pathname) return '';
  const trimmed = String(pathname).trim();
  if (!trimmed) return '';
  return trimmed.length > 1 ? trimmed.replace(/\/+$/g, '') : trimmed;
}

function extractImageId(pathname: string): string {
  // Accept legacy suffixes after image IDs (for example /A, /buy)
  // so moved-image rematching still runs instead of falling through.
  const match = normalizePath(pathname).match(/\/(i-[A-Za-z0-9-]+)(?:\/[^/]+)?$/i);
  return match ? match[1] : '';
}

function getArchiveFallbackPath(imageId: string): string {
  if (!imageId) return '';
  return ARCHIVE_FALLBACK_BY_ID[imageId.toLowerCase()] || '';
}

function getParentGalleryPath(pathname: string): string {
  let normalized = normalizePath(pathname);
  normalized = normalized.replace(/\/(i-[A-Za-z0-9-]+)(?:\/[^/]+)?$/i, '/$1');
  return normalized.replace(/\/[iI]-[A-Za-z0-9-]+$/i, '');
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

async function getImageManifestIdSet(): Promise<Set<string> | null> {
  const now = Date.now();
  if (imageManifestIdSetCache && now - imageManifestCacheTime < CACHE_TTL_MS) {
    return imageManifestIdSetCache;
  }

  const response = await fetch(IMAGE_MANIFEST_URL, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as Record<string, unknown>;
  const lowerMap: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(json || {})) {
    lowerMap[String(k || '').toLowerCase()] = v;
  }

  imageManifestMapCache = lowerMap;
  imageManifestIdSetCache = new Set(Object.keys(json || {}).map((k) => String(k || '').toLowerCase()));
  imageManifestCacheTime = now;
  return imageManifestIdSetCache;
}

function pickManifestImagePagePath(entry: Record<string, unknown> | null | undefined, imageId: string): string {
  if (!entry || typeof entry !== 'object') return '';
  const rawPaths = (entry as any).paths;
  const paths = Array.isArray(rawPaths) ? rawPaths : [];
  const firstPath = paths.find((p): p is string => {
    if (typeof p !== 'string') return false;
    const n = normalizePath(p).toLowerCase();
    return n.startsWith('/galleries/');
  });
  if (!firstPath || !imageId) return '';
  return `${normalizePath(firstPath)}/${imageId}`;
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

  if (String(imageId || '').toLowerCase() === GHOST_IMAGE_ID) {
    return new Response('', {
      status: 410,
      headers: {
        'Cache-Control': 'public, max-age=86400',
        'X-Robots-Tag': 'noindex, nofollow'
      }
    });
  }

  try {
    const imageIdMap = await getImageIdMap();
    const rawPaths = imageIdMap[imageId];
    if (!rawPaths) {
      const manifestIds = await getImageManifestIdSet();
      const imageIdLower = String(imageId || '').toLowerCase();
      if (manifestIds && manifestIds.has(imageIdLower)) {
        const manifestEntry = imageManifestMapCache?.[imageIdLower] as Record<string, unknown> | undefined;
        const manifestImagePagePath = pickManifestImagePagePath(manifestEntry, imageId);
        if (manifestImagePagePath && manifestImagePagePath.toLowerCase() !== pathname.toLowerCase()) {
          return Response.redirect(`${url.origin}${manifestImagePagePath}${url.search}`, 301);
        }

        const parentGalleryPath = getParentGalleryPath(pathname);
        if (parentGalleryPath) {
          return Response.redirect(`${url.origin}${parentGalleryPath}${url.search}`, 301);
        }
      }

      const archiveFallbackPath = getArchiveFallbackPath(imageId);
      if (archiveFallbackPath && pathname.toLowerCase() !== archiveFallbackPath.toLowerCase()) {
        return Response.redirect(`${url.origin}${archiveFallbackPath}${url.search}`, 301);
      }
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

      // If the request path is already a valid membership path, let the origin
      // respond first. Recover only true misses (404) to gallery root.
      const upstream = await context.next();
      if (upstream.status === 404) {
        return Response.redirect(`${url.origin}${matchingGalleryPath}${url.search}`, 301);
      }
      return upstream;
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