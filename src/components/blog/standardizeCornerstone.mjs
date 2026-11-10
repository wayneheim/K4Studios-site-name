import { parseFragment, serialize, serializeOuter } from 'parse5';

const classes = node => (node.attrs?.find(attr => attr.name === 'class')?.value || '').split(/\s+/);
const has = (node, name) => classes(node).includes(name);
const text = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('');
const html = nodes => nodes.map(serializeOuter).join('');
const meaningful = node => node.tagName || (node.nodeName === '#text' && node.value.trim());
const children = node => (node.childNodes || []).filter(meaningful);
const find = (node, tag) => node.tagName === tag ? node : (node.childNodes || []).map(child => find(child, tag)).find(Boolean);
const heading = node => node.tagName === 'h2' || ['section-heading-with-line', 'definition-post-heading'].some(name => has(node, name));
const sectionTitle = node => node?.tagName === 'h3' ? node : find(node, 'h2');
const artwork = node => ['aside', 'figure'].includes(node.tagName) && Boolean(find(node, 'img'));
const imageId = node => find(node, 'img')?.attrs?.find(attr => attr.name === 'src')?.value.match(/\/(i-[a-zA-Z0-9]+)(?:\/|$)/)?.[1];

// Flatten the old page-specific image/text wrappers before applying one layout.
function flatten(nodes) {
  return nodes.flatMap(node => {
    if (['painterly-focus-grid', 'painterly-focus-main', 'faq-block'].some(name => has(node, name))) return flatten(children(node));
    return [node];
  });
}

function accordion(nodes) {
  const result = [];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (node.tagName === 'h3' && text(node).trim().endsWith('?')) {
      const answer = [];
      while (index + 1 < nodes.length && !['h2', 'h3'].includes(nodes[index + 1].tagName) && !artwork(nodes[index + 1])) answer.push(nodes[++index]);
      result.push(`<details><summary>${html(children(node))}</summary><div class="cs-answer">${html(answer)}</div></details>`);
    } else if (node.tagName === 'div' && find(node, 'h3')) {
      result.push(`<div>${accordion(children(node))}</div>`);
    } else result.push(serializeOuter(node));
  }
  return result.join('');
}

// Artwork belongs to the essay. FAQ and closing navigation contain text and
// links only, including when an old page nests its samples inside wrappers.
function withoutSamples(nodes) {
  return nodes.filter(node => {
    if (artwork(node) || node.tagName === 'img') return false;
    if (node.childNodes) node.childNodes = withoutSamples(node.childNodes);
    if (node.tagName === 'a' && !text(node).trim()) return false;
    return true;
  });
}

