// Utility to generate meta tags for individual image pages
// Usage: getImageMeta(imageId, galleryDatas, fallbackMeta)

export function getImageMeta(imageId, galleryDatas, fallbackMeta: any = {}) {
  let imageData = null;
  let parentGalleryMeta = fallbackMeta;

  for (const gallery of galleryDatas) {
    if (!gallery || !Array.isArray(gallery.images)) continue;
    const found = gallery.images.find(img => img.id === imageId);
    if (found) {
      imageData = found;
      if (gallery.meta) parentGalleryMeta = gallery.meta;
      break;
    }
  }

  if (!imageData) {
    return parentGalleryMeta;
  }

  const title =
    imageData.title ||
    parentGalleryMeta.ogTitle ||
    parentGalleryMeta.title ||
    "Wayne Heim Fine Art Photography";

  // Prefer story for social/meta tags, fallback to description, then gallery meta
  const story = (imageData.story && imageData.story.trim()) ? imageData.story.trim() : null;
  const description =
    story && story.length <= 160
      ? story
      : story
      ? story.slice(0, 157) + "…"
      : imageData.description && imageData.description.length <= 160
      ? imageData.description
      : imageData.description
      ? imageData.description.slice(0, 157) + "…"
      : parentGalleryMeta.ogDescription ||
        parentGalleryMeta.description ||
        "Painterly and fine art photography by Wayne Heim.";

  const imageUrl =
    imageData.smugmugUrl || imageData.imageUrl || parentGalleryMeta.ogImage;

  return {
    ...imageData, // ✅ keep all fields (alt, notes, keywords, etc.)
    story: story || imageData.description || description, // ✅ guarantee story exists
    ogTitle: title,
    ogDescription: description, // ✅ story preferred for social/meta
    ogImage: imageUrl,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: title,
    twitterDescription: description, // ✅ story preferred for social/meta
    twitterImage: imageUrl,
  };
}
