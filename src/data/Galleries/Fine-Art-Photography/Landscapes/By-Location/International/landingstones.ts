import type { ImageData } from "../types";

// ───── Load Gallery Modules ─────
// Direct .mjs files in International folder (e.g., Iceland.mjs, Canada-Western.mjs)
const galleryModules = import.meta.glob(
  "/src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/*.mjs",
  { eager: true }
);

// Build normalized galleryMap: slug → image[]
const galleryMap: Record<string, ImageData[]> = {};

for (const [path, mod] of Object.entries(galleryModules)) {
  // Extract slug from filename (e.g., "Iceland" from "/International/Iceland.mjs")
  const slug = path
    .replace(/^.*\//, "")      // remove path prefix → "Iceland.mjs"
    .replace(/\.mjs$/, "")     // remove extension → "Iceland"
    .toLowerCase();

  const images: ImageData[] = (mod as any).galleryData || [];
  const valid = images.filter((img) => img?.id && img.id !== "i-k4studios");

  galleryMap[slug] = valid;
}

// ───── Utility to Pull a Random Image from a Gallery ─────
function getRandomImage(slug: string): string {
  const key = slug.toLowerCase();
  const images = galleryMap[key];

  if (!images?.length) {
    console.warn(`🚫 No match for slug: ${key}`);
    return "/images/fallback.jpg";
  }

  const pick = images[Math.floor(Math.random() * images.length)];
  return pick?.src || "/images/fallback.jpg";
}

// ───── Config: What to Show vs. Where to Look ─────
const baseHref = "/Galleries/Fine-Art-Photography/Landscapes/By-Location/International";

const regions = [
  { title: "Iceland", slug: "Iceland" },
  { title: "Canada-Western", slug: "Canada-Western" },
  { title: "The-Faroe-Islands", slug: "The-Faroe-Islands" },
  { title: "Newfoundland", slug: "Newfoundland" }, // ← Example: custom display title
];

// ───── Final Export ─────
export const landingWestern = {
  title: "Traditional Style Landscapes By International Location",
  subtitle: "Photographs that are not merely images—but windows into worlds that exist beyond my lens.",
  breadcrumb: `
    <a href="/Galleries/Fine-Art-Photography"
       style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;"
       onmouseover="this.style.color='darkred'"
       onmouseout="this.style.color='#444'">Fine Art Photography</a> 
    <a href="/Galleries/Fine-Art-Photography/Landscapes"
       style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;"
       onmouseover="this.style.color='#006064'"
       onmouseout="this.style.color='#444'"> | Landscapes</a> 
    <a href="/Galleries/Fine-Art-Photography/Landscapes/By-Location"
       style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;"
       onmouseover="this.style.color='purple'"
       onmouseout="this.style.color='#444'"> | By Location</a>
  `,

tombstones: regions.map(({ title, slug }) => {
  const href = `${baseHref}/${slug}`;           // actual link

  return {
    title,
    href,
    thumb: getRandomImage(slug),                // use slug for galleryMap lookup
  };
}),
};
