import { extractImageId } from "./imageProxy.js";

const galleryModules = import.meta.glob("../data/Galleries/**/*.mjs", { eager: true }) as Record<string, any>;
const imageAltById = new Map<string, string>();

for (const mod of Object.values(galleryModules)) {
  const galleryData = mod?.galleryData || mod?.default?.galleryData || [];
  if (!Array.isArray(galleryData)) continue;

  for (const image of galleryData) {
    const id = typeof image?.id === "string" ? image.id.trim() : "";
    if (!id || imageAltById.has(id)) continue;

    const alt = typeof image?.alt === "string" ? image.alt.trim() : "";
    const title = typeof image?.title === "string" ? image.title.trim() : "";
    const label = alt || title;
    if (label) imageAltById.set(id, label);
  }
}

export function getArtworkAltForImageSource(src: string = "", fallback: string = "K4 Studios fine art photograph") {
  const imageId = extractImageId(src);
  const resolvedAlt = imageId ? imageAltById.get(imageId) : "";
  return (resolvedAlt || fallback || "K4 Studios fine art photograph").trim();
}
