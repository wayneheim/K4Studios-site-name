// Utility to generate meta tags for individual image pages
// Usage: getImageMeta(imageId, galleryDatas, fallbackMeta, canonicalUrl)

export function getImageMeta(imageId, galleryDatas, fallbackMeta: any = {}, canonicalUrl?: string) {
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

  const clean = (v: any) => String(v || "").trim();
  const genericTitle = /^(untitled|image|photo|no\s*title)$/i;
  const imageTitle = clean(imageData.title);
  const imageAlt = clean(imageData.alt);

  const title =
    (imageTitle && !genericTitle.test(imageTitle) ? imageTitle : "") ||
    (imageAlt && !genericTitle.test(imageAlt) ? imageAlt : "") ||
    "Wayne Heim Fine Art Photography";

  // Prefer story for social/meta tags, fallback to description, then gallery meta
  const story = (imageData.story && imageData.story.trim()) ? imageData.story.trim() : null;
  const imageDescription = (imageData.description && imageData.description.trim()) ? imageData.description.trim() : null;
  const altDescription = (imageAlt && !genericTitle.test(imageAlt)) ? imageAlt : null;
  const description =
    story && story.length <= 160
      ? story
      : story
      ? story.slice(0, 157) + "…"
      : imageDescription && imageDescription.length <= 160
      ? imageDescription
      : imageDescription
      ? imageDescription.slice(0, 157) + "…"
      : altDescription || "Painterly and fine art photography by Wayne Heim.";

  const imageUrl =
    imageData.smugmugUrl || imageData.imageUrl || imageData.src || parentGalleryMeta.ogImage;

  return {
    ...imageData, // ✅ keep all fields (alt, notes, keywords, etc.)
    story: story || imageData.description || description, // ✅ guarantee story exists
    canonicalUrl, // ✅ explicit canonical for this image page
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
