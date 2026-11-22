import { getImageDimensions } from "@/utils/getImageDimensions.js";
import { getSemanticImageUrl } from "@/utils/imageProxy.js";
import seriesRegistry from "../data/seriesRegistry.json";
import { findSeriesId, getConfiguredSeries } from "../data/seriesAvailability.js";

function isNavigableImage(img) {
  const visibility = String(img?.visibility || "").toLowerCase().trim();
  return Boolean(img?.id) && (visibility === "show" || visibility === "normal");
}

function sortByGalleryOrder(images) {
  return [...images].sort((a, b) => (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0));
}

function toDirectImage(entry, galleryPath) {
  if (!entry) return null;

  const dims = getImageDimensions(entry);
  const {
    src,
    srcS,
    srcM,
    srcL,
    srcXL,
    srcOriginal,
    image,
    imageUrl,
    url,
    thumb,
    preview,
    keywords,
    galleries,
    ...safeEntry
  } = entry;

  return {
    ...safeEntry,
    // Embed assignments for correct icons/prices before the client fetches the registry.
    availableSeries: getConfiguredSeries(entry, seriesRegistry.series?.[findSeriesId(entry.id, galleryPath, seriesRegistry)]),
    ...(dims ? { width: dims.width, height: dims.height } : {}),
    src: getSemanticImageUrl(entry, { galleryPath }, "m"),
  };
}

export function buildDirectImagePayload({ allImages, initialImageId, galleryPath, titleBase }) {
  const navigableImages = Array.isArray(allImages) ? sortByGalleryOrder(allImages.filter(isNavigableImage)) : [];
  const currentIndex = navigableImages.findIndex((img) => img.id === initialImageId);
  const currentImage = currentIndex >= 0 ? navigableImages[currentIndex] : null;

  if (!currentImage) {
    return null;
  }

  const prevImage = currentIndex > 0 ? navigableImages[currentIndex - 1] : null;
  const nextImage = currentIndex < navigableImages.length - 1 ? navigableImages[currentIndex + 1] : null;

  return {
    currentImage: toDirectImage(currentImage, galleryPath),
    prevImage: toDirectImage(prevImage, galleryPath),
    nextImage: toDirectImage(nextImage, galleryPath),
    index: currentIndex,
    totalCount: navigableImages.length,
    galleryMeta: {
      title: titleBase || galleryPath,
      basePath: galleryPath,
      chapterName: titleBase || galleryPath,
      sectionName: titleBase || galleryPath,
    },
  };
}

export default buildDirectImagePayload;
