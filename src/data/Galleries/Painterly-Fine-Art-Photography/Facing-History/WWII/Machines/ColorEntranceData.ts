// data/galleries/WWII-MenMachines/ColorEntranceData.ts

// Import the full gallery data set for WWII Men & Machines in Color
import { galleryData } from "./Color.mjs";

// ======= Dynamic Featured Image Logic ======= //
// Filter out ghosts, sort by rating DESC, break ties by newest (if available)
const previewPool = galleryData
  .filter(img => !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(img.visibility ?? 'show').trim().toLowerCase()) && img.id !== "i-k4studios")
  .sort((a, b) =>
    (b.rating || 0) - (a.rating || 0) ||
    (b.date || "").localeCompare(a.date || "")
  );

// Pick the best available image
const featured = previewPool[0] || {};

// ======= Entrance Data for Gallery Landing ======= //
export const entranceData = {
  title: "WWII Men & Machines – Color Fine Art Photography by Wayne Heim",
  subtitle: "Historic World War II Machines & Crew in Vivid Color",

  keywords: [
    "Men & Machines",
    "WWII Military Equipment",
    "World War II photography",
    "Life Behind the Lines",
    "One-Image Movie",
    "WWII vehicle photography",
    "military machinery prints",
    "tanks and trucks art",
    "battle-ready machines",
    "Wayne Heim WWII photography",
    "Facing History photography",
    "WWII Mechanized Might"
  ],

  description:
    "Discover the vibrant intensity of WWII military machinery and the heroes who operated them. Wayne Heim’s color photographs bring to life the vehicles, equipment, and crew—from tanks and jeeps to pilots and mechanics—in painterly detail. Each image honors the ingenuity, bravery, and teamwork that defined wartime innovation.",
  details: `
WWII vehicle photography, color art prints, and authentic reenactment scenes showcasing the machines and men of World War II.

Available as museum-quality archival prints and UV-printed wood panels.

Perfect for collectors, WWII historians, military offices, industrial interiors, or anyone drawn to colorful historical storytelling.

Every image features historically accurate equipment, vehicles, and period detail—crafted to highlight the artistry in both steel and spirit.

Custom commissions and special projects are welcome—contact Wayne for group portraits or unique vehicle requests.

These color WWII Men & Machines photographs celebrate the enduring power of innovation, leadership, and courage.

Keywords: WWII color art, military vehicles, tank photography, World War II crew portraits, fine art prints, reenactment wall art, Wayne Heim, K4 Studios.
  `,
  image: {
    src: featured?.src || "/images/placeholder-wwii-color.jpg",
    alt: featured?.alt || featured?.title || "Featured WWII Men & Machines photograph in color",
    caption: featured?.title || "WWII Men & Machines (Color featured image)",
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
  WWII</a> | <a href="/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines"
  style="color: inherit; text-decoration: none; cursor: pointer; pointer-events: auto; position: relative; z-index: 9999; transition: color 0.2s ease;"
  onmouseover="this.style.color='#4aa8ff'"
  onmouseout="this.style.color='inherit'">Machines</a> | Color`
};
