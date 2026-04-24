import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distRoot = path.join(root, 'dist');

const zeroLinkPages = [
  '/Fine-Art-Photography-of-the-American-West',
  '/Western-Wall-Art',
  '/Modern-Western-Interior-Design-Art',
  '/Western-Interior-Design-Art',
  '/Western-Wall-Art-for-Interior-Designers',
  '/Rustic-Western-Interior-Design-Art',
  '/western-photos',
  '/western-portrait-photography',
  '/old-western-art',
  '/western-art-photography',
  '/western-artwork',
  '/historical-fine-art-photography-collection',
  '/western-fine-art-photography-collection'
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith('.html')) out.push(full);
  }
  return out;
}

function routeFromDistHtml(filePath) {
  const rel = path.relative(distRoot, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -('/index.html'.length));
  if (rel.endsWith('.html')) return '/' + rel.slice(0, -('.html'.length));
  return null;
}

function stripTags(input) {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeInternalHref(href, sourceRoute) {
  if (!href) return null;
  const raw = href.trim();
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return null;

  let p = null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const u = new URL(raw);
      if (!/k4studios\.com$/i.test(u.hostname)) return null;
      p = u.pathname;
    } catch {
      return null;
    }
  } else if (raw.startsWith('/')) {
    p = raw;
  } else {
    try {
      const base = sourceRoute === '/' ? 'https://www.k4studios.com/' : `https://www.k4studios.com${sourceRoute}/`;
      const u = new URL(raw, base);
      p = u.pathname;
    } catch {
      return null;
    }
  }

  if (!p) return null;
  p = p.split('#')[0].split('?')[0];
  if (!p) return null;
  return p.replace(/\/$/, '') || '/';
}

const htmlFiles = walk(distRoot);
const inboundMap = new Map();
for (const p of zeroLinkPages) inboundMap.set(p, []);

const linkRe = /<a\b[^>]*?href\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi;

for (const file of htmlFiles) {
  const sourceRoute = routeFromDistHtml(file);
  if (!sourceRoute) continue;
  const html = fs.readFileSync(file, 'utf8');

  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1] || m[2] || '';
    const text = stripTags(m[3] || '') || '(image/link without text)';
    const target = normalizeInternalHref(href, sourceRoute);
    if (!target || !inboundMap.has(target)) continue;
    inboundMap.get(target).push({ sourceRoute, target, href, anchorText: text });
  }
}

const rows = zeroLinkPages.map((page) => {
  const links = inboundMap.get(page) || [];
  const sources = [...new Set(links.map((x) => x.sourceRoute))].sort();

  const byAnchor = new Map();
  for (const l of links) {
    const k = l.anchorText;
    byAnchor.set(k, (byAnchor.get(k) || 0) + 1);
  }
  const anchors = [...byAnchor.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([text, count]) => ({ text, count }));

  return {
    page,
    inboundRenderedCount: links.length,
    uniqueInboundRenderedPages: sources.length,
    classification: links.length === 0 ? 'truly zero inbound links in rendered raw HTML' : 'zero only in static page-file extraction (rendered HTML has inbound links)',
    renderedSources: sources,
    crawlableWithoutJavaScript: links.length === 0 ? 'no rendered inbound links found' : 'yes',
    anchorTextUsed: anchors
  };
});

const outJson = {
  generatedAt: new Date().toISOString(),
  source: 'dist rendered HTML (no JS execution)',
  totalPagesChecked: rows.length,
  rows
};

fs.writeFileSync(path.join(root, 'rendered-zero-link-audit.json'), JSON.stringify(outJson, null, 2));

const header = 'Page,InboundRenderedCount,UniqueInboundRenderedPages,Classification,CrawlableWithoutJavaScript,RenderedSources,AnchorTextUsed';
const csvRows = rows.map((r) => {
  const sources = r.renderedSources.join(' | ');
  const anchors = r.anchorTextUsed.map((a) => `${a.text} (${a.count})`).join(' | ');
  const vals = [
    r.page,
    String(r.inboundRenderedCount),
    String(r.uniqueInboundRenderedPages),
    r.classification,
    r.crawlableWithoutJavaScript,
    sources,
    anchors
  ];
  return vals.map((v) => {
    if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  }).join(',');
});

fs.writeFileSync(path.join(root, 'rendered-zero-link-audit.csv'), [header, ...csvRows].join('\n'));
console.log('Wrote rendered-zero-link-audit.json and rendered-zero-link-audit.csv');
