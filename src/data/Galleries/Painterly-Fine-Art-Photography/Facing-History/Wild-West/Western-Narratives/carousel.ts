/// <reference types="vite/client" />

type GalleryImage = {
  id: string;
  rating?: number;
  visibility?: string;
  src?: string;
  srcL?: string;
  srcM?: string;
  srcS?: string;
  alt?: string;
  title?: string;
  description?: string;
};

type GalleryModule = {
  galleryData?: GalleryImage[];
  default?: {
    galleryData?: GalleryImage[];
  };
};

type CarouselSlide = {
  href: string;
  id: string;
  src: string;
  alt: string;
  description: string;
};

// Import all gallery mjs modules for Western-Narratives and its children
const modules = import.meta.glob('@/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/**/*.mjs', { eager: true }) as Record<string, GalleryModule>;

// Collect gallery datasets and URL paths
const galleryDatas: GalleryImage[][] = [];
const galleryPaths: string[] = [];

// Pattern to detect backup/copy files (e.g., Color-copy1.mjs)
const BACKUP_PATTERN = /[-_\s](copy|backup)(\d*|[-_\s].*)?\.mjs$/i;

for (const filePath in modules) {
  // Skip backup/copy files
  if (BACKUP_PATTERN.test(filePath)) continue;
  const mod = modules[filePath];
  const data = mod.galleryData || (mod.default && mod.default.galleryData);
  if (!Array.isArray(data)) continue;
  // Filter out ghost and placeholder images
  const visible = data.filter((img: GalleryImage) => img.id !== 'i-k4studios' && img.visibility !== 'ghost');
  if (visible.length === 0) continue;
  // Extract subfolder name from file path for path building (exclude .mjs extension)
  const match = filePath.match(/Western-Narratives\/?([^/]*?)(?:\.mjs)?$/);
  const subfolder = match && match[1] ? `/${match[1]}` : '';
  galleryDatas.push(visible);
  galleryPaths.push(`/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives${subfolder}`);
}

// Helper: Build a pool prioritized by rating (5 → 4 → 3 → others), randomized per rating
function buildRankedPool(images: GalleryImage[]): GalleryImage[] {
  const ratings = [5, 4, 3];
  let pool: GalleryImage[] = [];
  ratings.forEach(r => {
    pool.push(...images.filter((img: GalleryImage) => img.rating === r).sort(() => Math.random() - 0.5));
  });
  pool.push(...images.filter((img: GalleryImage) => !ratings.includes(img.rating ?? -1)).sort(() => Math.random() - 0.5));
  return pool;
}

// Helper: Convert image to slide object
function toSlide(img: GalleryImage, path: string): CarouselSlide {
  // Robust src fallback logic: desktop order (srcM, srcS, srcL, src)
  let src = img.srcM || img.srcS || img.srcL || img.src || '';
  // If srcS ends with -L.jpg, use srcS as override (for legacy/fallback)
  if (img.srcS && img.srcS.endsWith('-L.jpg')) {
    src = img.srcS;
  }
  return {
    href: `${path}/${img.id}`,
    id: img.id,
    src,
    alt: img.alt || img.title || '',
    description: img.description || ''
  };
}

// Build alternating slides across all theme pools up to maxSlides
export const slides: CarouselSlide[] = (() => {
  const pools = galleryDatas.map((data: GalleryImage[]) => buildRankedPool(data));
  const pointers = pools.map(() => 0);
  const result: CarouselSlide[] = [];
  const maxSlides = 10;

  while (result.length < maxSlides && pointers.some((ptr, i) => ptr < pools[i].length)) {
    for (let i = 0; i < pools.length && result.length < maxSlides; i++) {
      const pool = pools[i];
      const idx = pointers[i]++;
      if (idx < pool.length) {
        result.push(toSlide(pool[idx], galleryPaths[i]));
      }
    }
  }

  return result;
})();
