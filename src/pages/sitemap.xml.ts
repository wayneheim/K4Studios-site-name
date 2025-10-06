import type { APIRoute } from 'astro';
import { siteNav } from '../data/siteNav.ts';

const baseUrl = 'https://www.k4studios.com';
export const prerender = true;

// Recursively walk siteNav and collect all hrefs
function walkNav(nav, urls) {
  for (const entry of nav) {
    if (entry.href) {
      let url;
      if (/^https?:\/\//.test(entry.href)) {
        url = entry.href;
      } else {
        url = entry.href.startsWith('/') ? `${baseUrl}${entry.href}` : `${baseUrl}/${entry.href}`;
      }
      urls.add(url.replace(/\/+/g, '/').replace(':/', '://'));
    }
    if (entry.children) {
      walkNav(entry.children, urls);
    }
  }
}

// Recursively walk siteNav and collect all gallery-source hrefs
function walkGalleryNav(nav, galleryHrefs) {
  for (const entry of nav) {
    if (entry.type === 'gallery-source' && entry.href) {
      galleryHrefs.push(entry.href);
    }
    if (entry.children) {
      walkGalleryNav(entry.children, galleryHrefs);
    }
  }
}

export const GET: APIRoute = async () => {
  const urls = new Set();
  walkNav(siteNav, urls);

  // Collect all gallery-source hrefs
  const galleryHrefs = [];
  walkGalleryNav(siteNav, galleryHrefs);


  // For each gallery-source, try to import its .mjs file and add image links
  const galleryModules = import.meta.glob('/src/data/Galleries/**/*.mjs');
  // First, do all referenced by siteNav (for completeness)
  for (const href of galleryHrefs) {
    let relPath = href.replace(/^\//, '').replace(/\/$/, '');
    relPath = relPath.replace(/^Galleries\//, '');
    const possiblePaths = [
      `/src/data/Galleries/${relPath}.mjs`,
      `/src/data/Galleries/${relPath}/index.mjs`
    ];
    for (const path of possiblePaths) {
      if (galleryModules[path]) {
        try {
          const mod = await galleryModules[path]();
          const images = (mod as any).galleryData;
          if (Array.isArray(images)) {
            images.forEach((img) => {
              if (
                img.id &&
                /^i-[\w\d]+$/.test(img.id) &&
                img.id !== "i-k4studios"
              ) {
                urls.add(`${baseUrl}${href.replace(/^\//, '')}/${img.id}`.replace(/\/+/g, '/').replace(':/', '://'));
              }
            });
          }
        } catch (e) {}
        break;
      }
    }
  }

  // Now, walk all .mjs files in Galleries and add any i-xxx image links not already present
  for (const path in galleryModules) {
    try {
      const mod = await galleryModules[path]();
      const images = (mod as any).galleryData;
      // Derive gallery href from file path
      let galleryHref = path
        .replace('/src/data/Galleries', '')
        .replace(/\/index\.mjs$/, '')
        .replace(/\.mjs$/, '');
      // Ensure leading slash
      if (!galleryHref.startsWith('/')) galleryHref = '/' + galleryHref;
      for (const img of Array.isArray(images) ? images : []) {
        if (
          img.id &&
          /^i-[\w\d]+$/.test(img.id) &&
          img.id !== "i-k4studios"
        ) {
          urls.add(`${baseUrl}${galleryHref}/${img.id}`.replace(/\/+/g, '/').replace(':/', '://'));
        }
      }
    } catch (e) {}
  }

  const cleanUrls = Array.from(urls);
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
