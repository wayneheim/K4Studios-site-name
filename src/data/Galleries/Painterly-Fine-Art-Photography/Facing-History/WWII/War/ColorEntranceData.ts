// data/galleries/WWII-War/ColorEntranceData.ts

// Import the full gallery data set for WWII Art of War Color
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
  title: "WWII Art of War – Color Fine Art Prints by Wayne Heim",
  subtitle: "Painterly World War II Art of War Photography in Color",
  description:
    "Experience World War II through painterly color art prints by Wayne Heim. Each image from the Art of War gallery weaves authentic WWII reenactment with fine art vision, creating immersive portraits of soldiers, battlefields, and the spirit of an era. These artworks capture not only the conflict but the humanity, courage, and complexity of the Greatest Generation.",
  details: `
    WWII art prints, WWII photography, and historically accurate World War II reenactment scenes — all created in Wayne Heim's painterly style.

Archival museum-quality prints and UV wood panels.

Ideal for collectors, military history enthusiasts, museums, themed offices, or classic Americana decor.

Meticulous attention to uniforms, props, and authentic wartime settings, with painterly light and composition inspired by old masters.

Contact Wayne for custom commissions, special editions, or large-scale installations.

These WWII fine art portraits preserve the stories, emotions, and atmosphere of a pivotal moment in history — transformed into collectible wall art for a new era.

Keywords: WWII art prints, painterly WWII photography, World War II portraits, historical reenactment prints, military wall art, Wayne Heim, K4 Studios.
  `,
  image: {
    src: featured?.src || "/images/placeholder-wwii.jpg",
    alt: featured?.alt || featured?.title || "Featured WWII Art of War reenactment in color",
    caption: featured?.title || "WWII Art of War (featured image)",
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
  WWII</a> | <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War"
   style="color: inherit; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 9999; transition: color 0.2s ease;"
   onmouseover="this.style.color='#4aa8ff'"
   onmouseout="this.style.color='inherit'">War</a> | Color`};
