import fs from "node:fs";
import path from "node:path";

const defaultTarget = path.join(
  process.cwd(),
  "dist",
  "Galleries",
  "Painterly-Fine-Art-Photography",
  "Facing-History",
  "Wild-West",
  "Western-Narratives",
  "Color",
  "all-2",
  "index.html",
);

const targetPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultTarget;

if (!fs.existsSync(targetPath)) {
  console.error(`ALT_AUDIT_ERROR File not found: ${targetPath}`);
  process.exit(2);
}

const html = fs.readFileSync(targetPath, "utf8");

const parseAttributes = (tag) => {
  const attrs = {};
  const attrRegex = /([^\s=\/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let match;
  while ((match = attrRegex.exec(tag))) {
    const name = String(match[1] || "").toLowerCase();
    if (!name || name === "img") continue;
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attrs[name] = value;
  }
  return attrs;
};

const normalizeAlt = (alt) => String(alt || "").replace(/\s+/g, " ").trim();

const imgRegex = /<img\b[^>]*>/gi;
const images = [];
let tagMatch;
while ((tagMatch = imgRegex.exec(html))) {
  const tag = tagMatch[0];
  const index = tagMatch.index;
  const attrs = parseAttributes(tag);
  const altExists = Object.prototype.hasOwnProperty.call(attrs, "alt");
  const alt = altExists ? normalizeAlt(attrs.alt) : null;
  const className = attrs.class || "";
  const src = attrs.src || "";
  const contextStart = Math.max(0, index - 260);
  const contextEnd = Math.min(html.length, index + tag.length + 260);
  const context = html.slice(contextStart, contextEnd);

  const isArtwork = /\bssr-card-image\b/.test(className);
  const isHero = /\bgateway-artwork\b/.test(context) || /gatewayHero/i.test(context);
  const isDock = /\bdock-card\b/.test(context) || /landingstone|tombstone/i.test(context);
  const hasAriaContext = /aria-label\s*=\s*"[^"]+"|aria-label\s*=\s*'[^']+'/.test(context);

  images.push({
    tag,
    attrs,
    altExists,
    alt,
    className,
    src,
    isArtwork,
    isHero,
    isDock,
    hasAriaContext,
  });
}

const totalImages = images.length;
const withNonEmptyAlt = images.filter((img) => img.altExists && img.alt && img.alt.length > 0);
const missingAlt = images.filter((img) => !img.altExists);
const emptyAlt = images.filter((img) => img.altExists && (!img.alt || img.alt.length === 0));
const decorativeValid = emptyAlt.filter((img) => img.hasAriaContext);
const decorativeInvalid = emptyAlt.filter((img) => !img.hasAriaContext);

const duplicateMap = new Map();
for (const img of withNonEmptyAlt) {
  const key = String(img.alt).toLowerCase();
  const arr = duplicateMap.get(key) || [];
  arr.push(img);
  duplicateMap.set(key, arr);
}
const duplicates = [...duplicateMap.entries()]
  .filter(([, arr]) => arr.length > 1)
  .map(([alt, arr]) => ({ alt, count: arr.length }));

const artworkImages = images.filter((img) => img.isArtwork);
const artworkMissingAlt = artworkImages.filter((img) => !img.altExists || !img.alt || img.alt.length === 0);
const artworkWeakAlt = artworkImages.filter((img) => {
  if (!img.alt) return false;
  const wc = img.alt.split(/\s+/).length;
  return wc < 4 || /^(image|photo|artwork)$/i.test(img.alt);
});

const heroImages = images.filter((img) => img.isHero);
const heroMissingAlt = heroImages.filter((img) => !img.altExists || !img.alt || img.alt.length === 0);

const dockImages = images.filter((img) => img.isDock);
const dockMissingAlt = dockImages.filter((img) => !img.altExists || !img.alt || img.alt.length === 0);

console.log(`ALT_AUDIT_TARGET ${targetPath}`);
console.log(`TOTAL_IMAGES ${totalImages}`);
console.log(`NON_EMPTY_ALT ${withNonEmptyAlt.length}`);
console.log(`DECORATIVE_EMPTY_VALID ${decorativeValid.length}`);
console.log(`MISSING_ALT ${missingAlt.length}`);
console.log(`DUPLICATE_ALT_TEXT ${duplicates.length}`);
console.log(`ARTWORK_IMAGES ${artworkImages.length}`);
console.log(`ARTWORK_MISSING_OR_EMPTY_ALT ${artworkMissingAlt.length}`);
console.log(`ARTWORK_WEAK_ALT_HEURISTIC ${artworkWeakAlt.length}`);
console.log(`HERO_IMAGES ${heroImages.length}`);
console.log(`HERO_MISSING_OR_EMPTY_ALT ${heroMissingAlt.length}`);
console.log(`DOCK_IMAGES ${dockImages.length}`);
console.log(`DOCK_MISSING_OR_EMPTY_ALT ${dockMissingAlt.length}`);

if (duplicates.length > 0) {
  console.log("DUPLICATE_ALT_DETAILS");
  duplicates
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)
    .forEach((row) => {
      console.log(`- ${row.count}x :: ${row.alt}`);
    });
}

if (missingAlt.length > 0 || decorativeInvalid.length > 0 || artworkMissingAlt.length > 0) {
  console.error("ALT_AUDIT_STATUS FAIL");
  process.exit(1);
}

console.log("ALT_AUDIT_STATUS PASS");