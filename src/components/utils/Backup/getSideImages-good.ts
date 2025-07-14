import { siteNav } from '../../data/siteNav';

type Image = {
  id: string;
  rating?: number;
  sortOrder?: number;
  title?: string;
  description?: string;
  alt?: string;
  href?: string;
};

// Recursive to get all gallery-source descendants
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

// Get all gallery-source descendants for a section path
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

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getSideImages({
  sectionPath,
  headingCount,
  excludeIds = new Set<string>(),
}: {
  sectionPath: string;
  headingCount: number;
  excludeIds?: Set<string>;
}): Image[] {
  // Get all gallery sources under the section
  let galleryChildren = getAllGallerySources(sectionPath);

  if (!galleryChildren.length) return [];

  // Shuffle gallery order to randomize which gallery is picked first
  galleryChildren = shuffle(galleryChildren);

  // Import all .mjs files for galleries eagerly (SSR)
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });

  // For each gallery: try to pick images rated 4-5 first, if not enough fill from any
  const galleriesWithImages = galleryChildren.map(child => {
    const filePath = '../../data' + child.href + '.mjs';
    const mod = allGalleryData[filePath];
    const allImages: Image[] = (mod?.galleryData || mod?.default || []).filter(
      (img: Image) => img.id && img.id !== 'i-k4studios' && !excludeIds.has(img.id)
    );

    // Separate rated 4-5 images from the rest
    const highRated = allImages.filter(img => (img.rating ?? 0) >= 4);
    const lowRated = allImages.filter(img => (img.rating ?? 0) < 4);

    // Shuffle both arrays
    const shuffledHigh = shuffle(highRated);
    const shuffledLow = shuffle(lowRated);

    // Return object for picking
    return { high: shuffledHigh, low: shuffledLow };
  });

  // Round robin picker that tries to pick from high-rated pool first, then low-rated
  const chosen: Image[] = [];
  let idx = 0;

  while (chosen.length < headingCount && galleriesWithImages.some(g => g.high.length || g.low.length)) {
    const gallery = galleriesWithImages[idx % galleriesWithImages.length];
    let img: Image | undefined;

    if (gallery.high.length) {
      img = gallery.high.shift();
    } else if (gallery.low.length) {
      img = gallery.low.shift();
    }

    if (img && !excludeIds.has(img.id)) {
      chosen.push(img);
      excludeIds.add(img.id);
    }

    idx++;
    if (idx > headingCount * 10) break; // safety to prevent infinite loops
  }

  // Set href for each image
  return chosen.map(img => ({
    ...img,
    href: `${sectionPath}/i-${img.id}`,
  }));
}
