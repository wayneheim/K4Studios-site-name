import { siteNav } from '../../data/siteNav';
import { normalizeImage } from './normalizeImage';

type Image = {
  id: string;
  rating?: number;
  sortOrder?: number;
  title?: string;
  description?: string;
  alt?: string;
  href?: string;
  galleryPath?: string;
};

function findGallerySourcesRecursive(node: any): any[] {
  let out: any[] = [];
  if (Array.isArray(node)) {
    for (const n of node) out = out.concat(findGallerySourcesRecursive(n));
    return out;
  }
  if (node.type === "gallery-source") return [node];
  if (node.children) return findGallerySourcesRecursive(node.children);
  return [];
}

function getAllGallerySources(sectionPath: string): { label: string, href: string }[] {
  function findNode(tree: any[]): any {
    for (const node of tree) {
      if (node.href === sectionPath) return node;
      if (node.children) {
        const found = findNode(node.children);
        if (found) return found;
      }
    }
    return null;
  }
  const node = findNode(siteNav);
  if (!node) return [];
  return findGallerySourcesRecursive(node);
}

function shuffle<T>(arr: T[]): T[] {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --------- IMPROVED LOGIC: Random selection to reduce repetition ----------
function pullGalleryDataAndImagesRandomized(
  gallerySources: { label: string; href: string }[],
  maxCount: number,
  excludeIds: Set<string>,
  mixingStrategy: 'random' | 'balanced' = 'random'
): { galleryDatas: Image[][], galleryPaths: string[], pickedImages: Image[] } {
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });
  const galleryDatas: Image[][] = [];
  const galleryPaths: string[] = [];
  let allGalleryImages: { gallery: string, images: Image[], availableIndices: number[] }[] = [];

  // Collect images per gallery (attach path)
  for (const gallery of gallerySources) {
    const filePath = '../../data' + gallery.href + '.mjs';
    const mod: any = allGalleryData[filePath];
    let images: Image[] = (mod?.galleryData || mod?.default || []).filter(
      (img: Image) => img.id && img.id !== 'i-k4studios'
    );
    images.forEach(img => (img.galleryPath = gallery.href));

    if (images.length) {
      galleryDatas.push(images);
      galleryPaths.push(gallery.href);

      // Create array of available indices for random selection
      const availableIndices = Array.from({ length: images.length }, (_, i) => i);
      shuffle(availableIndices); // Shuffle indices for random access

      allGalleryImages.push({
        gallery: gallery.href,
        images: images,
        availableIndices: availableIndices
      });
    }
  }

  const pickedImages: Image[] = [];

  if (mixingStrategy === 'random') {
    // Random strategy: randomly select from any available gallery
    const totalAvailableImages = allGalleryImages.reduce((sum, g) => sum + g.availableIndices.length, 0);

    while (pickedImages.length < maxCount && totalAvailableImages > pickedImages.length) {
      // Randomly select a gallery that still has available images
      const availableGalleries = allGalleryImages.filter(g => g.availableIndices.length > 0);
      if (availableGalleries.length === 0) break;

      const randomGalleryIndex = Math.floor(Math.random() * availableGalleries.length);
      const selectedGallery = availableGalleries[randomGalleryIndex];

      // Get next available index from this gallery
      const imageIndex = selectedGallery.availableIndices.pop()!;
      const img = selectedGallery.images[imageIndex];

      if (img && !excludeIds.has(img.id)) {
        const href = `${selectedGallery.gallery}/${img.id}`.replace(/\/+/g, '/');
        const normalized = normalizeImage({ ...img, href });
        pickedImages.push(normalized);
        excludeIds.add(img.id);
      }
    }
  } else {
    // Balanced strategy: ensure fair distribution across galleries
    const galleriesWithImages = allGalleryImages.filter(g => g.availableIndices.length > 0);

    while (pickedImages.length < maxCount && galleriesWithImages.length > 0) {
      // Go through each gallery that still has images
      for (const gallery of galleriesWithImages.slice()) { // slice() to avoid modification during iteration
        if (gallery.availableIndices.length === 0) {
          // Remove from available galleries
          const index = galleriesWithImages.indexOf(gallery);
          if (index > -1) galleriesWithImages.splice(index, 1);
          continue;
        }

        const imageIndex = gallery.availableIndices.pop()!;
        const img = gallery.images[imageIndex];

        if (img && !excludeIds.has(img.id)) {
          const href = `${gallery.gallery}/${img.id}`.replace(/\/+/g, '/');
          const normalized = normalizeImage({ ...img, href });
          pickedImages.push(normalized);
          excludeIds.add(img.id);

          if (pickedImages.length >= maxCount) break;
        }
      }

      if (pickedImages.length >= maxCount) break;
    }
  }

  return { galleryDatas, galleryPaths, pickedImages };
}

export function getSideImagesHome2({
  targetCount = 100,
  excludeIds = new Set<string>(),
  mixingStrategy = 'auto' as 'random' | 'balanced' | 'auto'
}: {
  targetCount?: number;
  excludeIds?: Set<string>;
  mixingStrategy?: 'random' | 'balanced' | 'auto';
}): {
  featheredImages: Image[],
  galleryDatas: Image[][],
  galleryPaths: string[]
} {
  // Auto strategy: alternate between random and balanced on each call
  let actualStrategy: 'random' | 'balanced' = 'random';
  if (mixingStrategy === 'auto') {
    // Use sessionStorage to alternate strategies across page loads
    const currentStrategy = typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('sidebarMixingStrategy')
      : null;

    if (currentStrategy === 'random') {
      actualStrategy = 'balanced';
    } else {
      actualStrategy = 'random';
    }

    // Store for next call
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('sidebarMixingStrategy', actualStrategy);
    }
  } else {
    actualStrategy = mixingStrategy;
  }

  // 1. Pull all galleries under both sections
  const painterlySources = getAllGallerySources("/Galleries/Painterly-Fine-Art-Photography");
  const fineArtSources   = getAllGallerySources("/Galleries/Fine-Art-Photography");

  // 2. Gather gallery data and pull multiple images per gallery (improved randomized logic)
  const painterly = pullGalleryDataAndImagesRandomized(painterlySources, targetCount, excludeIds, actualStrategy);
  const fineArt   = pullGalleryDataAndImagesRandomized(fineArtSources, targetCount, excludeIds, actualStrategy);

  // 3. Alternate from painterly and fine art
  const featheredImages: Image[] = [];
  let p = 0, f = 0;
  while (featheredImages.length < targetCount && (p < painterly.pickedImages.length || f < fineArt.pickedImages.length)) {
    if (f < fineArt.pickedImages.length)  featheredImages.push(fineArt.pickedImages[f++]);
    if (featheredImages.length >= targetCount) break;
    if (p < painterly.pickedImages.length) featheredImages.push(painterly.pickedImages[p++]);
  }

  // 4. Combine galleryDatas and galleryPaths for linker, painterly first then fine art (order doesn't matter)
  const galleryDatas = [...painterly.galleryDatas, ...fineArt.galleryDatas];
  const galleryPaths = [...painterly.galleryPaths, ...fineArt.galleryPaths];

  return {
    featheredImages,
    galleryDatas,
    galleryPaths
  };
}
