// data/galleries/WWII-Portraits/BWEntranceData.ts

// Import the full gallery data set for WWII B/W Portraits
import { galleryData } from "./Black-White.mjs";

// ======= Dynamic Featured Image Logic ======= //
// Filter out ghosts, sort by rating DESC, break ties by newest
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
  title: "WWII Portraits in Black & White – Painterly Fine Art by Wayne Heim",
  subtitle: "World War II Reenactor Portraits – Classic B&W Style",
  description:
    "Experience the faces of World War II brought to life in painterly black and white. Wayne Heim’s portrait series captures reenactors, veterans, and historical characters with timeless artistry, focusing on personal stories, expression, and the emotional weight of the era. Every image is carefully crafted to evoke both the grit and humanity of WWII, presented in rich monochrome for maximum mood and authenticity.",
  details: `
    WWII black and white portrait art, painterly fine art photography, and historical reenactment images, all focused on the personal side of wartime experience.

Archival-grade prints and UV-printed wood panel options available for collectors and designers.

Ideal for offices, libraries, museums, or anyone inspired by military history and portraiture.

Every portrait is lit and posed with a nod to classic 1940s studio photography — emphasizing detail, character, and dignity.

Contact Wayne to discuss portrait commissions, unique installations, or special exhibition requests.

These WWII black and white portraits are designed to capture not just a likeness, but a lived moment — making history visible, relatable, and profoundly human.

Keywords: WWII black and white portraits, painterly photography, historical reenactment, World War II art, military wall art, monochrome fine art prints, Wayne Heim, K4 Studios.
  `,
  image: {
    src: featured?.src || "/images/placeholder-wwii-portraits-bw.jpg",
    alt: featured?.alt || featured?.title || "Featured WWII black and white reenactor portrait",
    caption: featured?.title || "WWII B&W Portrait (featured image)",
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
  WWII</a> | Machines | B/W`
};
