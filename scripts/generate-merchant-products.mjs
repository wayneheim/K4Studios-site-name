// Generates Merchant Center product feed and product sitemap from gallery data.
// Output:
// - public/google-merchant-feed.xml
// - public/product-sitemap.xml

import { readFileSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { galleryDataMap } from "../src/data/galleryMaps/MasterGalleryData.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = "https://www.k4studios.com";
const REPO_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "src", "data");
const PUBLIC_DIR = path.join(REPO_ROOT, "public");
const OUTPUT_FEED = path.join(PUBLIC_DIR, "google-merchant-feed.xml");
const OUTPUT_SITEMAP = path.join(PUBLIC_DIR, "product-sitemap.xml");
const K4_SEM_PATH = path.join(REPO_ROOT, "src", "data", "semantic", "K4-Sem.ts");
const IMAGE_FILENAME_SLUGS_PATH = path.join(REPO_ROOT, "src", "data", "imageFilenameSlugs.json");

const GHOST_IMAGE_ID = "i-k4studios";
const BACKUP_PATTERN = /[-_\s](copy|bak|backup|old)(\d*|[-_\s].*)?\.mjs$/i;
const EXCLUDED_FILES = new Set(["MasterGalleryData.mjs"]);
const ARCHIVE_DATA_DIRS = new Set([
  path.join(DATA_DIR, "Other", "Photo-Shoots").toLowerCase(),
]);
const HIDDEN_VISIBILITY = new Set(["hidden", "hide", "ghost", "non", "none"]);
const GOOGLE_PRODUCT_CATEGORY = "Arts & Entertainment > Hobbies & Creative Arts > Artwork";
const SKETCH_SERIES_PRICE_USD = "25.00 USD";
const SKETCH_SERIES_SIZE = "5 x 7 in";
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_TITLE_LENGTH = 150;

function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanText(value = "") {
  return String(value || "")
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/\u00a9/g, "(c)")
    .replace(/\s+/g, " ")
    .trim();
}

function trimAtWord(value = "", maxLength = 160) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength + 1);
  const boundary = slice.lastIndexOf(" ");
  return (boundary > Math.floor(maxLength * 0.6) ? slice.slice(0, boundary) : text.slice(0, maxLength)).trim();
}

function isHiddenImage(image) {
  const visibility = String(image?.visibility ?? "show").trim().toLowerCase();
  if (HIDDEN_VISIBILITY.has(visibility)) return true;
  if (String(image?.id || "").trim().toLowerCase() === GHOST_IMAGE_ID) return true;
  if (image?.hidden === true) return true;
  if (image?.show === false) return true;
  return false;
}

function slugifyImageSegment(value, fallback = "image") {
  const slug = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || fallback;
}

