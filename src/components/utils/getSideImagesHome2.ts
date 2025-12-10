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
    const href = `${img.galleryPath}/${img.id}`.replace(/\/+/g, '/');
    const normalized = normalizeImage({ ...img, href });
    pickedImages.push(normalized);
    excludeIds.add(img.id);
  }

  return pickedImages;
}

export function getSideImagesHome2({
  targetCount = 100, // Changed default to 100 as requested
  excludeIds = new Set<string>(),
}: {
  targetCount?: number;
  excludeIds?: Set<string>;
}): {
  featheredImages: Image[],
  galleryDatas: Image[][],
  galleryPaths: string[]
} {
  // Define gallery categories
  const westernCowboyPaths = [
    "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits"
  ];

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

  // 1. Select western cowboy image (must be first)
  const westernCowboyGalleries = getGalleriesByPaths(westernCowboyPaths);
  const westernCowboyImages = pullImagesFromGalleries(westernCowboyGalleries, 1, excludeIds, true);

  // 2. Select painterly landscape image
  const painterlyLandscapeGalleries = getGalleriesByPaths(painterlyLandscapePaths);
  const painterlyLandscapeImages = pullImagesFromGalleries(painterlyLandscapeGalleries, 1, excludeIds, true);

  // 3. Select painterly other image (excluding western and landscape)
  const excludePainterlyPaths = westernCowboyPaths.concat(painterlyLandscapePaths);
  const painterlyOtherGalleries = getGalleriesExcludingPaths(excludePainterlyPaths)
    .filter(g => g.href.startsWith('/Galleries/Painterly-Fine-Art-Photography'));
  const painterlyOtherImages = pullImagesFromGalleries(painterlyOtherGalleries, 1, excludeIds, true);

  // 4. Select traditional landscape image
  const traditionalLandscapeGalleries = getGalleriesByPaths(traditionalLandscapePaths);
  const traditionalLandscapeImages = pullImagesFromGalleries(traditionalLandscapeGalleries, 1, excludeIds, true);

  // 5. Select transportation image
  const transportationGalleries = getGalleriesByPaths(transportationPaths);
  const transportationImages = pullImagesFromGalleries(transportationGalleries, 1, excludeIds, true);

  // 6. Select traditional other image (excluding landscape and transportation)
  const excludeTraditionalPaths = traditionalLandscapePaths.concat(transportationPaths);
  const traditionalOtherGalleries = getGalleriesExcludingPaths(excludeTraditionalPaths)
    .filter(g => g.href.startsWith('/Galleries/Fine-Art-Photography'));
  const traditionalOtherImages = pullImagesFromGalleries(traditionalOtherGalleries, 1, excludeIds, true);

  // Combine all selected images in alternating pattern: painterly/traditional/painterly/traditional...
  const featheredImages: Image[] = [];

  // First image is always the western cowboy (painterly)
  if (westernCowboyImages.length > 0) {
    featheredImages.push(westernCowboyImages[0]);
  }

  // Create the alternating pattern with the remaining images
  const painterlyImages = [painterlyLandscapeImages[0], painterlyOtherImages[0]].filter(Boolean);
  const traditionalImages = [traditionalLandscapeImages[0], transportationImages[0], traditionalOtherImages[0]].filter(Boolean);

  let p = 0, t = 0;
  const maxImages = Math.min(targetCount - 1, painterlyImages.length + traditionalImages.length);

  for (let i = 0; i < maxImages; i++) {
    if (i % 2 === 0 && p < painterlyImages.length) {
      // Even index: painterly
      featheredImages.push(painterlyImages[p++]);
    } else if (t < traditionalImages.length) {
      // Odd index: traditional
      featheredImages.push(traditionalImages[t++]);
    } else if (p < painterlyImages.length) {
      // Fallback to painterly if no more traditional
      featheredImages.push(painterlyImages[p++]);
    }
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
