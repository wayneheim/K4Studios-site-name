import type { ImageData } from "../types";

// ───── Load Gallery Modules ─────
const galleryModules = import.meta.glob(
  "/src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/**/Gallery.mjs",
  { eager: true }
);

// Build normalized galleryMap: href path → image[]
const galleryMap: Record<string, ImageData[]> = {};

for (const [path, mod] of Object.entries(galleryModules)) {
  const galleryPath = path
    .replace("/src/data", "") // → /Galleries/...
    .replace(/\/Gallery\.mjs$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  const images: ImageData[] = (mod as any).galleryData || [];
  const valid = images.filter((img) => img?.id && img.id !== "i-k4studios");

  galleryMap[galleryPath] = valid;
}

// ───── Utility to Pull a Random Image from a Gallery ─────
function getRandomImage(galleryHref: string): string {
  const key = galleryHref.replace(/\/+$/, "").toLowerCase();
  const images = galleryMap[key];

  if (!images?.length) {
    console.warn(`🚫 No match for: ${key}`);
    return "/images/fallback.jpg";
  }

  const pick = images[Math.floor(Math.random() * images.length)];
  return pick?.src || "/images/fallback.jpg";
}

// ───── Config: What to Show vs. Where to Look ─────
const baseHref = "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location";

const regions = [
  { title: "International", slug: "International" },
  { title: "Midwest", slug: "Midwest" },
  { title: "Northeast", slug: "Northeast" },
  { title: "The American South", slug: "South" }, // ← Example: custom display title
  { title: "The American West", slug: "West" },   // ← Another custom title
];

// ───── Final Export ─────
export const landingWestern = {
  title: "Painterly Landscapes By Location",
  subtitle: "Photographs that are not merely images—but windows into worlds that exist beyond my lens.",
  breadcrumb: `<a href="/Galleries/Painterly-Fine-Art-Photography" style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;" onmouseover="this.style.color='darkred'" onmouseout="this.style.color='#444'">Painterly Photography</a> 
    <a href="/Galleries/Painterly-Fine-Art-Photography/Landscapes" style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;" onmouseover="this.style.color='#006064'" onmouseout="this.style.color='#444'"> | Landscapes</a> | By Location`,

tombstones: regions.map(({ title, slug }) => {
  const dataPath = `${baseHref}/${slug}`;        // used for galleryMap lookup
  const href = `${dataPath}/Gallery`;            // actual link

  return {
    title,
    href,
    thumb: getRandomImage(dataPath),
  };
}),
};
