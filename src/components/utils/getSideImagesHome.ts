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

function pullOnePerGallery(
  gallerySources: { label: string, href: string }[],
  count: number,
  excludeIds = new Set<string>()
): Image[] {
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });
  const images: Image[] = [];

  while (images.length < count) {
    let added = false;
    for (const gallery of shuffle(gallerySources)) {
      if (images.length >= count) break;
      const filePath = '../../data' + gallery.href + '.mjs';
      const mod = allGalleryData[filePath];
      const allImages: Image[] = (mod?.galleryData || mod?.default || []).filter(
        (img: Image) => img.id && img.id !== 'i-k4studios' && !excludeIds.has(img.id)
      );
      if (allImages.length) {
        const highRated = allImages.filter(img => (img.rating ?? 0) >= 4);
        const pick = shuffle(highRated).pop() || shuffle(allImages).pop();
        if (pick) {
          pick.galleryPath = gallery.href;
          images.push(pick);
          excludeIds.add(pick.id);
          added = true;
        }
      }
    }
    if (!added) break;
  }

  return images;
}

export default function getSideImages({
  headingCount,
  excludeIds = new Set<string>(),
}: {
  headingCount: number;
  excludeIds?: Set<string>;
}): Image[] {
  const painterlySources = getAllGallerySources("/Galleries/Painterly-Fine-Art-Photography");
  const fineArtSources = getAllGallerySources("/Galleries/Fine-Art-Photography");

  const painterlyImgs = pullOnePerGallery(painterlySources, 50, excludeIds);
  const fineArtImgs = pullOnePerGallery(fineArtSources, 50, excludeIds);

  const result: Image[] = [];
  let p = 0, f = 0;
  for (let i = 0; i < headingCount; i++) {
    if (p < painterlyImgs.length && f < fineArtImgs.length) {
      if (i % 2 === 0) result.push({ ...painterlyImgs[p++], href: `${painterlyImgs[p-1].galleryPath}/${painterlyImgs[p-1].id}` });
      else             result.push({ ...fineArtImgs[f++], href: `${fineArtImgs[f-1].galleryPath}/${fineArtImgs[f-1].id}` });
    } else if (p < painterlyImgs.length) {
      result.push({ ...painterlyImgs[p], href: `${painterlyImgs[p].galleryPath}/${painterlyImgs[p].id}` }); p++;
    } else if (f < fineArtImgs.length) {
      result.push({ ...fineArtImgs[f], href: `${fineArtImgs[f].galleryPath}/${fineArtImgs[f].id}` }); f++;
    }
  }

  return result;
}
