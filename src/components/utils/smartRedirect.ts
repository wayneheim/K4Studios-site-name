/**
 * Smart Redirect Utility for [id].astro pages
 * 
 * When an image ID is not found in the current gallery, this utility:
 * 1. First checks imageIdMap to see if the image exists elsewhere (e.g., Archive)
 * 2. If found elsewhere, returns a 301 redirect to the correct location
 * 3. If not found anywhere, redirects to the current gallery's landing page
 */

import imageIdMap from '@/data/imageIdMap.json';

interface SmartRedirectResult {
  shouldRedirect: boolean;
  redirectUrl?: string;
  statusCode: 301 | 302;
}

/**
 * Determines the appropriate redirect for a missing image ID
 * 
 * @param imageId - The image ID (e.g., "i-vhGcpWV")
 * @param currentPath - The current URL pathname
 * @returns Redirect information or null if no redirect needed
 */
export function getSmartRedirect(imageId: string, currentPath: string): SmartRedirectResult | null {
  // Check if this image exists in another gallery (like Archive)
  const correctGalleryPath = (imageIdMap as Record<string, string>)[imageId];
  
  if (correctGalleryPath) {
    // Image found in a different gallery - 301 redirect to correct location
    const redirectUrl = `${correctGalleryPath}/${imageId}`;
    console.log(`[smart-redirect] Image ${imageId} found at ${redirectUrl}`);
    return {
      shouldRedirect: true,
      redirectUrl,
      statusCode: 301
    };
  }
  
  // Image not found anywhere - redirect to current gallery's landing page
  let cleanUrl = currentPath.replace(/\/i[^/]*\/?$/, '');
  cleanUrl = cleanUrl.replace(/\/+$/, '');
  
  if (cleanUrl && cleanUrl !== currentPath) {
    console.log(`[smart-redirect] Image ${imageId} not found, redirecting to gallery: ${cleanUrl}`);
    return {
      shouldRedirect: true,
      redirectUrl: cleanUrl,
      statusCode: 302
    };
  }
  
  return null;
}
