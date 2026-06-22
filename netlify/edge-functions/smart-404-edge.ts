type ImageIdMap = Record<string, string[] | string>;

let imageIdMapCache: ImageIdMap | null = null;
let imageIdMapPromise: Promise<ImageIdMap> | null = null;

async function getImageIdMap(request: Request): Promise<ImageIdMap> {
  if (imageIdMapCache) return imageIdMapCache;

  if (!imageIdMapPromise) {
    const mapUrl = new URL('/imageIdMap.json', request.url);
    imageIdMapPromise = fetch(mapUrl.toString(), {
      headers: { Accept: 'application/json' }
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`imageIdMap fetch failed: ${response.status}`);
        }
        const data = await response.json() as ImageIdMap;
        imageIdMapCache = data;
        return data;
      })
      .catch((_error) => {
        imageIdMapPromise = null;
        return {};
      });
  }

  return imageIdMapPromise;
}

function normalizePath(pathname: string): string {
  if (!pathname) return '';
  const trimmed = String(pathname).trim();
  if (!trimmed) return '';
  return trimmed.length > 1 ? trimmed.replace(/\/+$/g, '') : trimmed;
}

const LEGACY_PHOTOGRAPHY_GALLERY_PREFIXES: Array<[string, string]> = [
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/WWII-Themed-Fine-Art-Photography/Men-and-Machines-Fine-Art-Photography/Men-and-Machines-Black-and-White', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/WWII-Themed-Fine-Art-Photography/Men-and-Machines-Fine-Art-Photography/Men-and-Machines', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/WWII-Themed-Fine-Art-Photography/Men-and-Machines-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines'],
  ['/Photography-Galleries/Painterly-Photography/Facing-History-Photography/WWII-Themed-Fine-Art-Photography/Men-and-Machines-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/WWII-Themed-Fine-Art-Photography/Art-of-War-Fine-Art-Photography/The-Art-of-War-WWII-Reenactment-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/WWII-Themed-Fine-Art-Photography/Art-of-War-Fine-Art-Photography/Art-of-War-Archive', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War'],
  ['/Photography-Galleries/Painterly-Photography/Facing-History-Photography/WWII-Themed-Fine-Art-Photography/Art-of-War-Fine-Art-Photography/Art-of-War-Archive', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War'],
  ['/Photography-Galleries/Painterly-Photography/Facing-History-Photography/WWII-Themed-Fine-Art-Photography/Art-of-War-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/WWII-Themed-Fine-Art-Photography/Art-of-War-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/WWII-Themed-Fine-Art-Photography/WWII-Fine-Art-Portrait-Photography/World-War-II-Black-and-White', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/WWII-Themed-Fine-Art-Photography/WWII-Fine-Art-Portrait-Photography/WWII-Fine-Art-Portraits', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color'],
  ['/Photography-Galleries/Painterly-Photography/Fine-Art-Portraits/WWII-Themed-Fine-Art-Photography/Men-and-Machines/Men-and-Machines-Black-and-White', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/WWII-Themed-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII'],
  ['/Photography-Galleries/Painterly-Photography/Facing-History-Photography/WWII-Themed-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/Civil-War-Portrait-Fine-Art-Photography/Civil-War-Themed-Color-Fine-Art-Photographs', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/Civil-War-Portrait-Fine-Art-Photography/Civil-War-Themed-BW-Fine-Art-Photographs', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Black-White'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/Civil-War-Portrait-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/Roaring-20s-Themed-Fine-Art-Portrait-Photography/Roaring-20s-Themed-Color-Fine-Art-Photographs', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Color'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/Roaring-20s-Themed-Fine-Art-Portrait-Photography/Roaring-20s-Themed-BW-Fine-Art-Photographs', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits/Black-White'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/Roaring-20s-Themed-Fine-Art-Portrait-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Roaring-20s-Portraits'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/Western-Themed-Fine-Art-Photography/Western-BW-Portrait-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/Western-Themed-Fine-Art-Photography/Western-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography/Western-Themed-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West'],
  ['/Photography-Galleries/Painterly-Photography/Historical-Themed-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Facing-History'],
  ['/Photography-Galleries/Painterly-Photography/Transportation-Themed-Fine-Art-Photography/Transportation-Trains-Color', '/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Color'],
  ['/Photography-Galleries/Painterly-Photography/Transportation-Themed-Fine-Art-Photography/Transportation-Trains-BW', '/Galleries/Painterly-Fine-Art-Photography/Transportation/Trains-Black-White'],
  ['/Photography-Galleries/Painterly-Photography/Transportation-Themed-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Transportation'],
  ['/Photography-Galleries/Painterly-Photography/Miscellaneous-Fine-Art-Photography/Portraits-Painterly', '/Galleries/Painterly-Fine-Art-Photography/Miscellaneous/Portraits'],
  ['/Photography-Galleries/Painterly-Photography/Painterly-Landscape-Fine-Art-Photography', '/Galleries/Painterly-Fine-Art-Photography/Landscapes'],
  ['/Photography-Galleries/Painterly-Photography', '/Galleries/Painterly-Fine-Art-Photography'],
  ['/Photography-Galleries/Traditional-Photos/Landscapes-Gallery/Location/Landscapes-International/The-Faroe-Islands', '/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/The-Faroe-Islands'],
  ['/Photography-Galleries/Traditional-Photos/Landscapes-Gallery/Location/Landscapes-Northeast/North-East', '/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery'],
  ['/Photography-Galleries/Fine-Art-Photography/Landscapes-Gallery/Location/Landscapes-Northeast/North-East', '/Galleries/Fine-Art-Photography/Landscapes/By-Location/Northeast/Gallery'],
  ['/Photography-Galleries/Fine-Art-Photography/Landscapes-Gallery/Location', '/Galleries/Fine-Art-Photography/Landscapes/By-Location'],
  ['/Photography-Galleries/Traditional-Photos/Landscapes-Gallery', '/Galleries/Fine-Art-Photography/Landscapes'],
  ['/Photography-Galleries/Traditional-Photos/Portraits-and-People-Fine-Art-Photography', '/Galleries/Fine-Art-Photography/Portraits'],
  ['/Photography-Galleries/Traditional-Photos/Transportation-Themed-Fine-Art-Photography', '/Galleries/Fine-Art-Photography/Transportation'],
  ['/Photography-Galleries/Traditional-Photos', '/Galleries/Fine-Art-Photography'],
  ['/Photography-Galleries', '/Galleries']
].sort((a, b) => b[0].length - a[0].length);

function getLegacyPhotographyGalleryRedirect(pathname: string): string {
  const normalized = normalizePath(pathname);
  const lower = normalized.toLowerCase();
  for (const [legacyPrefix, target] of LEGACY_PHOTOGRAPHY_GALLERY_PREFIXES) {
    const legacyLower = legacyPrefix.toLowerCase();
    if (lower === legacyLower || lower.startsWith(`${legacyLower}/`)) {
      return target;
    }
  }
  return '';
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

function isThemeFilteredGalleryView(url: URL): boolean {
  return url.searchParams.has('theme');
}

function isHtmlResponse(response: Response): boolean {
  return (response.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

async function addThemeFilteredGalleryNoindex(response: Response): Promise<Response> {
  if (!isHtmlResponse(response)) return response;

  const html = await response.text();
  const robotsMeta = '<meta name="robots" content="noindex, follow">';
  const nextHeaders = new Headers(response.headers);
  nextHeaders.set('X-Robots-Tag', 'noindex, follow');

  let body = html;
  if (/<meta\s+name=["']robots["'][^>]*>/i.test(body)) {
    body = body.replace(/<meta\s+name=["']robots["'][^>]*>/i, robotsMeta);
  } else {
    body = body.replace(/<head([^>]*)>/i, `<head$1>${robotsMeta}`);
  }

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders,
  });
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

export default async function smart404Edge(request: Request, context: { next: () => Promise<Response> }) {
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);
  const shouldNoindexThemeFilteredView =
    request.method === 'GET' &&
    isThemeFilteredGalleryView(url) &&
    !extractImageId(pathname);

  if (!/^\/(?:Galleries|galleries|Other|other|Photography-Galleries)\//.test(pathname)) {
    return context.next();
  }

  const imageId = extractImageId(pathname);
  if (!imageId) {
    const legacyRedirect = getLegacyPhotographyGalleryRedirect(pathname);
    if (legacyRedirect) {
      return Response.redirect(`${url.origin}${legacyRedirect}${url.search}`, 301);
    }

    const response = await context.next();
    return shouldNoindexThemeFilteredView ? addThemeFilteredGalleryNoindex(response) : response;
  }

  try {
    const imageIdMap = await getImageIdMap(request);
    const rawPaths = imageIdMap[imageId];
    if (!rawPaths) {
      const response = await context.next();
      return shouldNoindexThemeFilteredView ? addThemeFilteredGalleryNoindex(response) : response;
    }

    const canonicalPaths = (Array.isArray(rawPaths) ? rawPaths : [rawPaths])
      .map((candidate) => normalizePath(String(candidate || '')))
      .filter(Boolean);
    if (canonicalPaths.length === 0) {
      const response = await context.next();
      return shouldNoindexThemeFilteredView ? addThemeFilteredGalleryNoindex(response) : response;
    }

    const matchingGalleryPath = findMatchingGalleryPath(pathname, canonicalPaths);
    if (matchingGalleryPath) {
      const canonicalUrlPath = `${matchingGalleryPath}/${imageId}`;
      if (canonicalUrlPath.toLowerCase() !== pathname.toLowerCase()) {
        return Response.redirect(`${url.origin}${canonicalUrlPath}${url.search}`, 301);
      }

      const response = await context.next();
      return shouldNoindexThemeFilteredView ? addThemeFilteredGalleryNoindex(response) : response;
    }

    const canonicalGalleryPath = pickCanonicalGalleryPath(pathname, canonicalPaths);
    if (!canonicalGalleryPath) {
      const response = await context.next();
      return shouldNoindexThemeFilteredView ? addThemeFilteredGalleryNoindex(response) : response;
    }

    const canonicalUrlPath = `${canonicalGalleryPath}/${imageId}`;
    if (canonicalUrlPath.toLowerCase() === pathname.toLowerCase()) {
      const response = await context.next();
      return shouldNoindexThemeFilteredView ? addThemeFilteredGalleryNoindex(response) : response;
    }

    return Response.redirect(`${url.origin}${canonicalUrlPath}${url.search}`, 301);
  } catch (_error) {
    const response = await context.next();
    return shouldNoindexThemeFilteredView ? addThemeFilteredGalleryNoindex(response) : response;
  }
}
