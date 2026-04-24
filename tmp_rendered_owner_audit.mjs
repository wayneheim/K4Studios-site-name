import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distRoot = path.join(root, 'dist');

const targets = [
  '/western-photos',
  '/western-artwork',
  '/historical-fine-art-photography-collection'
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

  p = p.split('#')[0].split('?')[0];
  return p.replace(/\/$/, '') || '/';
}

const htmlFiles = walk(distRoot);
const linksByTarget = new Map();
for (const t of targets) linksByTarget.set(t, []);

const anchorRe = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)')([^>]*)>([\s\S]*?)<\/a>/gi;

for (const file of htmlFiles) {
  const sourceRoute = routeFromDistHtml(file);
  if (!sourceRoute) continue;
  const html = fs.readFileSync(file, 'utf8');

  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const attrsPre = m[1] || '';
    const href = m[2] || m[3] || '';
    const attrsPost = m[4] || '';
    const inner = m[5] || '';
    const attrs = `${attrsPre} ${attrsPost}`;
    const target = normalizeInternalHref(href, sourceRoute);
    if (!target || !linksByTarget.has(target)) continue;

    const anchorText = stripTags(inner) || '(image/link without text)';
    const sourceType = /class\s*=\s*['"][^'"]*\bkw-link\b/i.test(attrs) ? 'auto-keyword-linker' : 'manual-structural';
    linksByTarget.get(target).push({ sourceRoute, anchorText, sourceType, hrefRaw: href });
  }
}

const rows = targets.map((target) => {
  const links = linksByTarget.get(target) || [];
  const manual = links.filter((l) => l.sourceType === 'manual-structural');
  const auto = links.filter((l) => l.sourceType === 'auto-keyword-linker');
  const uniqueSources = [...new Set(links.map((l) => l.sourceRoute))].sort();

  const bySource = new Map();
  for (const l of links) {
    const key = `${l.sourceRoute}||${l.sourceType}`;
    bySource.set(key, (bySource.get(key) || 0) + 1);
  }

  const byAnchor = new Map();
  for (const l of links) {
    const key = `${l.anchorText}||${l.sourceType}`;
    byAnchor.set(key, (byAnchor.get(key) || 0) + 1);
  }

  return {
    target,
    inboundTotal: links.length,
    inboundManualStructural: manual.length,
    inboundAutoKeywordLinker: auto.length,
    uniqueSourcePages: uniqueSources.length,
    crawlableWithoutJavaScript: links.length > 0 ? 'yes' : 'no',
    sourceBreakdown: [...bySource.entries()].sort((a,b)=>b[1]-a[1]).map(([k,c]) => {
      const [src, type] = k.split('||');
      return { sourcePage: src, sourceType: type, count: c };
    }),
    anchorBreakdown: [...byAnchor.entries()].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([k,c]) => {
      const [anchorText, sourceType] = k.split('||');
      return { anchorText, sourceType, count: c };
    })
  };
});

// Ownership drift check: exact anchor text "western photos" where does it point?
const westernPhotosTargets = new Map();
for (const file of htmlFiles) {
  const sourceRoute = routeFromDistHtml(file);
  if (!sourceRoute) continue;
  const html = fs.readFileSync(file, 'utf8');

  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[2] || m[3] || '';
    const inner = m[5] || '';
    const anchorText = stripTags(inner).toLowerCase();
    if (anchorText !== 'western photos') continue;
    const target = normalizeInternalHref(href, sourceRoute);
    if (!target) continue;
    westernPhotosTargets.set(target, (westernPhotosTargets.get(target) || 0) + 1);
  }
}

const result = {
  generatedAt: new Date().toISOString(),
  source: 'dist rendered HTML (no JS execution)',
  targets: rows,
  westernPhotosAnchorTargetCounts: [...westernPhotosTargets.entries()]
    .sort((a,b)=>b[1]-a[1])
    .map(([target, count]) => ({ target, count }))
};

fs.writeFileSync(path.join(root, 'rendered-owner-audit.json'), JSON.stringify(result, null, 2));

const header = 'Target,InboundTotal,InboundManualStructural,InboundAutoKeywordLinker,UniqueSourcePages,CrawlableWithoutJavaScript';
const csvRows = rows.map((r) => [
  r.target,
  String(r.inboundTotal),
  String(r.inboundManualStructural),
  String(r.inboundAutoKeywordLinker),
  String(r.uniqueSourcePages),
  r.crawlableWithoutJavaScript
].join(','));
fs.writeFileSync(path.join(root, 'rendered-owner-audit.csv'), [header, ...csvRows].join('\n'));

console.log('Wrote rendered-owner-audit.json and rendered-owner-audit.csv');
