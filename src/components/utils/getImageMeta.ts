// Utility to generate meta tags for individual image pages
// Usage: getImageMeta(imageId, galleryDatas, fallbackMeta)

export function getImageMeta(imageId, galleryDatas, fallbackMeta: any = {}) {
  // Search all galleryDatas for the image
  let imageData = null;
  let parentGalleryMeta = fallbackMeta;

  for (const gallery of galleryDatas) {
    if (!gallery || !Array.isArray(gallery.images)) continue;
    const found = gallery.images.find(img => img.id === imageId);
    if (found) {
      imageData = found;
      // Optionally, get gallery-level meta if available
      if (gallery.meta) parentGalleryMeta = gallery.meta;
      break;
    }
  }

  if (!imageData) {
    // Fallback to parent gallery meta
    return parentGalleryMeta;
  }

  // Build meta tags from image data
  const title = imageData.title || parentGalleryMeta.ogTitle || parentGalleryMeta.title || "Wayne Heim Fine Art Photography";
  const description = (imageData.description && imageData.description.length <= 160)
    ? imageData.description
    : (imageData.description ? imageData.description.slice(0, 157) + "..." : parentGalleryMeta.ogDescription || parentGalleryMeta.description || "Painterly and fine art photography by Wayne Heim.");
  const imageUrl = imageData.smugmugUrl || imageData.imageUrl || parentGalleryMeta.ogImage;

  return {
    ogTitle: title,
    ogDescription: description,
    ogImage: imageUrl,
    ogType: "website",
    twitterCard: "summary_large_image",
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: imageUrl,
    // Optionally add more fields as needed
  };
}
