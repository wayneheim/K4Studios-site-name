export const essayClusterPages = {
  "/Other/Bio": {
    title: "Wayne Heim Bio",
    description: "The artist background behind K4 Studios, from Star Valley roots to medical illustration and narrative fine art photography.",
    related: ["/Other/Better-Mousetrap", "/Blog/armature-beneath-the-legend", "/Blog/paying-forward-through-story"],
  },
  "/Other/Better-Mousetrap": {
    title: "The Better Mousetrap",
    description: "The origin essay behind Wayne Heim's search for art that gives the viewer something back.",
    related: ["/Other/One-Image-Movie", "/Other/Narrative-Vacuum", "/Other/Bio"],
  },
  "/Other/One-Image-Movie": {
    title: "What Is a One-Image Movie?",
    description: "The core K4 Studios narrative-art format: image, title, authored writing, and viewer participation.",
    related: ["/Other/Better-Mousetrap", "/Other/Narrative-Vacuum", "/Blog/paying-forward-through-story"],
  },
  "/Other/Narrative-Vacuum": {
    title: "The Narrative Vacuum",
    description: "A critical framework for story, Western art, unresolved images, and viewer participation.",
    related: ["/Other/One-Image-Movie", "/Other/Better-Mousetrap", "/Blog/armature-beneath-the-legend"],
  },
  "/Blog/armature-beneath-the-legend": {
    title: "Armature Beneath the Legend",
    description: "A personal and critical look at the lives, labor, and structure beneath familiar Western legend.",
    related: ["/Other/Narrative-Vacuum", "/Blog/paying-forward-through-story", "/Other/Bio"],
  },
  "/Blog/paying-forward-through-story": {
    title: "Paying Forward Through Story",
    description: "A reflection on remembrance, listening, and how stories move through Wayne Heim's work.",
    related: ["/Blog/armature-beneath-the-legend", "/Other/Bio", "/Other/One-Image-Movie"],
  },
};

export function getEssayClusterLinks(path = "", limit = 3) {
  const normalizedPath = String(path || "").replace(/\/$/, "") || "/";
  const page = essayClusterPages[normalizedPath];
  if (!page) return [];

  return page.related
    .map((href) => {
      const relatedPage = essayClusterPages[href];
      return relatedPage ? { href, ...relatedPage } : null;
    })
    .filter(Boolean)
    .slice(0, limit);
}
