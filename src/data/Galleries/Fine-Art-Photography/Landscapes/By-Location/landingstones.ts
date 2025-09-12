import type { ImageData } from "../types";

// ───── Load Gallery Modules ─────
const galleryModules = import.meta.glob(
  "/src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/**/Gallery.mjs",
  { eager: true }
);

// Load ALL International .mjs galleries (Iceland, Faroe-Islands, etc.)
const internationalModules = import.meta.glob(
  "/src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/International/*.mjs",
  { eager: true }
);

// ───── Build Normalized galleryMap: href path → image[] ─────
const galleryMap: Record<string, ImageData[]> = {};

for (const [path, mod] of Object.entries(galleryModules)) {
  const galleryPath = path
    .replace("/src/data", "")
    .replace(/\/Gallery\.mjs$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();

  const images: ImageData[] = (mod as any).galleryData || [];
  const valid = images.filter((img) => img?.id && img.id !== "i-k4studios");
  galleryMap[galleryPath] = valid;
}

// ───── Utility: Random Image from Array ─────
function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

// ───── Get a Random International Image ─────
function getRandomInternationalImage(): string {
  // Flatten all images from all International galleries
  let allImages: ImageData[] = [];
  for (const mod of Object.values(internationalModules)) {
    const images: ImageData[] = (mod as any).galleryData || [];
    const valid = images.filter((img) => img?.id && img.id !== "i-k4studios");
    allImages = allImages.concat(valid);
  }
  const pick = pickRandom(allImages);
  return pick?.src || "/images/fallback.jpg";
}

// ───── Get Random Image for Standard Gallery ─────
function getRandomImage(galleryHref: string): string {
  const key = galleryHref.replace(/\/+$/, "").toLowerCase();
  const images = galleryMap[key];
  const pick = pickRandom(images || []);
  return pick?.src || "/images/fallback.jpg";
}

// ───── Config: Regions & Tombstones ─────
const baseHref = "/Galleries/Fine-Art-Photography/Landscapes/By-Location";
const regions = [
  { title: "International", slug: "International" },
  { title: "Midwest", slug: "Midwest" },
  { title: "Northeast", slug: "Northeast" },
  { title: "The American South", slug: "South" },
  { title: "The American West", slug: "West" }
];

// ───── Breadcrumb (with By Location link) ─────
const breadcrumb = `
  <a href="/Galleries/Fine-Art-Photography" style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;" onmouseover="this.style.color='darkred'" onmouseout="this.style.color='#444'">Fine Art Photography</a>
  <a href="/Galleries/Fine-Art-Photography/Landscapes" style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;" onmouseover="this.style.color='#006064'" onmouseout="this.style.color='#444'"> | Landscapes</a>
  <a href="/Galleries/Fine-Art-Photography/Landscapes/By-Location" style="color: #444; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 10; transition: color 0.2s ease;" onmouseover="this.style.color='#00796b'" onmouseout="this.style.color='#444'"> | By Location</a>
`;

// ───── Build Tombstones Array ─────
const tombstones = regions.map(({ title, slug }) => {
  if (slug === "International") {
    return {
      title,
      href: `${baseHref}/International`,
      thumb: getRandomInternationalImage(),
    };
  } else {
    const dataPath = `${baseHref}/${slug}`;
    return {
      title,
      href: `${dataPath}/Gallery`,
      thumb: getRandomImage(dataPath),
    };
  }
});

// ───── Final Export ─────
export const landingWestern = {
  title: "Traditional Style Landscapes By Location",
  subtitle: "Photographs that are not merely images—but windows into worlds that exist beyond my lens.",
  breadcrumb,
  tombstones,
};
