import fs from 'fs';
import path from 'path';

type Image = {
  id: string;
  rating?: number;
  title?: string;
  description?: string;
  alt?: string;
  href?: string;
};

interface StaticFeatherOptions {
  folder: string;
  headingCount: number;
  excludeIds?: Set<string>;
  minRating?: number;
  fallbackMin?: number;
}

function walkMjsFiles(baseDir: string): string[] {
  const results: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
        results.push(fullPath);
      }
    }
  }

  walk(baseDir);
  return results;
}

export async function getFeatheredImagesStatic({
  folder,
  headingCount,
  excludeIds = new Set<string>(),
  minRating = 4,
  fallbackMin = 3,
}: StaticFeatherOptions): Promise<Image[]> {
  // Ensure 'Galleries' casing and normalize folder path
  const cleanedFolder = folder.replace(/^\/?Galleries/, '');
  const basePath = path.resolve('src/data/Galleries' + cleanedFolder);

  const files = walkMjsFiles(basePath);

  const imagesByGallery = (
    await Promise.all(
      files.map(async (filePath) => {
        try {
          const normalizedPath = filePath.replace(/\\/g, '/'); // 🔥 Normalize for Windows
          const relPathRaw = normalizedPath.split('src/data/Galleries')[1];

          if (!relPathRaw) {
            console.warn('Invalid file path, skipping:', filePath);
            return null;
          }

          const relPath = relPathRaw
            .replace(/\.mjs$/, '')
            .replace(/\/index$/, '');

          const mod = await import(filePath);
          const images = mod.galleryData || mod.default || [];

          return {
            href: '/Galleries' + relPath,
            images,
          };
        } catch (err) {
          console.error('Failed to import:', filePath, err);
          return null;
        }
      })
    )
  ).filter(Boolean);

  const result: Image[] = [];

  const queues = imagesByGallery.map(gal =>
    gal!.images
      .filter(img => !excludeIds.has(img.id) && (img.rating ?? 0) >= minRating)
      .map(img => ({ ...img, href: `${gal!.href}/i-${img.id}` }))
  );

  let i = 0;
  while (result.length < headingCount && queues.some(q => q.length)) {
    const q = queues[i % queues.length];
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

  if (result.length < headingCount) {
    const fallbackQueues = imagesByGallery.map(gal =>
      gal!.images
        .filter(img =>
          !excludeIds.has(img.id) &&
          (img.rating ?? 0) >= fallbackMin &&
          (img.rating ?? 0) < minRating
        )
        .map(img => ({ ...img, href: `${gal!.href}/i-${img.id}` }))
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
