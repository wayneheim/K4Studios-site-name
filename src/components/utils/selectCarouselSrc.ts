/**
 * Select the optimal image size for carousel display.
 * 
 * Carousel displays images at:
 * - Desktop: 390px height
 * - Mobile: 200px height
 * 
 * SmugMug sizes (approximate longest edge):
 * - S: ~400px
 * - M: ~600px
 * - L: ~1024px
 * - XL: ~1600px
 * 
 * Logic:
 * - Portrait/square images: M is sufficient (600px > 390px)
 * - Standard landscapes (up to 2:1): L is needed (width up to 780px)
 * - Wide landscapes (over 2:1): XL is needed (width over 780px)
 * 
 * If we don't know the aspect ratio, default to L (safe for most cases).
 */

export function selectCarouselSrc(img: {
  src?: string;
  srcS?: string;
  srcM?: string;
  srcL?: string;
  srcXL?: string;
  width?: number;
  height?: number;
}): string {
  const { src, srcS, srcM, srcL, srcXL, width, height } = img;
  
  // If we have dimensions, calculate aspect ratio
  if (width && height && height > 0) {
    const aspectRatio = width / height;
    
    // Portrait or square: M is sufficient
    if (aspectRatio <= 1.2) {
      return srcM || srcL || srcS || srcXL || src || '';
    }
    
    // Standard landscape (up to 2:1): L is ideal
    if (aspectRatio <= 2) {
      return srcL || srcM || srcXL || src || '';
    }
    
    // Wide/ultra-wide landscape (over 2:1): XL needed
    return srcXL || srcL || src || '';
  }
  
  // No dimensions - try to infer from URL patterns
  // SmugMug URLs often contain aspect info in filename or we can check for landscape keywords
  const srcToCheck = src || srcXL || srcL || srcM || srcS || '';
  
  // If the src URL contains 'pano' or aspect hints, use XL
  if (/pano|panoram|wide/i.test(srcToCheck)) {
    return srcXL || srcL || src || '';
  }
  
  // Default: Use L (1024px) - safe for most landscapes up to 2.5:1 aspect ratio
  // This covers 390px height × 2.5 = 975px width
  return srcL || srcM || srcXL || src || '';
}

/**
 * For mobile carousel (200px height), smaller sizes are fine
 */
export function selectCarouselSrcMobile(img: {
  src?: string;
  srcS?: string;
  srcM?: string;
  srcL?: string;
  srcXL?: string;
  width?: number;
  height?: number;
}): string {
  const { src, srcS, srcM, srcL, srcXL, width, height } = img;
  
  // For 200px height, even wide landscapes only need ~600px width max
  // So M is almost always sufficient
  if (width && height && height > 0) {
    const aspectRatio = width / height;
    
    // Ultra-wide only needs L on mobile
    if (aspectRatio > 3) {
      return srcL || srcM || srcXL || src || '';
    }
  }
  
  // Default: M is sufficient for 200px height
  return srcM || srcS || srcL || src || '';
}
