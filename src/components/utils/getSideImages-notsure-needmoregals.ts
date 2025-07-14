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

// Recursively get all gallery-source (.mjs) nodes
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

// Find node by href
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
  if (!node) return [];
  return findGallerySourcesRecursive(node);
}

// Shuffle helper
function shuffle<T>(arr: T[]): T[] {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Extract top-level grouping from href (after sectionPath)
function getGroupKey(childHref: string, sectionPath: string): string {
  const clean = childHref.replace(sectionPath, "").split("/").filter(Boolean);
  return clean.length > 0 ? clean[0] : "root";
}

// Main export
export function getSideImages({
  sectionPath,
  headingCount,
  excludeIds = new Set<string>(),
}: {
  sectionPath: string;
  headingCount: number;
  excludeIds?: Set<string>;
}): Image[] {
  const allGalleryData = import.meta.glob('../../data/Galleries/**/*.mjs', { eager: true });
  const allGalleries = getAllGallerySources(sectionPath);
  if (!allGalleries.length) return [];

  const chosen: Image[] = [];
  let slotsLeft = headingCount;

  // 🟤 STEP 1: WCP OVERRIDE
  const isPainterlyOrFacing =
    sectionPath === "/Galleries/Painterly-Fine-Art-Photography" ||
    sectionPath === "/Galleries/Painterly-Fine-Art-Photography/Facing-History";

  const wcpGalleries = allGalleries.filter(g =>
    g.href.includes("/Western-Cowboy-Portraits/")
  );

  if (isPainterlyOrFacing && wcpGalleries.length && slotsLeft > 0) {
    const wcpImages = wcpGalleries.flatMap(child => {
      const filePath = '../../data' + child.href + '.mjs';
      const mod = allGalleryData[filePath];
      return (mod?.galleryData || mod?.default || []).filter(
        (img: Image) => img.id && img.id !== 'i-k4studios' && !excludeIds.has(img.id)
      );
    });
    const highRated = wcpImages.filter(img => (img.rating ?? 0) >= 4);
    const pick = shuffle(highRated).pop() || shuffle(wcpImages).pop();
    if (pick) {
      chosen.push({ ...pick, href: `${sectionPath}/i-${pick.id}` });
      excludeIds.add(pick.id);
      slotsLeft--;
    }
  }

  // 🟤 STEP 2: Group galleries by first child after sectionPath
  const galleryChildrenNoWCP = allGalleries.filter(
    g => !g.href.includes("/Western-Cowboy-Portraits/")
  );

  const groups: Record<string, string[]> = {};
  for (const gallery of galleryChildrenNoWCP) {
    const key = getGroupKey(gallery.href, sectionPath);
    if (!groups[key]) groups[key] = [];
    groups[key].push(gallery.href);
  }

  // Convert to shuffled array of group entries
  const groupKeys = shuffle(Object.keys(groups));

  // Track which .mjs have already been used
  const usedMJS = new Set<string>();

  // 🟤 STEP 3: ROUND ROBIN — rotate groups, one pull per group per round
  while (slotsLeft > 0) {
    let pulledThisRound = 0;

    for (const group of groupKeys) {
      const galleryPool = shuffle(groups[group].filter(href => !usedMJS.has(href)));
      if (!galleryPool.length) continue;

      const pickedHref = galleryPool[0];
      const filePath = '../../data' + pickedHref + '.mjs';
      const mod = allGalleryData[filePath];

      const allImages: Image[] = (mod?.galleryData || mod?.default || []).filter(
        img => img.id && img.id !== 'i-k4studios' && !excludeIds.has(img.id)
      );
      const highRated = allImages.filter(img => (img.rating ?? 0) >= 4);
      const pick = shuffle(highRated).pop() || shuffle(allImages).pop();

      if (pick) {
        chosen.push({ ...pick, href: `${sectionPath}/i-${pick.id}` });
        excludeIds.add(pick.id);
        usedMJS.add(pickedHref);
        slotsLeft--;
        pulledThisRound++;
      }

      if (slotsLeft <= 0) break;
    }

    if (pulledThisRound === 0) break; // no more galleries to pull from
  }

  return chosen;
}
