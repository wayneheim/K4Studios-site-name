import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "public", "image-manifest.json");
const outputPath = path.join(root, "src", "data", "commerce", "smugmugFulfillmentLinks.generated.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const links = {};

for (const [imageId, entry] of Object.entries(manifest)) {
  if (!/^i-[A-Za-z0-9]+$/.test(imageId)) continue;
  const source = String(entry?.src || entry?.xl || entry?.l || "");
  if (!source) continue;

  let pathname;
  try {
    pathname = new URL(source, "https://photos.smugmug.com").pathname;
  } catch {
    continue;
  }

  const marker = `/${imageId}/`;
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 1) continue;
  const galleryPath = pathname.slice(0, markerIndex);
  if (!galleryPath.startsWith("/Galleries/") && !galleryPath.startsWith("/Other/")) continue;
  links[imageId] = `https://wayne-heim.smugmug.com${galleryPath}/${imageId}/A`;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(links, null, 2)}\n`);
console.log(`[gen:commerce-fulfillment-links] Wrote ${Object.keys(links).length} SmugMug fulfillment links.`);
