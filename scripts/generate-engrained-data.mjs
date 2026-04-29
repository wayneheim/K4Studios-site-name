/**
 * Generate a static engrainedData.json from the Engrained gallery .mjs file.
 * This mirrors the shape returned by the Netlify function (GET /.netlify/functions/engrainedData)
 * so that production can serve it as a static asset at /data/engrainedData.json.
 *
 * The Netlify function still works for admin/dev writes, but the static file
 * ensures the read path always works in production where source files aren't on disk.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGRAINED_PATH = path.join(__dirname, "..", "src", "data", "Other", "K4-Select-Series", "Engrained", "Engrained-Series.mjs");
const OUTPUT_PATH = path.join(__dirname, "..", "public", "data", "engrainedData.json");
const SMUGMUG_IMAGE_ID = /^i-[A-Za-z0-9]{7}$/;

function withPublicProxyImages(item) {
  if (!SMUGMUG_IMAGE_ID.test(item?.id || "")) {
    return item;
  }

  const imageId = item.id;
  return {
    ...item,
    src: `/img/${imageId}/l.jpg`,
    srcS: `/img/${imageId}/s.jpg`,
    srcM: `/img/${imageId}/m.jpg`,
    srcL: `/img/${imageId}/l.jpg`,
    srcXL: `/img/${imageId}/xl.jpg`,
  };
}

async function main() {
  // Dynamic import of the .mjs file
  const fileUrl = "file:///" + ENGRAINED_PATH.replace(/\\/g, "/");
  const mod = await import(fileUrl);
  const sourceItems = mod.galleryData || mod.engrainedData || [];
  const items = sourceItems.map(withPublicProxyImages);

  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ items }, null, 2), "utf8");
  console.log(`[gen:engrained-data] Wrote ${items.length} items to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
}

main().catch(err => {
  console.error("[gen:engrained-data] Error:", err);
  process.exit(1);
});
