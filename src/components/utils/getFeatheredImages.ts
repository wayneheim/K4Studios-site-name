type Image = {
  id: string;
  rating?: number;
  title?: string;
  description?: string;
  alt?: string;
};

interface FeatherOptions {
  sectionPath: string;
  headingCount: number;
  excludeIds?: Set<string>;
  galleryDatas?: Image[][];
  galleryPaths?: string[]; // parallel array of gallery hrefs (children of section)
  minRating?: number;
  fallbackMin?: number;
  poolMultiplier?: number; // Return poolMultiplier × headingCount for client-side rotation (default: 1)
}

export function getFeatheredImages({
  sectionPath,
  headingCount,
  excludeIds = new Set<string>(),
  galleryDatas = [],
  galleryPaths = [],
  minRating = 4,
  fallbackMin = 3,
  poolMultiplier = 1,
}: FeatherOptions): Image[] {
  // Calculate total pool size for client-side rotation
  const poolSize = headingCount * poolMultiplier;
  
  function filterAndSort(data: Image[], count: number): Image[] {
    const strong = data.filter((img) => !excludeIds.has(img.id) && (img.rating ?? 0) >= minRating);
    const fallback = data.filter((img) => !excludeIds.has(img.id) && (img.rating ?? 0) >= fallbackMin);
    const all = data.filter((img) => !excludeIds.has(img.id));

    const source = strong.length >= count
      ? strong
      : fallback.length >= count
      ? fallback
      : all;

    return source.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  const half = Math.floor(headingCount / 2);
  const extra = headingCount % 2;

  const colorGallery = Array.isArray(galleryDatas[0]) ? galleryDatas[0] : [];
  const bwGallery    = Array.isArray(galleryDatas[1]) ? galleryDatas[1] : [];
  const naColorGallery = Array.isArray(galleryDatas[2]) ? galleryDatas[2] : [];

  // Map index to gallery path (fallback to sectionPath if missing)
  const galleryPathForIndex = (idx: number) => {
    const p = galleryPaths[idx];
    return p && p.startsWith('/') ? p : `${sectionPath}`;
  };

  // Distribute images evenly from all galleries (using poolSize for client rotation)
  const perGallery = Math.ceil(poolSize / 3);
  
  const colorImages = filterAndSort(colorGallery, perGallery);
  colorImages.forEach(img => excludeIds.add(img.id));

  const bwImages = filterAndSort(bwGallery, perGallery);
  bwImages.forEach(img => excludeIds.add(img.id));

  const naColorImages = filterAndSort(naColorGallery, perGallery);
  naColorImages.forEach(img => excludeIds.add(img.id));

  const output: (Image & { __galleryIndex?: number })[] = [];
  // Interleave images from all three galleries
  while (output.length < poolSize && (colorImages.length || bwImages.length || naColorImages.length)) {
    if (colorImages.length) output.push({ ...(colorImages.shift()!), __galleryIndex: 0 });
    if (bwImages.length && output.length < poolSize) output.push({ ...(bwImages.shift()!), __galleryIndex: 1 });
    if (naColorImages.length && output.length < poolSize) output.push({ ...(naColorImages.shift()!), __galleryIndex: 2 });
  }

  return output.slice(0, poolSize).map((img) => {
    const idx = img.__galleryIndex ?? 0;
    const base = galleryPathForIndex(idx);
    const cleanId = img.id.startsWith('i-') ? img.id : `i-${img.id}`;
    return {
      ...img,
      href: `${base}/${cleanId}`.replace(/\/+/, '/'),
    };
  });
}
