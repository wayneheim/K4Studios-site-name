import type { APIRoute } from 'astro';
import { siteNav } from '../../data/siteNav';

const baseUrl = 'https://www.k4studios.com';

export const prerender = true;

function walkNav(nav: any[], urls: Set<string>) {
  for (const item of nav) {
    if (item.href) {
      urls.add(`${baseUrl}${item.href}`);
    }
    if (item.children) {
      walkNav(item.children, urls);
    }
  }
}

export const GET: APIRoute = async () => {
  const urls = new Set<string>();

  // Static root pages
  [
    '',
    '/Glossary',
    '/Contact'
  ].forEach((p) => urls.add(`${baseUrl}${p}`));

  // Recursively walk siteNav for all hrefs
  walkNav(siteNav, urls);

  // TODO: Optional — for any href with type === 'gallery-source', load the .mjs and extract image IDs

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset 
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls].map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
