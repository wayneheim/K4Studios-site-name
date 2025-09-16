import type { APIRoute } from 'astro';

// Your live site URL
const baseUrl = 'https://www.k4studios.com';

export const prerender = true;

export const GET: APIRoute = async () => {
  const urls: string[] = [];

  // --- 1. Static pages ---
  const staticPaths = [
    '',
    'Glossary',
    'Contact',
    'Galleries',
    'Galleries/Painterly-Fine-Art-Photography',
    'Galleries/Fine-Art-Photography'
  ];
  staticPaths.forEach(path => {
    urls.push(`${baseUrl}/${path}`);
  });

  // --- 2. Gallery landing pages and image IDs ---
  const galleryModules = import.meta.glob('../../data/galleries/**/*.mjs');

  for (const path in galleryModules) {
    const mod: any = await galleryModules[path]();
    const images = mod.default;

    // Build route from file path: e.g. ../../data/galleries/Facing-History/Civil-War-Color.mjs
    const route = path
      .replace('../../data/galleries/', '')
      .replace('.mjs', '')
      .replace(/\/index$/, '') // optional: strip index
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    const galleryUrl = `${baseUrl}/Galleries/${route}`;
    urls.push(galleryUrl);

    // Add each image ID as its own <url>
    if (Array.isArray(images)) {
      images.forEach((img) => {
        if (img.id && /^i-[\w\d]+$/.test(img.id)) {
          urls.push(`${baseUrl}/${img.id}`);
        }
      });
    }
  }

  // --- 3. Format as XML ---
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(url => `  <url><loc>${url}</loc></url>`)
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
