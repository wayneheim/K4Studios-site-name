// data/galleries/WWII-Portraits/ColorEntranceData.ts

// Import the full gallery data set for WWII Portraits in Color
import { galleryData } from "./Color.mjs";

// ======= Dynamic Featured Image Logic ======= //
// Filter out ghosts, sort by rating DESC, break ties by newest (if available)
const previewPool = galleryData
  .filter(img => img.visibility !== "ghost" && img.id !== "i-k4studios")
  .sort((a, b) =>
    (b.rating || 0) - (a.rating || 0) ||
    (b.date || "").localeCompare(a.date || "")
  );

// Pick the best available image
const featured = previewPool[0] || {};

// ======= Entrance Data for Gallery Landing ======= //
export const entranceData = {
  title: "WWII Portraits – Painterly Color Fine Art Prints by Wayne Heim",
  subtitle: "World War II Portrait Photography in Painterly Color",
  description:
    "Discover WWII portraiture reimagined as painterly fine art. Wayne Heim’s color portraits capture the people behind the uniforms—soldiers, nurses, and civilians—each one posed with authenticity and a sense of story. These images blend meticulous reenactment with the drama and depth of classic painting, turning faces of the Greatest Generation into museum-worthy wall art.",
  details: `
WWII portrait art prints, historical color photography, and World War II reenactment portraits—brought to life in Wayne Heim’s signature painterly style.

Available as archival fine art prints and UV wood panels.

Perfect for collectors, home galleries, themed studies, offices, and history enthusiasts.

Every portrait is crafted with careful lighting, authentic costuming, and a focus on human emotion—bridging documentary truth and fine art beauty.

For custom portrait sessions, group commissions, or gallery partnerships, contact Wayne directly.

These WWII portrait photographs are designed to preserve legacy, tell a personal story, and inspire new generations of collectors.

Keywords: WWII portraits, fine art color photography, World War II art prints, reenactment portraits, military wall art, Wayne Heim, K4 Studios.
  `,
  image: {
    src: featured?.src || "/images/placeholder-wwii.jpg",
    alt: featured?.alt || featured?.title || "Featured WWII portrait in color",
    caption: featured?.title || "WWII Portrait (featured image)",
  },
    breadcrumb: `
<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History"
   style="color: inherit; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 9999; transition: color 0.2s ease;"
   onmouseover="this.style.color='red'"
   onmouseout="this.style.color='inherit'">
  Facing History</a> |
<a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII"
   style="color: inherit; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 9999; transition: color 0.2s ease;"
   onmouseover="this.style.color='olive'"
   onmouseout="this.style.color='inherit'">
  WWII</a> | <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits"
   style="color: inherit; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 9999; transition: color 0.2s ease;"
   onmouseover="this.style.color='#4aa8ff'"
   onmouseout="this.style.color='inherit'">Portraits</a> | Color`
};
