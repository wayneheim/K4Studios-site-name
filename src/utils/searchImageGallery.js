import { parseFragment } from 'parse5';

// Describe actual server-rendered artwork, never logos or invented products.
export function buildSearchImageGallery(html, pageUrl, name) {
  const images = new Map();
  const walk = node => {
    const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
    if (['script', 'style', 'template', 'nav'].includes(node.tagName) || 'hidden' in attrs || attrs['aria-hidden'] === 'true') return;
    if (node.tagName === 'img') {
      const source = attrs.src || '';
      const match = source.match(/\/img\/(i-[A-Za-z0-9]+)\//);
      if (match && !images.has(match[1])) {
        const url = new URL(source, pageUrl);
        if (url.hostname === 'www.k4studios.com' || url.hostname === 'k4studios.com') {
          url.hostname = 'www.k4studios.com';
          url.pathname = url.pathname.replace(/(\/img\/i-[A-Za-z0-9]+\/)(s|m)(?=\/|\.|$)/, '$1l');
          images.set(match[1], { '@type': 'ImageObject', contentUrl: url.href, ...(attrs.alt ? { caption: attrs.alt } : {}) });
        }
      }
    }
    (node.childNodes || []).forEach(walk);
  };
  walk(parseFragment(html));
  if (images.size < 2) return null;
  const works = [...images.values()];
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ImageGallery', '@id': `${pageUrl}#search-images`, url: pageUrl, name,
      image: works, mainEntity: { '@id': `${pageUrl}#search-image-list` } },
    { '@type': 'ItemList', '@id': `${pageUrl}#search-image-list`, numberOfItems: works.length,
      itemListElement: works.map((item, index) => ({ '@type': 'ListItem', position: index + 1, item })) },
  ] };
}
