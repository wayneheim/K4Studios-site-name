import { siteNav } from '../../data/siteNav';
import { WESTERN_POOL_PATHS, resolveCarouselGalleryHref } from '@/data/carousel/westernRouting.ts';
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

// Fisher-Yates shuffle for randomization
function shuffle<T>(arr: T[]): T[] {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Helper function to get galleries from specific paths
function getGalleriesByPaths(paths: string[]): { label: string, href: string }[] {
  const allSources = getAllGallerySources("/Galleries/Painterly-Fine-Art-Photography")
    .concat(getAllGallerySources("/Galleries/Fine-Art-Photography"));

  return allSources.filter(source => paths.some(path => source.href.includes(path)));
}

// Helper function to get galleries excluding specific paths
function getGalleriesExcludingPaths(excludePaths: string[]): { label: string, href: string }[] {
  const allSources = getAllGallerySources("/Galleries/Painterly-Fine-Art-Photography")
    .concat(getAllGallerySources("/Galleries/Fine-Art-Photography"));

  return allSources.filter(source => !excludePaths.some(path => source.href.includes(path)));
}

// Improved image pulling with better randomization
function pullImagesFromGalleries(
  gallerySources: { label: string; href: string }[],
  count: number,
  excludeIds: Set<string>,
  useSessionStorage = false
): Image[] {
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });
  const pickedImages: Image[] = [];

  // Create a pool of all available images from these galleries
  let allImages: Image[] = [];

  for (const gallery of gallerySources) {
    const filePath = '../../data' + gallery.href + '.mjs';
    const mod: any = allGalleryData[filePath];
    let images: Image[] = (mod?.galleryData || mod?.default || []).filter(
      (img: Image) => img.id && img.id !== 'i-k4studios' && !excludeIds.has(img.id)
    );
    images.forEach(img => (img.galleryPath = gallery.href));
    allImages = allImages.concat(images);
  }

  // Shuffle for randomization
  allImages = shuffle(allImages);

  // Use session storage to track last used images for better variety
  let lastUsedIndices: number[] = [];
  if (useSessionStorage && typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem('sidebarLastUsedIndices');
    if (stored) {
      lastUsedIndices = JSON.parse(stored);
    }
  }

  // Prioritize images that haven't been used recently
  const prioritizedImages = allImages
    .map((img, index) => ({ img, originalIndex: index }))
    .sort((a, b) => {
      const aRecent = lastUsedIndices.includes(a.originalIndex);
      const bRecent = lastUsedIndices.includes(b.originalIndex);
      if (aRecent && !bRecent) return 1;
      if (!aRecent && bRecent) return -1;
      return 0; // Random tiebreaker (already shuffled)
    })
    .map(item => item.img);

  // Take the required number
  const selectedImages = prioritizedImages.slice(0, count);

  // Update session storage with used indices
  if (useSessionStorage && typeof sessionStorage !== 'undefined') {
    const usedIndices = selectedImages.map(img =>
      allImages.findIndex(origImg => origImg.id === img.id)
    ).filter(idx => idx !== -1);
    sessionStorage.setItem('sidebarLastUsedIndices', JSON.stringify(usedIndices));
  }

  // Normalize and add to picked images
  for (const img of selectedImages) {
    const resolvedGalleryPath = resolveCarouselGalleryHref(img.id, img.galleryPath || '');
    const href = `${resolvedGalleryPath}/${img.id}`.replace(/\/+/g, '/');
    const normalized = normalizeImage({ ...img, href, galleryPath: resolvedGalleryPath });
    pickedImages.push(normalized);
    excludeIds.add(img.id);
  }

  return pickedImages;
}

