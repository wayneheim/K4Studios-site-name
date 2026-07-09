import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://www.k4studios.com';
const sitemapXml = fs.readFileSync('public/sitemap.xml', 'utf8');
const sitemapLocs = new Set(
  Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1])
);

const commercialSource = fs.readFileSync('src/data/doorway/commercialIntentPages.ts', 'utf8');
const commercialDoorwayPaths = Array.from(
  commercialSource.matchAll(/pagePath:\s*['"]([^'"]+)['"]/g),
  (match) => match[1]
);

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, results);
    } else if (entry.isFile() && entry.name === 'all.astro') {
      results.push(fullPath);
    }
  }
  return results;
}

const allAstroRoutes = walk('src/pages')
  .filter((filePath) => !filePath.includes(`${path.sep}admin${path.sep}`))
  .filter((filePath) => !/archived/i.test(filePath))
  .filter((filePath) => !/_all-backup/i.test(filePath))
  .map((filePath) => {
    const relativePath = path.relative('src/pages', filePath).replace(/\\/g, '/');
    return `/${relativePath.replace(/\/all\.astro$/, '')}/all`;
  })
  .filter((route) => !route.includes('['));

const siteNavSource = fs
  .readFileSync('src/data/siteNav.js', 'utf8')
  .replace(/\/\/.*$/gm, '');
const gallerySourceHrefs = [];
for (const block of siteNavSource.split(/\{\s*/)) {
  const isGallerySource =
    /type\s*:\s*['"]gallery-source['"]/.test(block) ||
    /['"]type['"]\s*:\s*['"]gallery-source['"]/.test(block);
  if (!isGallerySource) continue;
  if (/\bhidden\s*:\s*true\b/.test(block) || /['"]hidden['"]\s*:\s*true\b/.test(block)) continue;

  const hrefMatch =
    block.match(/href\s*:\s*['"]([^'"]+)['"]/) ||
    block.match(/['"]href['"]\s*:\s*['"]([^'"]+)['"]/);
  if (hrefMatch?.[1]) gallerySourceHrefs.push(hrefMatch[1]);
}

const siteNavAllRoutes = Array.from(new Set(gallerySourceHrefs))
  .map((href) => `${href.replace(/\/$/, '')}/all`);

function missing(routes) {
  return routes.filter((route) => !sitemapLocs.has(SITE_URL + route));
}

const result = {
  sitemapLocCount: sitemapLocs.size,
  commercialDoorwayCount: commercialDoorwayPaths.length,
  missingCommercialDoorways: missing(commercialDoorwayPaths),
  allAstroRouteCount: allAstroRoutes.length,
  missingAllAstroRoutes: missing(allAstroRoutes),
  siteNavGallerySourceCount: siteNavAllRoutes.length,
  missingSiteNavAllRoutes: missing(siteNavAllRoutes),
};

console.log(JSON.stringify(result, null, 2));
