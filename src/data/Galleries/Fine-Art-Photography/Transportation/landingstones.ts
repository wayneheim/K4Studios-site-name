import type { ImageData } from "../types";

// ───── Load Gallery Modules ─────
// Direct .mjs files in Transportation folder (e.g., Boats.mjs, Cars.mjs)
const galleryModules = import.meta.glob(
  "/src/data/Galleries/Fine-Art-Photography/Transportation/*.mjs",
  { eager: true }
);

// Build normalized galleryMap: slug → image[]
const galleryMap: Record<string, ImageData[]> = {};

for (const [path, mod] of Object.entries(galleryModules)) {
  // Extract slug from filename (e.g., "Boats" from "/Transportation/Boats.mjs")
  const slug = path
    .replace(/^.*\//, "")      // remove path prefix → "Boats.mjs"
    .replace(/\.mjs$/, "")     // remove extension → "Boats"
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
const baseHref = "/Galleries/Fine-Art-Photography/Transportation";

const regions = [
  { title: "Boats", slug: "Boats" },
  { title: "Cars", slug: "Cars" },
  { title: "Military", slug: "Military" },
  { title: "Planes", slug: "Planes" }, 
  { title: "Trains", slug: "Trains" }, // ← Example: custom display title
];

// ───── Final Export ─────
export const landingWestern = {
  title: "Traditional Style Transportation Photography",
  subtitle: "From steam to steel, from tracks to highways — stories that move us.",
  breadcrumb: `
    <a href="/Galleries/Fine-Art-Photography"
       style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;"
       onmouseover="this.style.color='darkred'"
       onmouseout="this.style.color='#444'">Fine Art Photography</a> 
    <a href="/Galleries/Fine-Art-Photography/Transportation"
       style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;"
       onmouseover="this.style.color='#2c3e50'"
       onmouseout="this.style.color='#444'"> | Transportation</a>
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
