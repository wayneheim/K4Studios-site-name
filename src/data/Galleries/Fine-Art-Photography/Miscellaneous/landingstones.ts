import type { ImageData } from "../types";

// ───── Load Gallery Modules ─────
// Direct .mjs files in Miscellaneous folder (e.g., Pets.mjs, Wildlife.mjs)
const galleryModules = import.meta.glob(
  "/src/data/Galleries/Fine-Art-Photography/Miscellaneous/*.mjs",
  { eager: true }
);

// Build normalized galleryMap: slug → image[]
const galleryMap: Record<string, ImageData[]> = {};

for (const [path, mod] of Object.entries(galleryModules)) {
  // Extract slug from filename (e.g., "Pets" from "/Miscellaneous/Pets.mjs")
  const slug = path
    .replace(/^.*\//, "")      // remove path prefix → "Pets.mjs"
    .replace(/\.mjs$/, "")     // remove extension → "Pets"
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
const baseHref = "/Galleries/Fine-Art-Photography/Miscellaneous";

const regions = [
  { title: "Reenactments", slug: "Reenactments" },
  { title: "Pets", slug: "Pets" },
  { title: "Wildlife", slug: "Wildlife" }, // ← Example: custom display title
];

// ───── Final Export ─────
export const landingWestern = {
  title: "Miscellaneous Traditional Style Photography",
  subtitle: "Miscellaneous fine art portraits—where people, animals, and moments come alive.",
  breadcrumb: `
    <a href="/Galleries/Fine-Art-Photography"
       style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;"
       onmouseover="this.style.color='darkred'"
       onmouseout="this.style.color='#444'">Fine Art Photography</a> 
    | Miscellaneous
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
