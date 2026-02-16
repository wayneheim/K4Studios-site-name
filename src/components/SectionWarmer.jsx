/**
 * SectionWarmer - Warms related gallery images when landing on a section
 * 
 * When you land on a section landing page (e.g., Roaring 20s), this component
 * pre-warms the hero images and preview strip images for all child galleries
 * to make navigation feel instant.
 * 
 * Usage:
 *   <SectionWarmer client:idle galleryPaths={['/Galleries/...', ...]} />
 */

import { useEffect } from 'react';
import { warmImage } from '../utils/warmImage';

export default function SectionWarmer({ galleryPaths = [], galleryImages = {} }) {
  useEffect(() => {
    if (!galleryPaths.length) return;
    
    // Warm gallery images during idle time
    const warmRelatedGalleries = () => {
      galleryPaths.forEach(path => {
        const images = galleryImages[path];
        if (!images?.length) return;
        
        // Hero image (first) at 'l' size for landing page hero
        if (images[0]?.id) {
          warmImage(images[0].id, 'l');
        }
        
        // Preview strip - first 6 at 's' for display AND 'l' for click-through
        images.slice(0, 6).forEach(img => {
          if (img?.id) {
            warmImage(img.id, 's');
            warmImage(img.id, 'l');
          }
        });
      });
    };
    
    // Use requestIdleCallback for non-blocking warming
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(warmRelatedGalleries, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(warmRelatedGalleries, 100);
      return () => clearTimeout(timer);
    }
  }, [galleryPaths, galleryImages]);
  
  // This component renders nothing - purely for warming
  return null;
}
