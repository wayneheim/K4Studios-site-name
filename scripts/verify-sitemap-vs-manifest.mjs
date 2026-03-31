import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getArg(name, fallback = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const distDir = path.resolve(getArg("dist", path.join(__dirname, "..", "dist")));
const manifestPath = getArg("manifest");
const origin = getArg("origin", "https://www.k4studios.com");
const chapterPattern = new RegExp(getArg("pattern", String.raw`\/i-[a-zA-Z0-9_-]+$`));

if (!manifestPath) {
  console.error("Missing required arg: --manifest <path-to-manifest.json>");
  process.exit(2);
}

const absManifest = path.resolve(manifestPath);

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function parseLocs(xml) {
  const locs = [];
  const re = /<loc>([\s\S]*?)<\/loc>/gi;
  let m;
  while ((m = re.exec(xml))) {
    locs.push(m[1].trim());
  }
  return locs;
}

function normalizePathUrl(inputUrl, baseOrigin) {
  const u = new URL(inputUrl, baseOrigin);
  const cleanPath = decodeURIComponent(u.pathname).replace(/\/+$/, "") || "/";
  return new URL(cleanPath, baseOrigin).toString();
}

function locToLocalFile(loc, distRoot, currentXmlFile) {
  if (/^https?:\/\//i.test(loc)) {
    const u = new URL(loc);
    return path.join(distRoot, u.pathname.replace(/^\/+/, ""));
  }
  return path.resolve(path.dirname(currentXmlFile), loc);
}

function collectSitemapUrls(distRoot) {
  const indexXml = path.join(distRoot, "sitemap-index.xml");
  const singleXml = path.join(distRoot, "sitemap.xml");

  let entryFile = null;
  if (fs.existsSync(indexXml)) entryFile = indexXml;
  else if (fs.existsSync(singleXml)) entryFile = singleXml;

  if (!entryFile) throw new Error(`No sitemap-index.xml or sitemap.xml found in: ${distRoot}`);

  const visited = new Set();
  const urlSet = new Set();

  function visit(xmlFile) {
    const real = path.resolve(xmlFile);
    if (visited.has(real)) return;
    visited.add(real);

    if (!fs.existsSync(real)) return;

    const xml = readText(real);
    const locs = parseLocs(xml);

    const isIndex = /<sitemapindex[\s>]/i.test(xml);
    if (isIndex) {
      for (const loc of locs) {
        const child = locToLocalFile(loc, distRoot, real);
        visit(child);
      }
      return;
    }

    for (const loc of locs) {
      urlSet.add(normalizePathUrl(loc, origin));
    }
  }

  visit(entryFile);
  return Array.from(urlSet);
}

function extractImageIdFromPathname(pathname) {
  const m = pathname.match(/\/(i-[a-zA-Z0-9_-]+)(?:\/|$)/i);
  return m ? m[1] : null;
}

function toChapterPathFromSmugmugUrl(smugmugUrl, imageId) {
  try {
    const u = new URL(smugmugUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    const idIdx = parts.findIndex((p) => p.toLowerCase() === imageId.toLowerCase());
    if (idIdx <= 0) return null;

    // Example SmugMug path:
    // /Galleries/.../Gallery/i-abc123/4/.../XL/file.jpg
    // chapter page path should be: /Galleries/.../Gallery/i-abc123
    const base = parts.slice(0, idIdx + 1).join("/");
    return `/${base}`;
  } catch {
    return null;
  }
}

function extractExpectedChapterUrlsFromManifest(manifestJson, baseOrigin) {
  const expectedUrls = new Set();
  const manifestIds = new Set();

  if (!manifestJson || typeof manifestJson !== "object" || Array.isArray(manifestJson)) {
    return { expectedUrls: [], manifestIds: [] };
  }

  for (const [id, sizeMap] of Object.entries(manifestJson)) {
    if (!/^i-[a-zA-Z0-9_-]+$/i.test(id)) continue;
    manifestIds.add(id);

    if (!sizeMap || typeof sizeMap !== "object") continue;
    const candidateUrls = [sizeMap.src, sizeMap.xl, sizeMap.l, sizeMap.m, sizeMap.s].filter(
      (v) => typeof v === "string" && v
    );

    for (const srcUrl of candidateUrls) {
      const chapterPath = toChapterPathFromSmugmugUrl(srcUrl, id);
      if (!chapterPath) continue;
      expectedUrls.add(normalizePathUrl(chapterPath, baseOrigin));
      break;
    }
  }

  return { expectedUrls: Array.from(expectedUrls), manifestIds: Array.from(manifestIds) };
}

function toChapterOnly(urls) {
  return urls.filter((u) => chapterPattern.test(new URL(u).pathname));
}

function diff(aList, bList) {
  const a = new Set(aList);
  const b = new Set(bList);
  const onlyA = [...a].filter((x) => !b.has(x)).sort();
  const onlyB = [...b].filter((x) => !a.has(x)).sort();
  return { onlyA, onlyB };
}

function extractChapterIds(urls) {
  const ids = [];
  for (const u of urls) {
    const pathname = new URL(u).pathname;
    const id = extractImageIdFromPathname(pathname);
    if (id) ids.push(id);
  }
  return ids;
}

function printSample(title, rows, limit = 20) {
  console.log(`\n${title} (${rows.length})`);
  rows.slice(0, limit).forEach((r) => console.log(`  - ${r}`));
  if (rows.length > limit) console.log(`  ... +${rows.length - limit} more`);
}

try {
  const sitemapUrls = collectSitemapUrls(distDir);
  const manifest = JSON.parse(readText(absManifest));

  const { expectedUrls: expectedUrlsAll, manifestIds } = extractExpectedChapterUrlsFromManifest(
    manifest,
    origin
  );

  const sitemapChapters = toChapterOnly(sitemapUrls);
  const expectedChapters = toChapterOnly(expectedUrlsAll);

  const { onlyA: missingInSitemap, onlyB: extraInSitemap } = diff(expectedChapters, sitemapChapters);
  const sitemapChapterIds = extractChapterIds(sitemapChapters);
  const { onlyA: missingIdsInSitemap, onlyB: extraIdsInSitemap } = diff(manifestIds, sitemapChapterIds);

  console.log("=== Sitemap vs Manifest (chapter/image URLs) ===");
  console.log(`Dist:      ${distDir}`);
  console.log(`Manifest:  ${absManifest}`);
  console.log(`Origin:    ${origin}`);
  console.log(`Pattern:   ${chapterPattern}`);
  console.log(`Expected chapter URLs (manifest, path-derived): ${expectedChapters.length}`);
  console.log(`Actual chapter URLs (sitemap):    ${sitemapChapters.length}`);
  console.log(`Manifest image IDs:               ${manifestIds.length}`);
  console.log(`Sitemap chapter image IDs:        ${new Set(sitemapChapterIds).size}`);

  printSample("Missing in sitemap", missingInSitemap);
  printSample("Extra in sitemap", extraInSitemap);
  printSample("Manifest IDs missing in sitemap", missingIdsInSitemap);
  printSample("Sitemap IDs not in manifest", extraIdsInSitemap);

  if (
    missingInSitemap.length ||
    extraInSitemap.length ||
    missingIdsInSitemap.length ||
    extraIdsInSitemap.length
  ) {
    console.error("\nResult: FAIL");
    process.exit(1);
  }

  console.log("\nResult: PASS");
  process.exit(0);
} catch (err) {
  console.error("Verifier error:", err.message);
  process.exit(2);
}
