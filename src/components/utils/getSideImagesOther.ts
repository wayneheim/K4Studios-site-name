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

function getAllGallerySources(sectionPath: string): { label: string; href: string }[] {
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
  if (!node) {
    console.warn(`❌ No section node found for path: ${sectionPath}`);
    return [];
  }
  const sources = findGallerySourcesRecursive(node);
  console.log(`✅ Found ${sources.length} gallery sources under: ${sectionPath}`);
  return sources;
}

function shuffle<T>(arr: T[]): T[] {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
  const allGalleryData = import.meta.glob('../../data/Other/**/*.mjs', { eager: true });
  console.log(`📁 Globbed ${Object.keys(allGalleryData).length} files in /Other`);

  const grouped: { [parent: string]: any[] } = {};
  for (const gallery of galleryChildren) {
    const split = gallery.href.split('/');
    const parent = split.slice(0, -1).join('/') || 'root';
    if (!grouped[parent]) grouped[parent] = [];
    grouped[parent].push(gallery);
  }
  const groupArrs = shuffle(Object.values(grouped).map(gals => shuffle(gals)));

  const galleriesWithImages = groupArrs.map(group =>
    group.map(child => {
      const filePath = '../../data' + child.href + '.mjs';
      const fallbackPath = filePath.replace('../../', '../');
      const mod = allGalleryData[filePath] || allGalleryData[fallbackPath];
      if (!mod) {
        console.warn(`❓ No module found for: ${filePath}`);
        return { high: [], low: [] };
      }
      const allImages: Image[] = (mod.galleryData || mod.default || []).filter(
        (img: Image) => img.id && img.id !== 'i-k4studios' && !excludeIds.has(img.id)
      );
      console.log(`📦 ${filePath} → ${allImages.length} images`);
      const highRated = allImages.filter(img => (img.rating ?? 0) >= 4);
      const lowRated = allImages.filter(img => (img.rating ?? 0) < 4);
      return { high: shuffle(highRated), low: shuffle(lowRated) };
    })
  );

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

  return chosen.map(img => ({
    ...img,
    href: `${sectionPath}/${img.id}`,
  }));
}

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
  const allGalleryData = import.meta.glob('../../data/Other/**/*.mjs', { eager: true });

  const galleriesWithImages = shuffle(galleryChildren).map(child => {
    const filePath = '../../data' + child.href + '/Engrained-Series.mjs';
    const fallbackPath = filePath.replace('../../', '../');
    const mod = allGalleryData[filePath] || allGalleryData[fallbackPath];
    if (!mod) {
      console.warn(`❓ No module found for: ${filePath}`);
      return { high: [], low: [] };
    }
    const allImages: Image[] = (mod.galleryData || mod.default || []).filter(
      (img: Image) => img.id && img.id !== 'i-k4studios' && !excludeIds.has(img.id)
    );
    console.log(`📦 ${filePath} → ${allImages.length} images`);
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

export function getSideImagesOther({
  sectionPath,
  headingCount,
  excludeIds = new Set<string>(),
}: {
  sectionPath: string;
  headingCount: number;
  excludeIds?: Set<string>;
}): Image[] {
  console.log(`➡️ Starting getSideImagesOther for: ${sectionPath}`);
  const galleryChildren = getAllGallerySources(sectionPath);
  if (!galleryChildren.length) {
    console.warn(`❌ No gallery children found under: ${sectionPath}`);
    return [];
  }

  try {
    return galleryChildren.length > 7
      ? getSmartFeatheredImages({ galleryChildren, sectionPath, headingCount, excludeIds })
      : getClassicFeatheredImages({ galleryChildren, sectionPath, headingCount, excludeIds });
  } catch (err) {
    console.error("💥 Error in feathering logic:", err);
    return getClassicFeatheredImages({ galleryChildren, sectionPath, headingCount, excludeIds });
  }
}
