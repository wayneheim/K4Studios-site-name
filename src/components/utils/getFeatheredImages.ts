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
  minRating?: number;
  fallbackMin?: number;
}

export function getFeatheredImages({
  sectionPath,
  headingCount,
  excludeIds = new Set<string>(),
  galleryDatas = [],
  minRating = 4,
  fallbackMin = 3,
}: FeatherOptions): Image[] {
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

  const colorImages = filterAndSort(colorGallery, half + extra);
  colorImages.forEach(img => excludeIds.add(img.id));

  const bwImages = filterAndSort(bwGallery, half);
  bwImages.forEach(img => excludeIds.add(img.id));

  const output: Image[] = [];

  for (let i = 0; i < headingCount; i++) {
    if (i % 2 === 0 && colorImages.length) {
      output.push(colorImages.shift()!);
    } else if (bwImages.length) {
      output.push(bwImages.shift()!);
    } else if (colorImages.length) {
      output.push(colorImages.shift()!);
    }
  }

  return output.map((img) => ({
    ...img,
    href: `${sectionPath}/i-${img.id}`,
  }));
}
