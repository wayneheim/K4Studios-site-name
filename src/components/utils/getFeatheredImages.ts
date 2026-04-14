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

  // Map index to gallery path (fallback to sectionPath if missing)
  const galleryPathForIndex = (idx: number) => {
    const p = galleryPaths[idx];
    return p && p.startsWith('/') ? p : `${sectionPath}`;
  };

  const preparedPools = galleryDatas
    .map((data, idx) => ({
      index: idx,
      images: Array.isArray(data) ? data : [],
    }))
    .filter((pool) => pool.images.length > 0);

  if (preparedPools.length === 0) {
    return [];
  }

  const perGallery = Math.max(1, Math.ceil(poolSize / preparedPools.length));
  const poolQueues = preparedPools.map((pool) => {
    const picks = filterAndSort(pool.images, perGallery);
    picks.forEach((img) => excludeIds.add(img.id));
    return {
      index: pool.index,
      images: picks,
    };
  });

  const output: (Image & { __galleryIndex?: number })[] = [];
  while (output.length < poolSize && poolQueues.some((pool) => pool.images.length > 0)) {
    for (const pool of poolQueues) {
      if (output.length >= poolSize) break;
      const nextImage = pool.images.shift();
      if (!nextImage) continue;
      output.push({ ...nextImage, __galleryIndex: pool.index });
    }
  }

  return output.slice(0, poolSize).map((img) => {
    const idx = img.__galleryIndex ?? 0;
    const base = galleryPathForIndex(idx);
    const cleanId = img.id.startsWith('i-') ? img.id : `i-${img.id}`;
    return {
      ...img,
      href: `${base}/${cleanId}`.replace(/\/+/g, '/'),
    };
  });
}