export function standardizeCornerstone(source, reservedImageIds = [], faqItems = [], pagePath = '', essaySamples = [], artworkLinks = {}, imageOverrides = {}, galleryCrops = {}) {
  const fragment = parseFragment(source);
  const article = find(fragment, 'article');
  if (!article) return source;
  const groups = [];
  let inFaq = false;
  for (const node of flatten(children(article))) {
    const isHeading = heading(node) || (node.tagName === 'h3' && !inFaq);
    if (heading(node)) inFaq = /faq|frequently asked/i.test(text(node));
    if (!groups.length || isHeading) groups.push({ heading: isHeading ? node : null, nodes: [] });
    if (!isHeading) groups.at(-1).nodes.push(node);
  }
  if (faqItems.length && !groups.some(group => /faq|frequently asked/i.test(group.heading ? text(group.heading) : ''))) {
    const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', '@id': `https://www.k4studios.com${pagePath}#faq`, mainEntity: faqItems.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })) };
    const faq = parseFragment(`<div class="section-heading-with-line"><h2>Frequently Asked Questions</h2></div>${faqItems.map(item => `<details><summary>${escape(item.q)}</summary><p>${escape(item.a)}</p></details>`).join('')}<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`);
    const nodes = children(faq);
    const index = groups.findIndex(group => /^(explore|related|continue|further reading|next steps)\b/i.test(group.heading ? text(group.heading).trim() : ''));
    groups.splice(index < 0 ? groups.length : index, 0, { heading: nodes[0], nodes: nodes.slice(1) });
  }
  const usedImages = new Set(reservedImageIds);
  const deduplicateGallery = node => {
    if (['example-images', 'early-examples-grid'].some(name => has(node, name))) {
      node.childNodes = (node.childNodes || []).filter(child => {
        if (!artwork(child)) return true;
        const id = imageId(child);
        if (usedImages.has(id)) return false;
        usedImages.add(id);
        return true;
      });
    } else for (const child of node.childNodes || []) deduplicateGallery(child);
  };
  let closingStarted = false;
  const sections = groups.map(group => {
    const title = group.heading ? `<div class="cs-heading">${serializeOuter(sectionTitle(group.heading))}</div>` : '';
    const isFaq = /faq|frequently asked/i.test(group.heading ? text(group.heading) : '');
    if (isFaq || /^(explore|related|continue|further reading|next steps)\b/i.test(group.heading ? text(group.heading).trim() : '')) closingStarted = true;
    if (closingStarted) {
      const nodes = withoutSamples(group.nodes);
      return `<section class="cs-section cs-closing${isFaq ? ' cs-faq-section' : ''}">${title}${isFaq ? accordion(nodes) : html(nodes)}</section>`;
    }
    const candidates = group.nodes.filter(artwork).filter(node => !usedImages.has(imageId(node)));
    // Prefer the original editorial sample over an additional collection CTA.
    const art = candidates.find(node => !has(node, 'cornerstone-door')) || candidates[0];
    const prose = group.nodes.filter(node => !artwork(node));
    if (art) usedImages.add(imageId(art));
    for (const node of prose) deduplicateGallery(node);
    if (!art) return `<section class="cs-section">${title}${html(prose)}</section>`;
    const after = Number(art.attrs?.find(attr => attr.name === 'data-inline-after')?.value || 0);
    return `<section class="cs-section cs-illustrated">${title}<div class="cs-body">${html(prose.slice(0, after))}<div class="cs-art">${serializeOuter(art)}</div>${html(prose.slice(after))}</div></section>`;
  }).join('');
  // Retain the authored article attributes (including Astro's scoped styles).
  const classAttribute = article.attrs.find(attr => attr.name === 'class');
  if (classAttribute) classAttribute.value += ' cornerstone-standard';
  else article.attrs.push({ name: 'class', value: 'cornerstone-standard' });
  article.childNodes = parseFragment(sections).childNodes;
  // Restored samples are explicit page data. They never select or rewrite copy.
  const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  for (const sample of essaySamples) {
    const section = article.childNodes.find(node => has(node, 'cs-section') && text(node.childNodes.find(child => has(child, 'cs-heading')) || { childNodes: [] }).trim() === sample.heading);
    if (!section || has(section, 'cs-closing')) throw new Error(`Invalid essay sample slot ${pagePath}: ${sample.heading}`);
    const pictures = sample.items.map(item => {
      if (usedImages.has(item.id)) throw new Error(`Repeated restored artwork ${pagePath}: ${item.id}`);
      usedImages.add(item.id);
      return `<figure><a href="${escape(item.href)}"><img src="${escape(item.src)}" alt="${escape(item.alt)}" loading="lazy"></a></figure>`;
    }).join('');
    const prose = section.childNodes.filter(node => !has(node, 'cs-heading'));
    const headingNode = section.childNodes.find(node => has(node, 'cs-heading'));
    if (sample.mode === 'gallery') {
      section.childNodes = [...(headingNode ? [headingNode] : []), ...parseFragment(`<div class="cs-sample-gallery" style="--sample-columns:${sample.items.length}">${pictures}</div>${html(prose)}`).childNodes];
    } else {
      if (section.childNodes.some(node => has(node, 'cs-body'))) throw new Error(`Illustration slot already occupied: ${pagePath}: ${sample.heading}`);
      section.attrs.find(attr => attr.name === 'class').value += ' cs-illustrated';
      section.childNodes = [...(headingNode ? [headingNode] : []), ...parseFragment(`<div class="cs-body"><div class="cs-art">${pictures}</div>${html(prose)}</div>`).childNodes];
    }
  }
  const setAttribute = (node, name, value) => {
    const attribute = node.attrs.find(attr => attr.name === name);
    if (attribute) attribute.value = value;
    else node.attrs.push({ name, value });
  };
  const linkPieces = node => {
    if (node.tagName === 'a' && find(node, 'img')) {
      const id = imageId(node);
      const replacement = imageOverrides[id];
      if (replacement) {
        const img = find(node, 'img');
        setAttribute(img, 'src', replacement.src);
        setAttribute(img, 'alt', replacement.alt);
        if (replacement.captionTitle) {
          let card = node.parentNode;
          while (card && !['aside','figure'].includes(card.tagName)) card = card.parentNode;
          const updateTitle = child => {
            if (child.nodeName === '#text') child.value = child.value.replace(replacement.captionTitle.from, replacement.captionTitle.to);
            for (const nested of child.childNodes || []) updateTitle(nested);
          };
          if (card) updateTitle(card);
        }
      }
      const crop = galleryCrops[id];
      if (crop) {
        setAttribute(find(node, 'img'), 'style', `object-position:${crop}`);
        let parent = node.parentNode;
        while (parent && !has(parent, 'example-images')) parent = parent.parentNode;
        if (parent) setAttribute(parent, 'class', classes(parent).concat('cs-portrait-gallery').join(' '));
      }
      const href = replacement?.href || artworkLinks[id];
      if (href) {
        const attribute = node.attrs.find(attr => attr.name === 'href');
        if (attribute) attribute.value = href;
      }
    }
    for (const child of node.childNodes || []) linkPieces(child);
  };
  linkPieces(article);
  for (const child of article.childNodes) child.parentNode = article;
  return serialize(fragment);
}