export function getSideImagesHome2({
  targetCount = 100, // Changed default to 100 as requested
  excludeIds = new Set<string>(),
  poolMultiplier = 1, // Return poolMultiplier × targetCount for client-side rotation
}: {
  targetCount?: number;
  excludeIds?: Set<string>;
  poolMultiplier?: number;
}): {
  featheredImages: Image[],
  galleryDatas: Image[][],
  galleryPaths: string[]
} {
  // Calculate pool size for client-side rotation
  const poolSize = targetCount * poolMultiplier;
  const perCategory = Math.max(1, Math.ceil(poolSize / 6)); // 6 categories
  
  // Define gallery categories
  const westernCowboyPaths = WESTERN_POOL_PATHS;

  const painterlyLandscapePaths = [
    "/Galleries/Painterly-Fine-Art-Photography/Landscapes"
  ];

  const traditionalLandscapePaths = [
    "/Galleries/Fine-Art-Photography/Landscapes"
  ];

  const transportationPaths = [
    "/Galleries/Fine-Art-Photography/Transportation"
  ];

  // Get all painterly galleries
  const allPainterlySources = getAllGallerySources("/Galleries/Painterly-Fine-Art-Photography");

  // Get all traditional (fine art) galleries
  const allTraditionalSources = getAllGallerySources("/Galleries/Fine-Art-Photography");

  // 1. Select western cowboy images (first category)
  const westernCowboyGalleries = getGalleriesByPaths(westernCowboyPaths);
  const westernCowboyImages = pullImagesFromGalleries(westernCowboyGalleries, perCategory, excludeIds, true);

  // 2. Select painterly landscape images
  const painterlyLandscapeGalleries = getGalleriesByPaths(painterlyLandscapePaths);
  const painterlyLandscapeImages = pullImagesFromGalleries(painterlyLandscapeGalleries, perCategory, excludeIds, true);

  // 3. Select painterly other images (excluding western and landscape)
  const excludePainterlyPaths = westernCowboyPaths.concat(painterlyLandscapePaths);
  const painterlyOtherGalleries = getGalleriesExcludingPaths(excludePainterlyPaths)
    .filter(g => g.href.startsWith('/Galleries/Painterly-Fine-Art-Photography'));
  const painterlyOtherImages = pullImagesFromGalleries(painterlyOtherGalleries, perCategory, excludeIds, true);

  // 4. Select traditional landscape images
  const traditionalLandscapeGalleries = getGalleriesByPaths(traditionalLandscapePaths);
  const traditionalLandscapeImages = pullImagesFromGalleries(traditionalLandscapeGalleries, perCategory, excludeIds, true);

  // 5. Select transportation images
  const transportationGalleries = getGalleriesByPaths(transportationPaths);
  const transportationImages = pullImagesFromGalleries(transportationGalleries, perCategory, excludeIds, true);

  // 6. Select traditional other images (excluding landscape and transportation)
  const excludeTraditionalPaths = traditionalLandscapePaths.concat(transportationPaths);
  const traditionalOtherGalleries = getGalleriesExcludingPaths(excludeTraditionalPaths)
    .filter(g => g.href.startsWith('/Galleries/Fine-Art-Photography'));
  const traditionalOtherImages = pullImagesFromGalleries(traditionalOtherGalleries, perCategory, excludeIds, true);

  // Combine all selected images in alternating pattern: painterly/traditional/painterly/traditional...
  const featheredImages: Image[] = [];

  // Interleave all images from each category
  const painterlyAll = [...westernCowboyImages, ...painterlyLandscapeImages, ...painterlyOtherImages];
  const traditionalAll = [...traditionalLandscapeImages, ...transportationImages, ...traditionalOtherImages];
  
  let p = 0, t = 0;
  while (featheredImages.length < poolSize && (p < painterlyAll.length || t < traditionalAll.length)) {
    if (p < painterlyAll.length) featheredImages.push(painterlyAll[p++]);
    if (t < traditionalAll.length && featheredImages.length < poolSize) featheredImages.push(traditionalAll[t++]);
  }

  // Collect all gallery data for the linker
  const allGallerySources = [
    ...westernCowboyGalleries,
    ...painterlyLandscapeGalleries,
    ...painterlyOtherGalleries,
    ...traditionalLandscapeGalleries,
    ...transportationGalleries,
    ...traditionalOtherGalleries
  ];

  const galleryDatas: Image[][] = [];
  const galleryPaths: string[] = [];
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });

  for (const gallery of allGallerySources) {
    const filePath = '../../data' + gallery.href + '.mjs';
    const mod: any = allGalleryData[filePath];
    const images: Image[] = (mod?.galleryData || mod?.default || []).filter(
      (img: Image) => img.id && img.id !== 'i-k4studios'
    );
    if (images.length) {
      galleryDatas.push(images);
      galleryPaths.push(gallery.href);
    }
  }

  return {
    featheredImages,
    galleryDatas,
    galleryPaths
  };
}