function loadJson(filePath, fallback = {}) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function extractImageSlugPhraseByPath(source) {
  const map = {};
  const entryPattern = /path:\s*"([^"]+)"\s*,\s*imageSlugPhrase:\s*"([^"]+)"/g;
  for (const match of source.matchAll(entryPattern)) {
    map[match[1].replace(/\/+$/, "")] = match[2];
  }
  return map;
}

function loadImageSlugPhraseByPath() {
  try {
    return extractImageSlugPhraseByPath(readFileSync(K4_SEM_PATH, "utf8"));
  } catch {
    return {};
  }
}

const imageFilenameSlugs = loadJson(IMAGE_FILENAME_SLUGS_PATH, {});
const imageSlugPhraseByPath = loadImageSlugPhraseByPath();
const PLACEHOLDER_IMAGE_TITLES = new Set(["untitled", "untitled photo", "untitled image", "image", "photo"]);
const PLACEHOLDER_IMAGE_SLUGS = new Set(["untitled", "untitled-photo", "untitled-image", "image", "photo"]);

function getFallbackPhraseFromGalleryPath(galleryPath) {
  const parts = String(galleryPath || "").replace(/\/+$/, "").split("/").filter(Boolean);
  const meaningfulPart = [...parts]
    .reverse()
    .find((part) => !/^(gallery|color|black-white|na-color|na-black-white)$/i.test(part));
  return meaningfulPart
    ? slugifyImageSegment(meaningfulPart, "k4-fine-art-photography")
    : "k4-fine-art-photography";
}

function getSemanticImageUrl(image, galleryPath) {
  const registrySlug = imageFilenameSlugs[image?.id] || "";
  const title = cleanText(image?.title || image?.name || "");
  const titleSlugCandidate = (!registrySlug || PLACEHOLDER_IMAGE_SLUGS.has(String(registrySlug).toLowerCase()))
    && title
    && !PLACEHOLDER_IMAGE_TITLES.has(title.toLowerCase())
      ? slugifyImageSegment(title, "")
      : "";
  const titleSlug = slugifyImageSegment(
    image?.filenameSlug || titleSlugCandidate || registrySlug,
    String(image?.id || "").replace(/^i-/i, "") || "image"
  );
  const normalizedPath = String(galleryPath || "").replace(/\/+$/, "");
  const phrase = slugifyImageSegment(
    imageSlugPhraseByPath[normalizedPath] || getFallbackPhraseFromGalleryPath(normalizedPath),
    "k4-fine-art-photography"
  );
  return `${SITE_URL}/img/${image.id}/${titleSlug}-${phrase}.jpg`;
}

function getMerchantImageUrl(image) {
  return `${SITE_URL}/img/${image.id}/l.jpg`;
}

function sourceFileToGalleryPath(filePath) {
  const rel = path.relative(DATA_DIR, filePath).replace(/\\/g, "/").replace(/\.mjs$/i, "");
  const parts = rel.split("/").filter(Boolean);
  if (parts.at(-1)?.toLowerCase() === "gallery") parts.pop();
  let galleryPath = `/${parts.join("/")}`;
  if (/^\/K4-Select-Series\//i.test(galleryPath)) galleryPath = `/Other${galleryPath}`;
  return galleryPath;
}

async function findGalleryDataFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const normalizedDir = fullPath.toLowerCase();
      if (!["node_modules", "backups", ".git"].includes(entry.name) && !ARCHIVE_DATA_DIRS.has(normalizedDir)) {
        await findGalleryDataFiles(fullPath, files);
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".mjs")) continue;
    if (EXCLUDED_FILES.has(entry.name)) continue;
    if (BACKUP_PATTERN.test(entry.name)) continue;
    files.push(fullPath);
  }

  return files;
}

function buildCanonicalRoutes() {
  const routes = new Map();
  for (const [galleryPath, images] of Object.entries(galleryDataMap || {})) {
    if (!String(galleryPath || "").startsWith("/") || !Array.isArray(images)) continue;
    for (const image of images) {
      const id = typeof image?.id === "string" ? image.id : "";
      if (!id.startsWith("i-") || id === GHOST_IMAGE_ID || isHiddenImage(image)) continue;
      if (!routes.has(id)) {
        routes.set(id, {
          galleryPath,
          link: `${SITE_URL}${galleryPath}/${id}`,
        });
      }
    }
  }
  return routes;
}

function scoreImageCopy(image, galleryPath, canonicalGalleryPath) {
  let score = 0;
  if (galleryPath === canonicalGalleryPath) score += 100;
  if (cleanText(image?.title)) score += 20;
  if (cleanText(image?.description)) score += 20;
  if (cleanText(image?.alt)) score += 10;
  if (cleanText(image?.story)) score += 5;
  return score;
}

async function loadBestImageCopy(canonicalRoutes) {
  const bestById = new Map();
  const files = await findGalleryDataFiles(DATA_DIR);

  for (const file of files) {
    const galleryPath = sourceFileToGalleryPath(file);
    let mod;
    try {
      mod = await import(pathToFileURL(file).href);
    } catch {
      continue;
    }

    const galleryData = Array.isArray(mod?.galleryData) ? mod.galleryData : [];
    for (const image of galleryData) {
      const id = typeof image?.id === "string" ? image.id : "";
      if (!canonicalRoutes.has(id)) continue;
      if (isHiddenImage(image)) continue;

      const canonical = canonicalRoutes.get(id);
      const score = scoreImageCopy(image, galleryPath, canonical.galleryPath);
      const previous = bestById.get(id);
      if (!previous || score > previous.score) {
        bestById.set(id, { image, galleryPath, score });
      }
    }
  }

  return bestById;
}

