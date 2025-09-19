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

// --- Universal shuffle, used everywhere ---
function shuffle<T>(arr: T[]): T[] {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Pull images from galleries, shuffle gallery order, images in gallery, and pick multi-pass ---
function pullGalleryDataAndImagesMultiPass(
  gallerySources: { label: string; href: string }[],
  maxCount: number,
  excludeIds: Set<string>
): { galleryDatas: Image[][], galleryPaths: string[], pickedImages: Image[] } {
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });

  // 1. Shuffle gallery order for true variety per load
  const shuffledSources = shuffle(gallerySources);

  const galleryDatas: Image[][] = [];
  const galleryPaths: string[] = [];
  let allGalleryImages: { gallery: string, images: Image[] }[] = [];

  for (const gallery of shuffledSources) {
    const filePath = '../../data' + gallery.href + '.mjs';
    const mod: any = allGalleryData[filePath];
    let images: Image[] = (mod?.galleryData || mod?.default || []).filter(
      (img: Image) => img.id && img.id !== 'i-k4studios'
    );
    images.forEach(img => (img.galleryPath = gallery.href));
    if (images.length) {
      galleryDatas.push(images);
      galleryPaths.push(gallery.href);
      // Shuffle order per gallery for fairer distribution
      allGalleryImages.push({ gallery: gallery.href, images: shuffle(images) });
    }
  }

  // 2. Alternate pulling one per gallery in order, keep looping until maxCount or out
  const pickedImages: Image[] = [];
  let offset = 0;
  while (pickedImages.length < maxCount) {
    let foundAny = false;
    for (const gallery of allGalleryImages) {
      if (gallery.images.length > offset) {
        const img = gallery.images[offset];
        if (img && !excludeIds.has(img.id)) {
          const href = `${gallery.gallery || img.galleryPath || ''}/${img.id}`.replace(/\/+/g, '/');
          const normalized = normalizeImage({ ...img, href });
          pickedImages.push(normalized);
          excludeIds.add(img.id);
          foundAny = true;
          if (pickedImages.length >= maxCount) break;
        }
      }
    }
    if (!foundAny) break;
    offset++;
  }

  return { galleryDatas, galleryPaths, pickedImages };
}

export function getSideImagesHome2({
  targetCount = 100,
  excludeIds = new Set<string>(),
}: {
  targetCount?: number;
  excludeIds?: Set<string>;
}): {
  featheredImages: Image[],
  galleryDatas: Image[][],
  galleryPaths: string[]
} {
  // 1. Pull all galleries under both sections, shuffle order for randomness
  const painterlySources = shuffle(getAllGallerySources("/Galleries/Painterly-Fine-Art-Photography"));
  const fineArtSources   = shuffle(getAllGallerySources("/Galleries/Fine-Art-Photography"));

  // 2. Gather gallery data and pull multiple images per gallery (fixed logic)
  const painterly = pullGalleryDataAndImagesMultiPass(painterlySources, targetCount, excludeIds);
  const fineArt   = pullGalleryDataAndImagesMultiPass(fineArtSources, targetCount, excludeIds);

  // 3. Alternate from painterly and fine art
  const featheredImages: Image[] = [];
  let p = 0, f = 0;
  while (featheredImages.length < targetCount && (p < painterly.pickedImages.length || f < fineArt.pickedImages.length)) {
    if (f < fineArt.pickedImages.length)  featheredImages.push(fineArt.pickedImages[f++]);
    if (featheredImages.length >= targetCount) break;
    if (p < painterly.pickedImages.length) featheredImages.push(painterly.pickedImages[p++]);
  }

  // --- NEW: Cowboy always first if present
  const cowboyIdx = featheredImages.findIndex(img =>
    img.galleryPath && img.galleryPath.toLowerCase().includes('cowboy')
  );
  if (cowboyIdx > 0) {
    const [cowboyImage] = featheredImages.splice(cowboyIdx, 1);
    featheredImages.unshift(cowboyImage);
  }

  // --- Shuffle everything but the first image for more randomness across reloads
  const rest = featheredImages.slice(1);
  const finalImages = [featheredImages[0], ...shuffle(rest)];

  // 4. Combine galleryDatas and galleryPaths for linker, painterly first then fine art
  const galleryDatas = [...painterly.galleryDatas, ...fineArt.galleryDatas];
  const galleryPaths = [...painterly.galleryPaths, ...fineArt.galleryPaths];

  return {
    featheredImages: finalImages,
    galleryDatas,
    galleryPaths
  };
}
