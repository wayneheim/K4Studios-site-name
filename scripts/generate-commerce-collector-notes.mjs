import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = [
  path.join(root, "src", "data", "Galleries"),
  path.join(root, "src", "data", "Other", "K4-Select-Series", "Engrained"),
];
const outputPath = path.join(root, "src", "data", "commerce", "collectorNotes.generated.json");

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(fullPath) : (entry.name.endsWith(".mjs") ? [fullPath] : []);
  });
}

function arraysIn(value) {
  if (Array.isArray(value)) return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).filter(Array.isArray);
}

const notesByImage = {};
for (const filePath of sourceRoots.flatMap(filesUnder)) {
  const module = await import(`${pathToFileURL(filePath).href}?commerce-notes=${fs.statSync(filePath).mtimeMs}`);
  for (const exported of Object.values(module)) {
    for (const items of arraysIn(exported)) {
      for (const item of items) {
        const imageId = String(item?.id || "");
        const notes = String(item?.collectorNotes ?? item?.notes ?? "").trim();
        if (/^i-[A-Za-z0-9]+$/.test(imageId) && notes && !notesByImage[imageId]) {
          notesByImage[imageId] = notes;
        }
      }
    }
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(notesByImage, null, 2)}\n`);
console.log(`[gen:commerce-collector-notes] Wrote notes for ${Object.keys(notesByImage).length} images.`);
