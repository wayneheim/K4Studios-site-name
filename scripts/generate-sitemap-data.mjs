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
const SRC_DIR = path.resolve(__dirname, '..', 'src');
const REPO_ROOT = path.resolve(__dirname, '..');

const GHOST_IMAGE_ID = 'i-k4studios';
const IMAGE_ID_REGEX = /^i-[A-Za-z0-9]+$/;

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

function getStableLastmodIso(absoluteFilePath, fallbackMtimeIso) {
  return getGitLastModifiedIso(absoluteFilePath) || fallbackMtimeIso;
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
  // Exclude test/draft pages
  /\/Builder-Test/i,
  /\/Test-Show/i,
  /\/Test-show/i,
  /\/demo-show/i,
  /\/Template\//i,
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
  if (urlPath === '/Other/Stories') return 0.9;
  if (urlPath.startsWith('/Galleries/Painterly-Fine-Art-Photography')) return 0.8;
  if (urlPath.startsWith('/Other/Stories/')) return 0.7;
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
  if (urlPath === '/Other/Stories') return 'weekly';
  if (urlPath.startsWith('/Other/Stories/')) return 'monthly';
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

// Find all [id].astro dynamic route files
async function findDynamicRouteFiles(dir, baseDir = dir) {
  const files = [];
  const items = await readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      const subFiles = await findDynamicRouteFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (item.isFile() && item.name === '[id].astro') {
      const relativePath = path.relative(baseDir, path.dirname(fullPath));
      files.push({ fullPath, relativePath });
    }
  }
  
  return files;
}

// Parse a [id].astro file to find the imported galleryData .mjs file
function parseGalleryDataImport(astroContent, astroFilePath) {
  // Look for: import { galleryData } from '...something.mjs'
  const importRegex = /import\s*\{\s*galleryData\s*\}\s*from\s*['"]([^'"]+\.mjs)['"]/;
  const match = astroContent.match(importRegex);
  
  if (!match) return null;
  
  let importPath = match[1];
  
  // Resolve relative paths or aliases
  if (importPath.startsWith('@/')) {
    // @/ alias points to src/
    importPath = path.resolve(SRC_DIR, importPath.slice(2));
  } else if (importPath.startsWith('@data/')) {
    // @data/ alias points to src/data/
    importPath = path.resolve(SRC_DIR, 'data', importPath.slice(6));
  } else if (importPath.startsWith('../') || importPath.startsWith('./')) {
    // Relative path from the astro file's directory
    importPath = path.resolve(path.dirname(astroFilePath), importPath);
  } else {
    // Could be other alias patterns - log warning
    console.warn(`  Unknown import path format: ${importPath}`);
    return null;
  }
  
  return importPath;
}

// Scan [id].astro files and their connected .mjs data files to extract image IDs
async function loadDynamicRoutes() {
  const entries = [];
  
  try {
    console.log('Finding [id].astro dynamic route files...');
    const dynamicRouteFiles = await findDynamicRouteFiles(PAGES_DIR);
    console.log(`Found ${dynamicRouteFiles.length} dynamic route files`);
    
    for (const { fullPath, relativePath } of dynamicRouteFiles) {
      const astroContent = await readFile(fullPath, 'utf8');
      const astroStats = await stat(fullPath);
      const astroLastmodIso = getStableLastmodIso(fullPath, astroStats.mtime.toISOString());
      
      // Parse the import to find the .mjs data file
      const dataFilePath = parseGalleryDataImport(astroContent, fullPath);
      
      if (!dataFilePath) {
        console.log(`  Skipping ${relativePath}/[id].astro - no galleryData import found`);
        continue;
      }
      
      // Check if the data file exists
      let dataStats;
      try {
        dataStats = await stat(dataFilePath);
      } catch {
        console.warn(`  Warning: Data file not found: ${dataFilePath}`);
        continue;
      }
      const dataLastmodIso = getStableLastmodIso(dataFilePath, dataStats.mtime.toISOString());

      // Load the data module and extract only *visible* image IDs.
      // Regex-scraping IDs is dangerous (it picks up non-image IDs and hidden/ghost placeholders).
      let galleryData;
      try {
        const mod = await import(pathToFileURL(dataFilePath).href);
        galleryData = mod?.galleryData;
      } catch (err) {
        console.warn(`  Warning: Failed to import galleryData from: ${dataFilePath}`);
        console.warn(`           ${err?.message || err}`);
        continue;
      }

      if (!Array.isArray(galleryData)) {
        console.warn(`  Warning: galleryData is not an array in: ${dataFilePath}`);
        continue;
      }

      const imageIds = Array.from(
        new Set(
          galleryData
            .filter((img) => img && typeof img.id === 'string')
            .filter((img) => img.id !== GHOST_IMAGE_ID)
            .filter((img) => img.visibility !== 'hidden' && img.visibility !== 'hide' && img.visibility !== 'ghost')
            .map((img) => img.id)
            .filter((id) => IMAGE_ID_REGEX.test(id))
        )
      );

      if (imageIds.length === 0) {
        console.log(`  Skipping ${relativePath} - no visible image IDs found in data file`);
        continue;
      }
      
      // Convert the relative path to a URL path
      // e.g., "Galleries/Fine-Art-Photography/Architecture/Gallery" 
      //    -> "/Galleries/Fine-Art-Photography/Architecture/Gallery"
      const urlBase = '/' + relativePath.replace(/\\/g, '/');
      
      console.log(`  ${relativePath}: ${imageIds.length} images`);
      
      // Create sitemap entries for each image
      const astroMs = Date.parse(astroLastmodIso) || astroStats.mtimeMs;
      const dataMs = Date.parse(dataLastmodIso) || dataStats.mtimeMs;
      const lastmod = new Date(Math.max(astroMs, dataMs)).toISOString();
      for (const imageId of imageIds) {
        const urlPath = `${urlBase}/${imageId}`;
        entries.push({
          loc: SITE_URL + urlPath,
          lastmod,
          changefreq: 'monthly',
          priority: getPriority(urlBase),
        });
      }
    }
    
    console.log(`Generated ${entries.length} dynamic route entries from connected data files`);
    
  } catch (err) {
    console.error('Error loading dynamic routes:', err.message);
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
  
  // Combine and deduplicate
  const allEntries = [...staticEntries, ...dynamicEntries];
  
  // Sort for stable output (by URL)
  allEntries.sort((a, b) => a.loc.localeCompare(b.loc));
  
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

export const sitemap: SitemapEntry[] = ${JSON.stringify(allEntries, null, 2)};
`;

  await writeFile(outFile, content, 'utf8');
  console.log(`Wrote ${allEntries.length} entries to ${path.relative(path.resolve(__dirname, '..'), outFile)}`);
  console.log(`  - ${staticEntries.length} static pages`);
  console.log(`  - ${dynamicEntries.length} dynamic gallery pages`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
