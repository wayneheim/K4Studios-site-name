import { decodeHTMLAttribute } from 'entities';

const pageTypes = new Set(['WebPage', 'CollectionPage', 'ProfilePage', 'Article', 'BlogPosting', 'ImageGallery', 'AboutPage']);

// Called only for the explicitly approved schema-sync routes, after rendering.
export function syncPageSchemaDescriptions(html, pathname = '/') {
  const meta = html.match(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/i)?.[0];
  const encoded = meta?.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  if (encoded === undefined) return html;
  const description = decodeHTMLAttribute(encoded);
  return html.replace(/(<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi, (script, open, json, close) => {
    let data;
    try { data = JSON.parse(json); } catch { return script; }
    let changed = false;
    function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      const identifier = typeof node.url === 'string' ? node.url : node['@id'];
      let ownPage = true;
      if (typeof identifier === 'string') {
        try { ownPage = (new URL(identifier, `https://www.k4studios.com${pathname}`).pathname.replace(/\/+$/, '') || '/') === (pathname.replace(/\/+$/, '') || '/'); } catch { ownPage = false; }
      }
      if (ownPage && typeof node.description === 'string' && [node['@type']].flat().some(type => pageTypes.has(type)) && node.description !== description) {
        node.description = description;
        changed = true;
      }
      Object.values(node).forEach(value => { if (value && typeof value === 'object') walk(value); });
    }
    walk(data);
    return changed ? open + JSON.stringify(data).replace(/</g, '\\u003c') + close : script;
  });
}
