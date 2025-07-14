import { siteNav } from '../../data/siteNav';

// Load all gallery data files
const modules = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });

// Normalize into { [href]: images[] }
const galleryDataMap: Record<string, any[]> = {};
for (const [path, mod] of Object.entries(modules)) {
 const relative = path.split('/data/Galleries')[1]?.replace(/\.mjs$/, '')?.replace(/\\/g, '/');
if (!relative) continue;
const href = `/Galleries${relative}`;
galleryDataMap[href] = mod.galleryData || mod.default || [];
}

// Find a nav node by matching href
function findNavNode(tree: any[], href: string): any | null {
  for (const node of tree) {
    if (node.href === href) return node;
    if (node.children) {
      const found = findNavNode(node.children, href);
      if (found) return found;
    }
  }
  return null;
}

// Recursively collect all gallery-source hrefs from nav tree
function collectGalleryHrefs(node: any): string[] {
  let hrefs: string[] = [];
  if (node.type === 'gallery-source') {
    hrefs.push(node.href);
  }
  if (node.children) {
    for (const child of node.children) {
      hrefs = hrefs.concat(collectGalleryHrefs(child));
    }
  }
  return hrefs;
}

type Image = {
  id: string;
  rating?: number;
  title?: string;
  description?: string;
  alt?: string;
  href?: string;
};

interface Options {
  sectionPath: string;
  headingCount: number;
  excludeIds?: Set<string>;
  minRating?: number;
  fallbackMin?: number;
}

export function getCuratedFeatheredImages({
  sectionPath,
  headingCount,
  excludeIds = new Set<string>(),
  minRating = 4,
  fallbackMin = 3,
}: Options): Image[] {
  const navRoot = findNavNode(siteNav, sectionPath);
  if (!navRoot) return [];

  const galleryHrefs = collectGalleryHrefs(navRoot);
  if (!galleryHrefs.length) return [];

  const galleries = galleryHrefs.map(href => ({
    href,
    images: galleryDataMap[href] || []
  }));

  const result: Image[] = [];
  const galleryQueues = galleries.map(gal =>
    gal.images
      .filter(img => !excludeIds.has(img.id) && (img.rating ?? 0) >= minRating)
      .map(img => ({ ...img, href: `${gal.href}/i-${img.id}` }))
  );

  let i = 0;
  while (result.length < headingCount && galleryQueues.some(q => q.length)) {
    const q = galleryQueues[i % galleryQueues.length];
    if (q?.length) {
      const img = q.shift()!;
      if (!excludeIds.has(img.id)) {
        excludeIds.add(img.id);
        result.push(img);
      }
    }
    i++;
    if (i > 5000) break;
  }

  // Fallback to lower-rated
  if (result.length < headingCount) {
    const fallbackQueues = galleries.map(gal =>
      gal.images
        .filter(img =>
          !excludeIds.has(img.id) &&
          (img.rating ?? 0) >= fallbackMin &&
          (img.rating ?? 0) < minRating
        )
        .map(img => ({ ...img, href: `${gal.href}/i-${img.id}` }))
    );
    let j = 0;
    while (result.length < headingCount && fallbackQueues.some(q => q.length)) {
      const q = fallbackQueues[j % fallbackQueues.length];
      if (q?.length) {
        const img = q.shift()!;
        if (!excludeIds.has(img.id)) {
          excludeIds.add(img.id);
          result.push(img);
        }
      }
      j++;
      if (j > 5000) break;
    }
  }

  return result.sort(() => Math.random() - 0.5).slice(0, headingCount);
}
