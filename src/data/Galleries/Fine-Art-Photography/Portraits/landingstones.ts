// Minimal local type to satisfy TS without external dependency
type ImageData = {
  id?: string;
  src?: string;
  srcS?: string;
  srcM?: string;
  srcL?: string;
  visibility?: string;
};

// ───── Load Gallery Modules ─────
// Direct .mjs files in Portraits folder (e.g., Color.mjs, Black-White.mjs)
const galleryModules = import.meta.glob(
  "/src/data/Galleries/Fine-Art-Photography/Portraits/*.mjs",
  { eager: true }
);

// Build normalized galleryMap: slug → image[]
const galleryMap: Record<string, ImageData[]> = {};

for (const [path, mod] of Object.entries(galleryModules)) {
  // Extract slug from filename (e.g., "Color" from "/Portraits/Color.mjs")
  const slug = path
    .replace(/^.*\//, "")      // remove path prefix → "Color.mjs"
    .replace(/\.mjs$/, "")     // remove extension → "Color"
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
const baseHref = "/Galleries/Fine-Art-Photography/Portraits";

const regions = [
  { title: "Color Portraits", slug: "Color" },
  { title: "Black and White Portraits", slug: "Black-White" },
  { title: "Reenactors", slug: "Reenactors" }, // ← Example: custom display title
];

// ───── Final Export ─────
export const landingWestern = {
  title: "Traditional Style Portraits",
  subtitle: "Photographs that are not merely images—but windows into worlds that exist beyond my lens.",
  description: "Photographs that are not merely images—but windows into worlds that exist beyond my lens.",
  keywords: [],
  breadcrumb: `
   <a href="/Galleries/Fine-Art-Photography"
     style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;"
     onmouseover="this.style.color='darkred'"
     onmouseout="this.style.color='#444'">Fine Art Photography</a> 
   <a href="/Galleries/Fine-Art-Photography/Portraits"
     style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;"
     onmouseover="this.style.color='#006064'"
     onmouseout="this.style.color='#444'"> | Portraits</a>
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
