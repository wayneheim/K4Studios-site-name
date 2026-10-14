type ImageIdMap = Record<string, string[] | string>;

const PUBLIC_SITE_ORIGIN = 'https://www.k4studios.com';

function decodeHtmlAttribute(value: string): string {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function hasApprovedSketchCheckout(html: string): boolean {
  const match = html.match(/data-k4-sketch-checkout="([^"]+)"/i);
  if (!match) return false;

  try {
    const checkout = new URL(decodeHtmlAttribute(match[1]));
    return checkout.protocol === 'https:' && checkout.hostname === 'wayne-heim.smugmug.com';
  } catch {
    return false;
  }
}

function rewriteSketchProductSchema(html: string, variantUrl: string): string {
  return html.replace(
    /(<script[^>]*data-k4-schema="sketch-product"[^>]*>)([\s\S]*?)(<\/script>)/i,
    (_match, open, json, close) => {
      try {
        const schema = JSON.parse(json);
        const baseName = String(schema.name || 'Fine Art Photograph')
          .replace(/\s*-\s*(?:Sketch Series Print|Open Edition 5 x 7 Physical Photographic Print)\s*$/i, '')
          .trim();
        schema['@id'] = `${variantUrl}#product-sketch`;
        schema.name = `${baseName} - Open Edition 5 x 7 Physical Photographic Print`;
        schema.description = 'A finished, open-edition 5 x 7 physical photographic paper print. The buyer receives a tangible print shipped to the delivery address.';
        schema.mainEntityOfPage = { '@type': 'WebPage', '@id': variantUrl };
        delete schema.isRelatedTo;
        if (schema.offers && typeof schema.offers === 'object') {
          schema.offers['@id'] = `${variantUrl}#offer-sketch`;
          schema.offers.name = 'Open Edition 5 x 7 Physical Photographic Print';
          schema.offers.url = variantUrl;
        }
        return `${open}${JSON.stringify(schema).replace(/</g, '\\u003c')}${close}`;
      } catch {
        return _match;
      }
    }
  );
}

function stripMerchantEditorialPanels(html: string): string {
  return html
    .replace(/<button\b(?=[^>]*\btitle="(?:View|Hide) Collector Notes")[^>]*>[\s\S]*?<\/button>\s*/gi, '')
    .replace(/<section\b(?=[^>]*\bdata-k4-merchant-strip="collector-notes")[^>]*>[\s\S]*?<\/section>\s*/gi, '')
    .replace(/<a\b(?=[^>]*\bdata-k4-merchant-strip="featured-blog-link")[^>]*>[\s\S]*?<\/a>\s*/gi, '')
    .replace(/<nav\b(?=[^>]*\bdata-k4-merchant-strip="related-navigation")[^>]*>[\s\S]*?<\/nav>\s*/gi, '');
}

async function renderMerchantSketchVariant(request: Request, pathname: string): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  const basePath = pathname.replace(/-sketch$/i, '');
  const baseResponse = await fetch(`${PUBLIC_SITE_ORIGIN}${basePath}`, {
    method: 'GET',
    headers: request.headers,
    redirect: 'follow',
  });
  const contentType = baseResponse.headers.get('content-type') || '';
  if (!baseResponse.ok || !contentType.toLowerCase().includes('text/html')) {
    return new Response('Not Found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
  }

  const sourceHtml = await baseResponse.text();
  if (!hasApprovedSketchCheckout(sourceHtml)) {
    return new Response('Not Found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
  }

  const variantUrl = `${PUBLIC_SITE_ORIGIN}${pathname}`;
  let html = sourceHtml.replace(
    /<script[^>]*data-k4-schema="artwork-license"[^>]*>[\s\S]*?<\/script>\s*/i,
    ''
  );
  html = rewriteSketchProductSchema(html, variantUrl);
  html = stripMerchantEditorialPanels(html);
  html = html
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i, `$1${variantUrl}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/i, `$1${variantUrl}$2`)
    .replace(/(<meta\s+name="twitter:url"\s+content=")[^"]*(")/i, `$1${variantUrl}$2`);

  const headers = new Headers(baseResponse.headers);
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-store');
  headers.set('X-K4-Merchant-Variant', 'sketch-physical-product');

  if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
  return new Response(html, { status: 200, headers });
}

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

  // Astro does not generate duplicate -sketch pages. Transform only the labeled
  // schema blocks while preserving the normal page markup and hydration.
  if (/\/i-[A-Za-z0-9]+-sketch$/i.test(pathname)) {
    return renderMerchantSketchVariant(request, pathname);
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
