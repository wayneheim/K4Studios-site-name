// Stories index data for K4 Studios Picture Show Stories
import { storyMeta as westernLivingHistoryMeta, storyData as westernLivingHistoryData } from "./Western-Living-History.mjs";
import { storyMeta as demoShowMeta, storyData as demoShowData } from "./DemoShow.mjs";

// Helper function to get the first non-ghost slide's thumbnail image
function getFirstSlideThumbnail(storyData) {
  const firstNonGhostSlide = storyData.find(slide => slide.visibility !== "ghost");
  if (firstNonGhostSlide) {
    // Prefer srcS (small), fall back to srcM, then src, then srcL
    return firstNonGhostSlide.srcS || firstNonGhostSlide.srcM || firstNonGhostSlide.src || firstNonGhostSlide.srcL || "/images/K4-Stories logo1b.webp";
  }
  return "/images/K4-Stories logo1b.webp"; // fallback
}

export const stories = [
  {
    slug: "Western-Living-History",
    title: westernLivingHistoryMeta.showTitle,
    date: westernLivingHistoryMeta.savedAt ? new Date(westernLivingHistoryMeta.savedAt).toISOString().split('T')[0] : "2025-11-06",
    excerpt: westernLivingHistoryMeta.description,
    cover: getFirstSlideThumbnail(westernLivingHistoryData),
    keywords: westernLivingHistoryMeta.keywords,
    alt: westernLivingHistoryMeta.alt
  },
  {
    slug: "demo-show",
    title: demoShowMeta.showTitle || "Demo Show",
    date: demoShowMeta.savedAt ? new Date(demoShowMeta.savedAt).toISOString().split('T')[0] : "2025-11-01",
    excerpt: demoShowMeta.description || "Demo story showcasing the Picture Show format.",
    cover: getFirstSlideThumbnail(demoShowData),
    keywords: demoShowMeta.keywords || [],
    alt: demoShowMeta.alt || "Demo show"
  }
];