export interface ImageVariants {
  id?: string;
  title?: string;
  alt?: string;
  href?: string;
  galleryPath?: string;
  src?: string; // current (may point to XL in raw data)
  srcS?: string;
  srcM?: string;
  srcL?: string;
  srcXL?: string;
  srcOriginal?: string; // we will populate (previous src value) if we change src
  [key: string]: any; // allow additional metadata
}

/**
 * Normalizes an image object so that:
 * - srcOriginal preserves the incoming src if we override it
 * - src is reassigned to the smallest available variant (S -> M -> L -> XL -> existing src)
 * - Never promotes XL to src if a smaller variant exists
 * - Handles Ti.jpg references by using proper fallback chain
 */
export function normalizeImage<T extends ImageVariants>(img: T): T {
  if (!img) return img;

  // Priority order for sidebar: S -> M -> L -> XL -> original src
  // This ensures we use the smallest available image for performance
  const smallest = img.srcS || img.srcM || img.srcL || img.srcXL || img.src;

  if (smallest && smallest !== img.src) {
    // Preserve the original src value
    if (!img.srcOriginal) img.srcOriginal = img.src;
    img.src = smallest;
  }

  return img;
}

export function normalizeImages<T extends ImageVariants>(arr: T[] = []): T[] {
  return arr.map(normalizeImage);
}