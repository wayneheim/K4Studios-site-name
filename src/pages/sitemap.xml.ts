import type { APIRoute } from 'astro';

// 1. Live site domain
const baseUrl = 'https://www.k4studios.com';

export const prerender = true;

export const GET: APIRoute = async () => {
  const urls: string[] = [];

  // 2. Static top-level pages
  const staticPaths = [
    '',
    'Glossary',
    'Contact',
    'Galleries',
    'Galleries/Painterly-Fine-Art-Photography',
    'Galleries/Fine-Art-Photography'
  ];
  staticPaths.forEach((path) => {
    urls.push(`${baseUrl}/${path}`);
  });

  // 3. Dynamic gallery pages + image deep links
  const galleryModules = import.meta.glob('/src/data/galleries/**/*.mjs');

  for (const path in galleryModules) {
    const mod: any = await galleryModules[path]();
    const images = mod.default;

    // Strip the path and normalize it to URL format
    const galleryPath = path
      .replace('/src/data/galleries/', '')
      .replace('.mjs', '')
      .replace(/\/index$/, '')
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    const galleryUrl = `${baseUrl}/Galleries/${galleryPath}`;
    urls.push(galleryUrl);

    // For each image, generate its /i-xxxxx page
    if (Array.isArray(images)) {
      images.forEach((img) => {
        if (img.id && /^i-[\w\d]+$/.test(img.id)) {
          urls.push(`${baseUrl}/${img.id}`);
        }
      });
    }
  }

  // 4. Final cleanup: dedupe and remove blanks
  const cleanUrls = Array.from(new Set(urls.filter(Boolean)));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${cleanUrls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