function inferProductType(galleryPath = "") {
  const cleaned = String(galleryPath || "")
    .replace(/^\/+/, "")
    .replace(/-/g, " ")
    .replace(/\//g, " > ");
  return cleaned || "Fine Art Photography";
}

function inferProductTitle(image) {
  const title = cleanText(image?.title || image?.alt || image?.id || "Fine Art Photograph");
  const withSeries = /\b(print|prints|sketch series)\b/i.test(title)
    ? title
    : `${title} - Sketch Series Fine Art Print`;
  return trimAtWord(withSeries, MAX_TITLE_LENGTH);
}

function inferProductDescription(image) {
  const description = cleanText(image?.description || image?.alt || image?.story || "");
  const base = description || `${cleanText(image?.title || "Fine art photograph")} by Wayne Heim, offered as a Sketch Series fine art print from K4 Studios.`;
  const suffix = "Sketch Series prints are open edition 5 x 7 fine art prints by Wayne Heim from K4 Studios.";
  const combined = base.toLowerCase().includes("sketch series") ? base : `${base} ${suffix}`;
  return trimAtWord(combined, MAX_DESCRIPTION_LENGTH);
}

function buildProductItem({ image, galleryPath, link }) {
  if (image?.noSketch === true) return null;

  const imageLink = getMerchantImageUrl(image);
  const title = inferProductTitle(image);
  const description = inferProductDescription(image);
  const productType = inferProductType(galleryPath);

  return {
    id: `${image.id}-sketch`,
    title,
    description,
    link,
    imageLink,
    availability: "in_stock",
    price: SKETCH_SERIES_PRICE_USD,
    condition: "new",
    brand: "K4 Studios",
    mpn: `${image.id}-sketch`,
    identifierExists: "no",
    productType,
    googleProductCategory: GOOGLE_PRODUCT_CATEGORY,
    size: SKETCH_SERIES_SIZE,
  };
}

async function writeIfChanged(filePath, content) {
  try {
    const existing = await readFile(filePath, "utf8");
    if (existing === content) return false;
  } catch {
    // File does not exist yet.
  }
  await writeFile(filePath, content, "utf8");
  return true;
}

function renderMerchantFeed(products) {
  const renderedItems = products.map((item) => `    <item>
      <g:id>${xmlEscape(item.id)}</g:id>
      <g:title>${xmlEscape(item.title)}</g:title>
      <g:description>${xmlEscape(item.description)}</g:description>
      <g:link>${xmlEscape(item.link)}</g:link>
      <g:image_link>${xmlEscape(item.imageLink)}</g:image_link>
      <g:availability>${xmlEscape(item.availability)}</g:availability>
      <g:price>${xmlEscape(item.price)}</g:price>
      <g:condition>${xmlEscape(item.condition)}</g:condition>
      <g:brand>${xmlEscape(item.brand)}</g:brand>
      <g:mpn>${xmlEscape(item.mpn)}</g:mpn>
      <g:identifier_exists>${xmlEscape(item.identifierExists)}</g:identifier_exists>
      <g:google_product_category>${xmlEscape(item.googleProductCategory)}</g:google_product_category>
      <g:product_type>${xmlEscape(item.productType)}</g:product_type>
      <g:size>${xmlEscape(item.size)}</g:size>
    </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>K4 Studios Fine Art Prints</title>
    <link>${SITE_URL}/</link>
    <description>Sketch Series fine art print products from K4 Studios by Wayne Heim.</description>
${renderedItems}
  </channel>
</rss>
`;
}

function renderProductSitemap(products) {
  const urlsXml = products.map((item) => `  <url>
    <loc>${xmlEscape(item.link)}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>
`;
}

async function main() {
  const canonicalRoutes = buildCanonicalRoutes();
  const bestCopyById = await loadBestImageCopy(canonicalRoutes);
  const products = [];

  for (const [id, canonical] of canonicalRoutes.entries()) {
    const source = bestCopyById.get(id);
    if (!source?.image) continue;
    const item = buildProductItem({
      image: source.image,
      galleryPath: canonical.galleryPath,
      link: canonical.link,
    });
    if (item) products.push(item);
  }

  products.sort((a, b) => a.link.localeCompare(b.link));
  await mkdir(PUBLIC_DIR, { recursive: true });

  const feedChanged = await writeIfChanged(OUTPUT_FEED, renderMerchantFeed(products));
  const sitemapChanged = await writeIfChanged(OUTPUT_SITEMAP, renderProductSitemap(products));
  const feedStats = await stat(OUTPUT_FEED);
  const sitemapStats = await stat(OUTPUT_SITEMAP);

  console.log(`[gen:merchant-products] Products: ${products.length}`);
  console.log(`[gen:merchant-products] ${path.relative(REPO_ROOT, OUTPUT_FEED)} ${feedChanged ? "written" : "unchanged"} (${Math.round(feedStats.size / 1024)} KB)`);
  console.log(`[gen:merchant-products] ${path.relative(REPO_ROOT, OUTPUT_SITEMAP)} ${sitemapChanged ? "written" : "unchanged"} (${Math.round(sitemapStats.size / 1024)} KB)`);
}

main().catch((error) => {
  console.error("[gen:merchant-products] Failed:", error);
  process.exitCode = 1;
});
