import { sitemap } from '../data/sitemap.ts';

const GHOST_IMAGE_PATH_RE = /\/i-k4studios(?:$|[/?#])/i;

export async function GET() {
  const urls = sitemap
  .filter(entry => !GHOST_IMAGE_PATH_RE.test(String(entry?.loc || '')))
  .map(entry => {
    const url = `<url>
  <loc>${entry.loc}</loc>
  ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
  ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ''}
  ${entry.priority ? `<priority>${entry.priority}</priority>` : ''}
</url>`;
    return url;
  }).join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}