// data/galleries/WWII-War/BWEntranceData.ts

// Import the full gallery data set for WWII
import { galleryData } from "./Black-White.mjs";

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
  title: "WWII Art of War – Black & White Fine Art Photography by Wayne Heim",
  subtitle: "Painterly World War II Black & White Art of War Portraits",
  description:
    "Discover the stark drama of World War II in black and white through Wayne Heim’s painterly lens. Each image in the Art of War gallery is a study in contrast and mood, capturing the faces, resolve, and atmosphere of WWII reenactment with classic, cinematic artistry. The absence of color intensifies the emotion and brings history’s details to life in timeless monochrome.",
  details: `
    WWII black and white art prints, fine art WWII photography, and evocative World War II reenactment scenes — all realized in Wayne Heim's distinctive painterly style.

Museum-quality archival prints and UV wood panel options available.

Perfect for collectors, history buffs, period interior design, and those who appreciate vintage photographic technique.

Careful attention to historical uniforms, era-appropriate settings, and the interplay of shadow and light, inspired by film noir and photojournalism.

Contact Wayne for custom black and white commissions, exhibition prints, or unique wall art projects.

These World War II portraits distill courage and memory into black and white artistry — offering striking visual storytelling for homes, galleries, or offices.

Keywords: WWII black and white art, monochrome World War II photography, painterly reenactment prints, vintage military portraits, historical wall art, Wayne Heim, K4 Studios.
  `,
  image: {
    src: featured?.src || "/images/placeholder-wwii-bw.jpg",
    alt: featured?.alt || featured?.title || "Featured WWII Art of War reenactment in black and white",
    caption: featured?.title || "WWII Art of War (B&W featured image)",
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
   onmouseout="this.style.color='inherit'">War</a> | B/W`
};
