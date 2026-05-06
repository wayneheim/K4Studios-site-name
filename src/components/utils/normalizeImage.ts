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

/**
 * Sanitizes images for client-side hydration props - strips SmugMug URLs
 * to prevent them from appearing in serialized HTML.
 * Only keeps fields needed for rendering: id, title, alt, href, galleryPath, description, keywords
 */
export function sanitizeForClient<T extends ImageVariants>(images: T[]): Partial<T>[] {
  return images.map(img => ({
    id: img.id,
    title: img.title,
    alt: img.alt,
    href: img.href,
    galleryPath: img.galleryPath,
    description: img.description,
    keywords: img.keywords,
    // Explicitly exclude: src, srcS, srcM, srcL, srcXL, srcOriginal, buyLink
  } as Partial<T>));
}

export function sanitizeCarouselForClient<T extends ImageVariants>(images: T[]): Partial<T>[] {
  return images.map(img => ({
    id: img.id,
    title: img.title,
    alt: img.alt,
    href: img.href,
    galleryPath: img.galleryPath,
    description: img.description,
    keywords: img.keywords,
    story: img.story,
    imageObjectPosition: img.imageObjectPosition,
    imageScale: img.imageScale,
    // Explicitly exclude: src, srcS, srcM, srcL, srcXL, srcOriginal, buyLink
  } as Partial<T>));
}
