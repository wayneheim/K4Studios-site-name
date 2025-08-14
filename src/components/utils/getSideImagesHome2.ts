import { siteNav } from '../../data/siteNav';

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

// --------- FIXED LOGIC: walk repeatedly until enough images ----------
function pullGalleryDataAndImagesMultiPass(
  gallerySources: { label: string; href: string }[],
  maxCount: number,
  excludeIds: Set<string>
): { galleryDatas: Image[][], galleryPaths: string[], pickedImages: Image[] } {
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });
  const galleryDatas: Image[][] = [];
  const galleryPaths: string[] = [];
  let allGalleryImages: { gallery: string, images: Image[] }[] = [];

  // Collect images per gallery (attach path)
  for (const gallery of gallerySources) {
      // gallery.href in siteNav already points to the exact variant (includes Color, Black-White, Gallery, etc.)
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

  // Now loop as many times as needed to hit target
  const pickedImages: Image[] = [];
  let offset = 0;
  while (pickedImages.length < maxCount) {
    let foundAny = false;
    for (const gallery of allGalleryImages) {
      if (gallery.images.length > offset) {
        const img = gallery.images[offset];
        if (img && !excludeIds.has(img.id)) {
          // FIX: previously used gallery.gallery (undefined) causing missing href on first item
          const href = `${gallery.gallery || img.galleryPath || ''}/${img.id}`.replace(/\/+/g, '/');
          pickedImages.push({ ...img, href });
          excludeIds.add(img.id);
          foundAny = true;
          if (pickedImages.length >= maxCount) break;
        }
      }
    }
    if (!foundAny) break; // No more new images to pull!
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
  // 1. Pull all galleries under both sections
  const painterlySources = getAllGallerySources("/Galleries/Painterly-Fine-Art-Photography");
  const fineArtSources   = getAllGallerySources("/Galleries/Fine-Art-Photography");

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

  // 4. Combine galleryDatas and galleryPaths for linker, painterly first then fine art (order doesn't matter)
  const galleryDatas = [...painterly.galleryDatas, ...fineArt.galleryDatas];
  const galleryPaths = [...painterly.galleryPaths, ...fineArt.galleryPaths];

  return {
    featheredImages,
    galleryDatas,
    galleryPaths
  };
}
