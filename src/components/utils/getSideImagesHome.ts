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

// --- HELPERS ---
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

function getAllGallerySourcesMulti(sectionPaths: string[]): { label: string, href: string }[] {
  function findNode(tree: any[], path: string): any {
    for (const node of tree) {
      if (node.href === path) return node;
      if (node.children) {
        const found = findNode(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }
  let all: any[] = [];
  for (const sectionPath of sectionPaths) {
    const node = findNode(siteNav, sectionPath);
    if (node) all = all.concat(findGallerySourcesRecursive(node));
  }
  return all;
}

// --- SHUFFLE ---
function shuffle<T>(arr: T[]): T[] {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- SMART FEATHER LOGIC FOR > 7 GALLERIES ---
function getSmartFeatheredImages({
  galleryChildren,
  sectionPath,
  headingCount,
  excludeIds = new Set<string>(),
}: {
  galleryChildren: any[];
  sectionPath: string;
  headingCount: number;
  excludeIds?: Set<string>;
}): Image[] {
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });

  // Group by direct parent
  const grouped: { [parent: string]: any[] } = {};
  for (const gallery of galleryChildren) {
    const split = gallery.href.split('/');
    const parent = split.slice(0, -1).join('/') || 'root';
    if (!grouped[parent]) grouped[parent] = [];
    grouped[parent].push(gallery);
  }
  const groupArrs = shuffle(Object.values(grouped).map(gals => shuffle(gals)));

  // Load images pools
  const galleriesWithImages = groupArrs.map(group =>
    group.map(child => {
      const filePath = '../../data' + child.href + '.mjs';
      const mod = allGalleryData[filePath];
      const allImages: Image[] = (mod?.galleryData || mod?.default || []).filter(
        (img: Image) => img.id && img.id !== 'i-k4studios' && !excludeIds.has(img.id)
      );
      const highRated = allImages.filter(img => (img.rating ?? 0) >= 4);
      const lowRated = allImages.filter(img => (img.rating ?? 0) < 4);
      return { high: shuffle(highRated), low: shuffle(lowRated) };
    })
  );

  // Round robin by group, feathering evenly!
  const chosen: Image[] = [];
  let idx = 0, inner = 0;
  while (chosen.length < headingCount && groupArrs.length && idx < headingCount * 20) {
    for (let g = 0; g < groupArrs.length && chosen.length < headingCount; g++) {
      const group = galleriesWithImages[g];
      if (!group.length) continue;
      const gallery = group[inner % group.length];
      let img: Image | undefined;
      if (gallery.high.length) img = gallery.high.shift();
      else if (gallery.low.length) img = gallery.low.shift();
      if (img && !excludeIds.has(img.id)) {
        chosen.push(img);
        excludeIds.add(img.id);
      }
    }
    inner++;
    idx++;
  }
  // Set href for each image
  return chosen.map(img => ({
    ...img,
    href: `${sectionPath}/${img.id}`,
  }));
}

// --- CLASSIC ROUND ROBIN (for 7 or fewer galleries) ---
function getClassicFeatheredImages({
  galleryChildren,
  sectionPath,
  headingCount,
  excludeIds = new Set<string>(),
}: {
  galleryChildren: any[];
  sectionPath: string;
  headingCount: number;
  excludeIds?: Set<string>;
}): Image[] {
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });
  const galleriesWithImages = shuffle(galleryChildren).map(child => {
    const filePath = '../../data' + child.href + '.mjs';
    const mod = allGalleryData[filePath];
    const allImages: Image[] = (mod?.galleryData || mod?.default || []).filter(
      (img: Image) => img.id && img.id !== 'i-k4studios' && !excludeIds.has(img.id)
    );
    const highRated = allImages.filter(img => (img.rating ?? 0) >= 4);
    const lowRated = allImages.filter(img => (img.rating ?? 0) < 4);
    return { high: shuffle(highRated), low: shuffle(lowRated) };
  });

  const chosen: Image[] = [];
  let idx = 0;
  while (chosen.length < headingCount && galleriesWithImages.some(g => g.high.length || g.low.length)) {
    const gallery = galleriesWithImages[idx % galleriesWithImages.length];
    let img: Image | undefined;
    if (gallery.high.length) img = gallery.high.shift();
    else if (gallery.low.length) img = gallery.low.shift();
    if (img && !excludeIds.has(img.id)) {
      chosen.push(img);
      excludeIds.add(img.id);
    }
    idx++;
    if (idx > headingCount * 10) break;
  }
  return chosen.map(img => ({
    ...img,
    href: `${sectionPath}/${img.id}`,
  }));
}

// --- MASTER HOMEPAGE EXPORT: pulls from both Painterly and Traditional
export function getSideImages({
  headingCount,
  excludeIds = new Set<string>(),
}: {
  headingCount: number;
  excludeIds?: Set<string>;
}): Image[] {
  // HOMEPAGE ONLY: Pull from both branches!
  const galleryChildren = getAllGallerySourcesMulti([
    "/Galleries/Painterly-Fine-Art-Photography",
    "/Galleries/Fine-Art-Photography"
  ]);
  if (!galleryChildren.length) return [];

  let featheredImages: Image[] = [];
  let slotsLeft = headingCount;

  // No special WCP override on homepage (unless you want it—then copy/paste your override here.)

  // LUCKY 7 THRESHOLD + FAILSAFE
  try {
    const moreImages =
      galleryChildren.length > 7
        ? getSmartFeatheredImages({
            galleryChildren,
            sectionPath: "/",
            headingCount: slotsLeft,
            excludeIds,
          })
        : getClassicFeatheredImages({
            galleryChildren,
            sectionPath: "/",
            headingCount: slotsLeft,
            excludeIds,
          });
    return [...featheredImages, ...moreImages];
  } catch (err) {
    // Failsafe fallback to classic!
    const moreImages = getClassicFeatheredImages({
      galleryChildren,
      sectionPath: "/",
      headingCount: slotsLeft,
      excludeIds,
    });
    return [...featheredImages, ...moreImages];
  }
}
