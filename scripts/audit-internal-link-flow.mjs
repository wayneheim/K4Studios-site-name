import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://www.k4studios.com';
const DIST_DIR = 'dist';

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_astro') continue;
      walk(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
  return results;
}

function normalizePathname(value) {
  let pathname = String(value || '').trim();
  if (!pathname) return '';
  pathname = pathname.split('#')[0].split('?')[0];
  pathname = pathname.replace(/\/+$/, '');
  return pathname || '/';
}

function normalizeHref(rawHref) {
  const href = String(rawHref || '').trim();
  if (!href || href.startsWith('#')) return '';
  if (/^(mailto|tel|javascript|data):/i.test(href)) return '';

  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if (url.hostname !== 'www.k4studios.com' && url.hostname !== 'k4studios.com') return '';
      return normalizePathname(url.pathname);
    } catch {
      return '';
    }
  }

  if (!href.startsWith('/')) return '';
  if (/^\/(?:_astro|img|images|audio|data)\//i.test(href)) return '';
  if (/\.(?:css|js|json|xml|jpg|jpeg|png|webp|gif|svg|ico|txt|pdf)$/i.test(href)) return '';
  return normalizePathname(href);
}

function routeFromDistHtml(filePath) {
  const relativePath = path.relative(DIST_DIR, filePath).replace(/\\/g, '/');
  if (relativePath === 'index.html') return '/';
  if (relativePath.endsWith('/index.html')) {
    return normalizePathname(`/${relativePath.replace(/\/index\.html$/, '')}`);
  }
  return normalizePathname(`/${relativePath.replace(/\.html$/, '')}`);
}

function isImagePage(route) {
  return /\/i-[A-Za-z0-9]+$/.test(route);
}

function isAllPage(route) {
  return /\/all$/.test(route);
}

function loadCommercialDoorways() {
  const source = read('src/data/doorway/commercialIntentPages.ts');
  return Array.from(
    source.matchAll(/pagePath:\s*['"]([^'"]+)['"]/g),
    (match) => normalizePathname(match[1])
  );
}

function loadSitemapAllPages() {
  const sitemap = read('public/sitemap.xml');
  return Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => normalizeHref(match[1]))
    .filter((route) => route.endsWith('/all'));
}

function makeTargetStats(targets) {
  return new Map(
    targets.map((target) => [
      target,
      {
        target,
        totalLinks: 0,
        sourcePages: new Set(),
        nonImageSourcePages: new Set(),
        imageSourcePages: new Set(),
        allSourcePages: new Set(),
        doorwaySourcePages: new Set(),
      },
    ])
  );
}

function summarize(statsMap) {
  return Array.from(statsMap.values())
    .map((item) => ({
      target: item.target,
      totalLinks: item.totalLinks,
      uniqueSourcePages: item.sourcePages.size,
      nonImageSourcePages: item.nonImageSourcePages.size,
      imageSourcePages: item.imageSourcePages.size,
      allSourcePages: item.allSourcePages.size,
      doorwaySourcePages: item.doorwaySourcePages.size,
      sampleNonImageSources: Array.from(item.nonImageSourcePages).sort().slice(0, 8),
    }))
    .sort((a, b) => a.nonImageSourcePages - b.nonImageSourcePages || a.uniqueSourcePages - b.uniqueSourcePages || a.target.localeCompare(b.target));
}

const doorwayTargets = Array.from(new Set(loadCommercialDoorways())).sort();
const allTargets = Array.from(new Set(loadSitemapAllPages())).sort();
const doorwayTargetSet = new Set(doorwayTargets);
const allTargetSet = new Set(allTargets);
const allTargetsSet = new Set([...doorwayTargets, ...allTargets]);

const doorwayStats = makeTargetStats(doorwayTargets);
const allPageStats = makeTargetStats(allTargets);
const htmlFiles = walk(DIST_DIR);

for (const filePath of htmlFiles) {
  const sourceRoute = routeFromDistHtml(filePath);
  const html = read(filePath);
  const sourceIsImage = isImagePage(sourceRoute);
  const sourceIsAll = isAllPage(sourceRoute);
  const sourceIsDoorway = doorwayTargetSet.has(sourceRoute);

  for (const match of html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) {
    const href = normalizeHref(match[1]);
    if (!href || href === sourceRoute || !allTargetsSet.has(href)) continue;

    const stats = doorwayStats.get(href) || allPageStats.get(href);
    if (!stats) continue;

    stats.totalLinks += 1;
    stats.sourcePages.add(sourceRoute);
    if (sourceIsImage) stats.imageSourcePages.add(sourceRoute);
    else stats.nonImageSourcePages.add(sourceRoute);
    if (sourceIsAll) stats.allSourcePages.add(sourceRoute);
    if (sourceIsDoorway) stats.doorwaySourcePages.add(sourceRoute);
  }
}

const doorwaySummary = summarize(doorwayStats);
const allPageSummary = summarize(allPageStats);

const result = {
  scannedHtmlFiles: htmlFiles.length,
  doorwayTargets: doorwayTargets.length,
  allPageTargets: allTargets.length,
  doorwaysWithNoNonImageInboundLinks: doorwaySummary.filter((item) => item.nonImageSourcePages === 0).length,
  allPagesWithNoNonImageInboundLinks: allPageSummary.filter((item) => item.nonImageSourcePages === 0).length,
  weakestDoorways: doorwaySummary.slice(0, 16),
  weakestAllPages: allPageSummary.slice(0, 20),
  strongestDoorways: doorwaySummary.slice(-10).reverse(),
  strongestAllPages: allPageSummary.slice(-10).reverse(),
};

fs.mkdirSync('tmp', { recursive: true });
fs.writeFileSync('tmp/internal-link-flow-report.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
