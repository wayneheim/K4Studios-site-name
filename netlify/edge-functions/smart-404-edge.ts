const IMAGE_ID_MAP_URL = 'https://www.k4studios.com/imageIdMap.json';
const CACHE_TTL_MS = 5 * 60 * 1000;

type ImageIdMap = Record<string, string[] | string>;

let imageIdMapCache: ImageIdMap | null = null;
let imageIdMapCacheTime = 0;
let knownGallerySetCache: Set<string> | null = null;

function normalizePath(pathname: string): string {
  if (!pathname) return '';
  const trimmed = String(pathname).trim();
  if (!trimmed) return '';
  return trimmed.length > 1 ? trimmed.replace(/\/+$/g, '') : trimmed;
}

function extractImageId(pathname: string): string {
  const match = normalizePath(pathname).match(/\/(i-[A-Za-z0-9-]+)$/);
  return match ? match[1] : '';
}

function getParentGalleryPath(pathname: string): string {
  let normalized = normalizePath(pathname);
  normalized = normalized.replace(/\/(i-[A-Za-z0-9-]+)\/[A-Z]$/, '/$1');
  return normalized.replace(/\/[iI]-[A-Za-z0-9-]+$/, '');
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
  knownGallerySetCache = null;
  return json;
}

function getKnownGallerySet(imageIdMap: ImageIdMap): Set<string> {
  if (knownGallerySetCache) return knownGallerySetCache;

  const set = new Set<string>();
  for (const rawPaths of Object.values(imageIdMap)) {
    const paths = Array.isArray(rawPaths) ? rawPaths : [rawPaths];
    for (const path of paths) {
      const normalized = normalizePath(String(path || '')).toLowerCase();
      if (normalized) set.add(normalized);
    }
  }

  knownGallerySetCache = set;
  return set;
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
    const knownGallerySet = getKnownGallerySet(imageIdMap);
    const requestedGalleryPath = getParentGalleryPath(pathname);
    const requestedLower = requestedGalleryPath.toLowerCase();

    if (!knownGallerySet.has(requestedLower) && !knownGallerySet.has(`${requestedLower}/gallery`)) {
      return context.next();
    }

    const rawPaths = imageIdMap[imageId];
    if (!rawPaths) {
      return context.next();
    }

    const canonicalPaths = Array.isArray(rawPaths) ? rawPaths : [rawPaths];
    const firstCanonicalPath = normalizePath(String(canonicalPaths[0] || ''));
    if (!firstCanonicalPath) {
      return context.next();
    }

    const canonicalUrlPath = `${firstCanonicalPath}/${imageId}`;
    if (canonicalUrlPath.toLowerCase() === pathname.toLowerCase()) {
      return context.next();
    }

    return Response.redirect(`${url.origin}${canonicalUrlPath}${url.search}`, 301);
  } catch (_error) {
    return context.next();
  }
}