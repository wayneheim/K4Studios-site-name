// data/galleries/WWII-MenMachines/BWEntranceData.ts

// Import the full gallery data set for WWII Men & Machines in Black & White
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
  title: "WWII Men & Machines – Black & White Fine Art Photography by Wayne Heim",
  subtitle: "Historic World War II Machines & Crew in Black & White",
  description:
    "Explore the stark beauty of WWII military machinery and the people who shaped history. Wayne Heim’s black and white portraits capture the essence of vehicles, equipment, and crew—from tanks and jeeps to pilots and mechanics—in dramatic, painterly light. Each photograph is an homage to engineering, teamwork, and resilience during wartime.",
  details: `
WWII vehicle photography, black & white art prints, and authentic reenactment scenes focused on the machines and men of World War II.

Available as museum-quality archival prints and UV-printed wood panels.

Perfect for collectors, WWII historians, military offices, industrial interiors, or anyone drawn to timeless monochrome storytelling.

Every image features historically accurate equipment, vehicles, and period detail—crafted to highlight the artistry in both steel and spirit.

Custom commissions and special projects are welcome—contact Wayne for group portraits or unique vehicle requests.

These black and white WWII Men & Machines photographs celebrate the enduring power of innovation, leadership, and courage.

Keywords: WWII black and white art, military vehicles, tank photography, World War II crew portraits, fine art prints, reenactment wall art, Wayne Heim, K4 Studios.
  `,
  image: {
    src: featured?.src || "/images/placeholder-wwii-bw.jpg",
    alt: featured?.alt || featured?.title || "Featured WWII Men & Machines photograph in black and white",
    caption: featured?.title || "WWII Men & Machines (B/W featured image)",
  },
  breadcrumb: "WWII | Men & Machines | Black & White",
};
