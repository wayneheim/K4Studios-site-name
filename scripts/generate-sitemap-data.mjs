// Generates src/data/sitemap.ts by scanning local Astro pages AND their connected gallery data files
// Usage: node scripts/generate-sitemap-data.mjs

import { writeFile, mkdir, readdir, stat, readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://www.k4studios.com';
const PAGES_DIR = path.resolve(__dirname, '..', 'src', 'pages');
const REPO_ROOT = path.resolve(__dirname, '..');
const MASTER_GALLERY_DATA_FILE = path.resolve(__dirname, '..', 'src', 'data', 'galleryMaps', 'MasterGalleryData.mjs');
const DOORWAY_REGISTRY_FILE = path.resolve(__dirname, '..', 'src', 'data', 'doorway', 'doorwayPages.ts');
const SITE_NAV_FILE = path.resolve(__dirname, '..', 'src', 'data', 'siteNav.js');
const VIDEO_REGISTRY_FILE = path.resolve(__dirname, '..', 'src', 'data', 'videos', 'videoRegistry.ts');
const DYNAMIC_ALL_ROUTE_FILE = path.resolve(__dirname, '..', 'src', 'pages', '[...gallery]', 'all.astro');

const GHOST_IMAGE_ID = 'i-k4studios';
const IMAGE_ID_REGEX = /^i-[A-Za-z0-9]+$/;
const HIDDEN_VISIBILITY = new Set(['hidden', 'hide', 'ghost', 'non', 'none', '']);

function isHiddenImage(img) {
  const visibility = String(img?.visibility ?? 'show').trim().toLowerCase();
  return HIDDEN_VISIBILITY.has(visibility);
}

function isGhostImageId(id) {
  return String(id || '').trim().toLowerCase() === GHOST_IMAGE_ID;
}

function getGitLastModifiedIso(absoluteFilePath) {
  try {
    const rel = path.relative(REPO_ROOT, absoluteFilePath).replace(/\\/g, '/');
    const out = execSync(`git log -1 --format=%cI -- "${rel}"`, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
    return out || null;
  } catch {
    return null;
  }
}

function hasUncommittedChanges(absoluteFilePath) {
  try {
    const rel = path.relative(REPO_ROOT, absoluteFilePath).replace(/\\/g, '/');
    const out = execSync(`git status --porcelain -- "${rel}"`, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
    return Boolean(out);
  } catch {
    return false;
  }
}

function getStableLastmodIso(absoluteFilePath, fallbackMtimeIso) {
  if (hasUncommittedChanges(absoluteFilePath)) return fallbackMtimeIso;
  return getGitLastModifiedIso(absoluteFilePath) || fallbackMtimeIso;
}

async function getFileLastmodIso(absoluteFilePath) {
  const fileStats = await stat(absoluteFilePath);
  return getStableLastmodIso(absoluteFilePath, fileStats.mtime.toISOString());
}

async function pathExists(absoluteFilePath) {
  try {
    await stat(absoluteFilePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveGalleryDataFile(galleryHref) {
  const normalizedHref = String(galleryHref || '').replace(/^\/+/, '');
  const basePath = path.resolve(__dirname, '..', 'src', 'data', normalizedHref);
  const lastSegment = normalizedHref.split('/').filter(Boolean).pop();
  const candidates = [
    `${basePath}.mjs`,
    path.join(basePath, 'Gallery.mjs'),
    lastSegment ? path.join(basePath, `${lastSegment}.mjs`) : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }

  return null;
}

// Paths to exclude from sitemap (for static pages)
const EXCLUDE_PATTERNS = [
  /^\/api\//,
  /^\/admin\//,
  /^\/_/,           // Internal Astro files
  /\/\[.*\]/,       // Dynamic routes with brackets (we handle these separately)
  /\.xml$/,         // XML endpoints like sitemap.xml
  /\.json$/,        // JSON endpoints
  /\.js$/,          // JS endpoints
  /^\/404/,
  /^\/500/,
  /^\/Galleries\/lightbox(?:\/|$)/i,
  /^\/Other\/Print-Options\/?$/i,
  /^\/Other\/Stories\/?$/i,
  /^\/Other\/Stories(?:\/|$)/i,
  // Exclude test/draft pages
  /\/Builder-Test/i,
  /\/Test-Show/i,
  /\/Test-show/i,
  /\/demo-show/i,
  /\/Template\//i,
  /^\/Other\/Historical-Reenactment-Photography\/?$/,
  /^\/Galleries\/Painterly-Fine-Art-Photography\/Facing-History\/Western-Cowboy-Portraits\/NA-Color(?:\/|$)/,
  /^\/Galleries\/Painterly-Fine-Art-Photography\/Facing-History\/Western-Cowboy-Portraits\/NA-Black-White(?:\/|$)/,
  /^\/Galleries\/Fine-Art-Photography\/Transportation\/Trains-Black-White(?:\/|$)/,
  /backup$/i,
  /copy$/i,
];

// Priority rules based on path depth and type
function getPriority(urlPath) {
  if (urlPath === '/') return 1.0;
  
  // ✅ HIGH PRIORITY: Definition articles (authority/topical pages)
  if (urlPath.startsWith('/Blog/what-is-')) return 0.9;
  
  // ✅ HIGH PRIORITY: Subject hub pages
  if (urlPath === '/Western-Fine-Art-Photography') return 0.9;
  if (urlPath === '/Cowboy-Fine-Art-Photography') return 0.9;
  if (urlPath === '/Painterly-Western-Photography') return 0.9;
  if (urlPath === '/wayne-heim-western-fine-art-photography') return 0.9;
  
  if (urlPath === '/Other/One-Image-Movie') return 0.9;
  if (urlPath === '/Other/Show') return 0.9;
  if (urlPath.startsWith('/Galleries/Painterly-Fine-Art-Photography')) return 0.8;
  if (urlPath.startsWith('/Other/Show/')) return 0.7;
  if (urlPath.startsWith('/Galleries/')) return 0.6;
  if (urlPath.startsWith('/Other/')) return 0.6;
  
  const depth = urlPath.split('/').filter(Boolean).length;
  if (depth === 1) return 0.8;
  if (depth === 2) return 0.7;
  if (depth === 3) return 0.6;
  return 0.5;
}

// Change frequency hints based on content type
function getChangeFreq(urlPath) {
  if (urlPath === '/') return 'weekly';
  if (urlPath === '/Other/Show') return 'weekly';
  if (urlPath.startsWith('/Other/Show/')) return 'monthly';
  if (urlPath === '/Other/One-Image-Movie') return 'monthly';
  if (urlPath.startsWith('/Galleries/')) return 'monthly';
  if (urlPath === '/Contact') return 'yearly';
  return 'monthly';
}

async function walkDir(dir, baseDir = dir) {
  const entries = [];
  const items = await readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      // Recurse into subdirectories
      const subEntries = await walkDir(fullPath, baseDir);
      entries.push(...subEntries);
    } else if (item.isFile() && item.name.endsWith('.astro')) {
      // Convert file path to URL path
      let relativePath = path.relative(baseDir, fullPath);
      
      // Convert backslashes to forward slashes (Windows)
      relativePath = relativePath.replace(/\\/g, '/');
      
      // Remove .astro extension
      relativePath = relativePath.replace(/\.astro$/, '');
      
      // Handle index files
      if (relativePath.endsWith('/index')) {
        relativePath = relativePath.slice(0, -6); // Remove '/index'
      } else if (relativePath === 'index') {
        relativePath = '';
      }
      
      // Build URL path
      const urlPath = '/' + relativePath;
      
      // Check exclusions
      const shouldExclude = EXCLUDE_PATTERNS.some(pattern => pattern.test(urlPath));
      if (shouldExclude) continue;
      
      // Get file stats for lastmod
      const stats = await stat(fullPath);
      const lastmod = getStableLastmodIso(fullPath, stats.mtime.toISOString());
      
      entries.push({
        loc: SITE_URL + urlPath,
        lastmod,
        changefreq: getChangeFreq(urlPath),
        priority: getPriority(urlPath),
      });
    }
  }
  
  return entries;
}

// Build dynamic image pages from MasterGalleryData.
// MasterGalleryData keys are canonical gallery hrefs sourced from siteNav.
async function loadDynamicRoutes() {
  const entries = [];

  try {
    console.log('Loading dynamic routes from MasterGalleryData (siteNav-keyed)...');
    const masterStats = await stat(MASTER_GALLERY_DATA_FILE);
    const masterLastmod = getStableLastmodIso(MASTER_GALLERY_DATA_FILE, masterStats.mtime.toISOString());

    const masterMod = await import(pathToFileURL(MASTER_GALLERY_DATA_FILE).href);
    const galleryDataMap = masterMod?.galleryDataMap;

    if (!galleryDataMap || typeof galleryDataMap !== 'object') {
      console.warn('  Warning: galleryDataMap missing in MasterGalleryData.mjs');
      return entries;
    }

    for (const [rawHref, images] of Object.entries(galleryDataMap)) {
      const href = String(rawHref || '').trim();
      if (!href.startsWith('/')) continue;
      if (!Array.isArray(images) || images.length === 0) continue;

      const imageIds = Array.from(
        new Set(
          images
            .filter((img) => img && typeof img.id === 'string')
            .filter((img) => !isGhostImageId(img.id))
            .filter((img) => !isHiddenImage(img))
            .map((img) => String(img.id).trim())
            .filter((id) => IMAGE_ID_REGEX.test(id))
        )
      );

      if (imageIds.length === 0) continue;

      for (const imageId of imageIds) {
        const urlPath = `${href}/${imageId}`;
        entries.push({
          loc: SITE_URL + urlPath,
          lastmod: masterLastmod,
          changefreq: 'monthly',
          priority: getPriority(href),
        });
      }
    }

    console.log(`Generated ${entries.length} dynamic route entries from MasterGalleryData`);
  } catch (err) {
    console.error('Error loading dynamic routes:', err.message);
    console.error(err.stack);
  }

  return entries;
}

async function loadActiveDoorwayRoutes() {
  const entries = [];

  try {
    const source = await readFile(DOORWAY_REGISTRY_FILE, 'utf8');
    const fileStats = await stat(DOORWAY_REGISTRY_FILE);
    const lastmod = getStableLastmodIso(DOORWAY_REGISTRY_FILE, fileStats.mtime.toISOString());

    // Match entries where `active: true` and capture the corresponding slug.
    const activeSlugRegex = /active:\s*true[\s\S]{0,160}?slug:\s*['\"]([^'\"]+)['\"]/g;
    const slugs = new Set();
    let match;

    while ((match = activeSlugRegex.exec(source)) !== null) {
      const slug = String(match[1] || '').trim();
      if (slug) slugs.add(slug);
    }

    for (const slug of slugs) {
      const urlPath = `/${slug}`;
      entries.push({
        loc: SITE_URL + urlPath,
        lastmod,
        changefreq: 'monthly',
        priority: getPriority(urlPath),
      });
    }

    console.log(`Generated ${entries.length} active doorway route entries`);
  } catch (err) {
    console.error('Error loading active doorway routes:', err.message);
    console.error(err.stack);
  }

  return entries;
}

async function loadVideoDetailRoutes() {
  const entries = [];

  try {
    const source = await readFile(VIDEO_REGISTRY_FILE, 'utf8');
    const fileStats = await stat(VIDEO_REGISTRY_FILE);
    const lastmod = getStableLastmodIso(VIDEO_REGISTRY_FILE, fileStats.mtime.toISOString());

    const dedicatedVideoRegex = /\{\s*slug:\s*['"]([^'"]+)['"][\s\S]*?hasDedicatedPage:\s*true[\s\S]*?\}/g;
    const slugs = new Set();
    let match;

    while ((match = dedicatedVideoRegex.exec(source)) !== null) {
      const slug = String(match[1] || '').trim();
      if (slug) slugs.add(slug);
    }

    for (const slug of slugs) {
      const urlPath = `/Videos/${slug}`;
      entries.push({
        loc: SITE_URL + urlPath,
        lastmod,
        changefreq: 'monthly',
        priority: getPriority(urlPath),
      });
    }

    console.log(`Generated ${entries.length} video detail route entries`);
  } catch (err) {
    console.error('Error loading video detail routes:', err.message);
    console.error(err.stack);
  }

  return entries;
}

async function loadDynamicAllCollectionRoutes() {
  const entries = [];

  try {
    const routeStats = await stat(DYNAMIC_ALL_ROUTE_FILE);
    const routeLastmod = getStableLastmodIso(DYNAMIC_ALL_ROUTE_FILE, routeStats.mtime.toISOString());
    const siteNavMod = await import(pathToFileURL(SITE_NAV_FILE).href);
    const navTree = siteNavMod?.siteNav;

    if (!Array.isArray(navTree)) {
      console.warn('  Warning: siteNav missing in siteNav.js');
      return entries;
    }

    function extractGallerySources(items) {
      const results = [];
      for (const item of items || []) {
        if (item?.type === 'gallery-source' && typeof item.href === 'string') {
          results.push(item.href);
        }
        if (Array.isArray(item?.children) && item.children.length) {
          results.push(...extractGallerySources(item.children));
        }
      }
      return results;
    }

    const galleryHrefs = Array.from(new Set(extractGallerySources(navTree)));

    for (const href of galleryHrefs) {
      const normalizedHref = String(href || '').trim();
      if (!normalizedHref.startsWith('/')) continue;

      let lastmod = routeLastmod;

      try {
        const dataFilePath = await resolveGalleryDataFile(normalizedHref);
        if (dataFilePath) {
          lastmod = await getFileLastmodIso(dataFilePath) || routeLastmod;
        }
      } catch {
        lastmod = routeLastmod;
      }

      const urlPath = `${normalizedHref}/all`;
      entries.push({
        loc: SITE_URL + urlPath,
        lastmod,
        changefreq: 'monthly',
        priority: Math.max(0.5, getPriority(normalizedHref) - 0.1),
      });
    }

    console.log(`Generated ${entries.length} dynamic /all collection route entries`);
  } catch (err) {
    console.error('Error loading dynamic /all collection routes:', err.message);
    console.error(err.stack);
  }

  return entries;
}

async function main() {
  console.log('Scanning pages directory:', PAGES_DIR);
  
  // Get static page entries
  let staticEntries = await walkDir(PAGES_DIR);
  console.log(`Found ${staticEntries.length} static page entries`);
  
  // Get dynamic route entries from MasterGalleryData
  const dynamicEntries = await loadDynamicRoutes();

  // Get dynamic /all collection pages from siteNav gallery-source entries
  const dynamicAllEntries = await loadDynamicAllCollectionRoutes();

  // Get active doorway pages from the doorway registry
  const doorwayEntries = await loadActiveDoorwayRoutes();

  // Get dedicated video detail pages from the video registry
  const videoEntries = await loadVideoDetailRoutes();
  
  // Combine and deduplicate
  const allEntries = [...staticEntries, ...dynamicEntries, ...dynamicAllEntries, ...doorwayEntries, ...videoEntries];
  const dedupedEntries = Array.from(new Map(allEntries.map((entry) => [entry.loc, entry])).values());
  
  // Sort for stable output (by URL)
  dedupedEntries.sort((a, b) => a.loc.localeCompare(b.loc));
  
  const outDir = path.resolve(__dirname, '..', 'src', 'data');
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'sitemap.ts');

  const timestamp = new Date().toISOString();
  const content = `// AUTO-GENERATED FILE. Do not edit manually.
// Generated by scripts/generate-sitemap-data.mjs at ${timestamp}
// Scanned from local src/pages directory + MasterGalleryData dynamic routes

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
};

export const sitemap: SitemapEntry[] = ${JSON.stringify(dedupedEntries, null, 2)};
`;

  await writeFile(outFile, content, 'utf8');
  console.log(`Wrote ${dedupedEntries.length} entries to ${path.relative(path.resolve(__dirname, '..'), outFile)}`);
  console.log(`  - ${staticEntries.length} static pages`);
  console.log(`  - ${dynamicEntries.length} dynamic gallery pages`);
  console.log(`  - ${dynamicAllEntries.length} dynamic collection pages`);
  console.log(`  - ${doorwayEntries.length} active doorway pages`);
  console.log(`  - ${videoEntries.length} video detail pages`);

  // Also emit a static public/sitemap.xml so `/sitemap.xml` works even when deploying
  // prebuilt artifacts without SSR/function bundles.
  const xmlEscape = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const BLOG_PATH_RE = /^https?:\/\/www\.k4studios\.com\/Blog(?:$|\/)/i;
  const IMAGE_DETAIL_PATH_RE = /\/i-[A-Za-z0-9]+$/;
  const standardEntries = dedupedEntries.filter((entry) => {
    const loc = String(entry.loc || '');
    return !BLOG_PATH_RE.test(loc) && !IMAGE_DETAIL_PATH_RE.test(loc);
  });

  const urlsXml = standardEntries.map((entry) => {
    const loc = `<loc>${xmlEscape(entry.loc)}</loc>`;
    const lastmod = entry.lastmod ? `<lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : '';
    const changefreq = entry.changefreq ? `<changefreq>${xmlEscape(entry.changefreq)}</changefreq>` : '';
    const priority = typeof entry.priority === 'number' ? `<priority>${entry.priority.toFixed(1)}</priority>` : '';
    return `  <url>\n    ${loc}\n    ${lastmod}\n    ${changefreq}\n    ${priority}\n  </url>`
      .replace(/\n\s*\n/g, '\n');
  }).join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlsXml}\n</urlset>\n`;

  const publicDir = path.resolve(__dirname, '..', 'public');
  await mkdir(publicDir, { recursive: true });
  const publicSitemapPath = path.join(publicDir, 'sitemap.xml');
  await writeFile(publicSitemapPath, sitemapXml, 'utf8');
  console.log(`Wrote static sitemap XML to ${path.relative(path.resolve(__dirname, '..'), publicSitemapPath)}`);

  // ── Blog sitemap ──────────────────────────────────────────────────────
  const blogEntries = dedupedEntries.filter((e) => BLOG_PATH_RE.test(String(e.loc || '')));

  const blogUrlsXml = blogEntries.map((entry) => {
    const loc = `<loc>${xmlEscape(entry.loc)}</loc>`;
    const lastmod = entry.lastmod ? `<lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : '';
    const changefreq = entry.changefreq ? `<changefreq>${xmlEscape(entry.changefreq)}</changefreq>` : '';
    const priority = typeof entry.priority === 'number' ? `<priority>${entry.priority.toFixed(1)}</priority>` : '';
    return `  <url>\n    ${loc}\n    ${lastmod}\n    ${changefreq}\n    ${priority}\n  </url>`
      .replace(/\n\s*\n/g, '\n');
  }).join('\n');

  const blogSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${blogUrlsXml}\n</urlset>\n`;

  const blogSitemapPath = path.join(publicDir, 'blog-sitemap.xml');
  await writeFile(blogSitemapPath, blogSitemapXml, 'utf8');
  console.log(`Wrote static blog sitemap XML (${blogEntries.length} entries) to ${path.relative(path.resolve(__dirname, '..'), blogSitemapPath)}`);

  // ── Master sitemap index ──────────────────────────────────────────────
  // Enumerate all image-sitemap-*.xml files in public/ (exclude the index itself)
  const childSitemaps = [
    'sitemap.xml',
    'blog-sitemap.xml',
    'image-sitemap-index.xml',
  ];

  const sitemapIndexEntries = [];
  for (const file of childSitemaps) {
    const childPath = path.join(publicDir, file);
    let childLastmod = timestamp;
    try {
      childLastmod = (await stat(childPath)).mtime.toISOString();
    } catch {
      childLastmod = timestamp;
    }

    sitemapIndexEntries.push(
      `  <sitemap>\n    <loc>${SITE_URL}/${file}</loc>\n    <lastmod>${childLastmod}</lastmod>\n  </sitemap>`
    );
  }

  const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapIndexEntries.join('\n')}\n</sitemapindex>\n`;

  const sitemapIndexPath = path.join(publicDir, 'sitemap-index.xml');
  await writeFile(sitemapIndexPath, sitemapIndexXml, 'utf8');
  console.log(`Wrote master sitemap index (${childSitemaps.length} sitemaps) to ${path.relative(path.resolve(__dirname, '..'), sitemapIndexPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
