import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagesRoot = path.join(root, 'src', 'pages');

const commercialPages = [
  '/American-Western-Art',
  '/Contemporary-Western-Art',
  '/Cowboy-Fine-Art-Photography',
  '/Fine-Art-Photography-of-the-American-West',
  '/Historical-Western-Art',
  '/Narrative-Western-Art',
  '/Painterly-Western-Photography',
  '/Western-Cowboy-Photography',
  '/Western-Fine-Art-Photography',
  '/Western-Frontier-Art',
  '/Western-Photography-Art',
  '/Western-Wall-Art',
  '/Modern-Western-Interior-Design-Art',
  '/Western-Interior-Design-Art',
  '/Western-Wall-Art-for-Interior-Designers',
  '/Rustic-Western-Interior-Design-Art',
  '/Western-Black-and-White-Photography',
  '/western-landscape-art',
  '/western-photos',
  '/western-portrait-photography',
  '/old-western-art',
  '/vintage-western-art',
  '/western-art-photography',
  '/western-artwork',
  '/Western-Photography-Prints',
  '/historical-fine-art-photography-collection',
  '/western-fine-art-photography-collection',
  '/cinematic-western-art',
  '/cowboy-art-prints',
  '/western-storytelling-photography'
];

const targetKeyword = {
  '/American-Western-Art': 'american western art',
  '/Contemporary-Western-Art': 'contemporary western art',
  '/Cowboy-Fine-Art-Photography': 'cowboy fine art photography',
  '/Fine-Art-Photography-of-the-American-West': 'fine art photography american west',
  '/Historical-Western-Art': 'historical western art',
  '/Narrative-Western-Art': 'narrative western art',
  '/Painterly-Western-Photography': 'painterly western photography',
  '/Western-Cowboy-Photography': 'western cowboy photography',
  '/Western-Fine-Art-Photography': 'western fine art photography',
  '/Western-Frontier-Art': 'western frontier art',
  '/Western-Photography-Art': 'western photography art',
  '/Western-Wall-Art': 'western wall art',
  '/Modern-Western-Interior-Design-Art': 'modern western interior design art',
  '/Western-Interior-Design-Art': 'western interior design art',
  '/Western-Wall-Art-for-Interior-Designers': 'western wall art for interior designers',
  '/Rustic-Western-Interior-Design-Art': 'rustic western interior design art',
  '/Western-Black-and-White-Photography': 'western black and white photography',
  '/western-landscape-art': 'western landscape art',
  '/western-photos': 'western photos',
  '/western-portrait-photography': 'western portrait photography',
  '/old-western-art': 'old western art',
  '/vintage-western-art': 'vintage western art',
  '/western-art-photography': 'western art photography',
  '/western-artwork': 'western artwork',
  '/Western-Photography-Prints': 'western photography prints',
  '/historical-fine-art-photography-collection': 'historical fine art photography collection',
  '/western-fine-art-photography-collection': 'western fine art photography collection',
  '/cinematic-western-art': 'cinematic western art',
  '/cowboy-art-prints': 'cowboy art prints',
  '/western-storytelling-photography': 'western storytelling photography'
};

const clusterByPage = {
  '/Western-Photography-Art': 'western-photography',
  '/western-art-photography': 'western-photography',
  '/western-photos': 'western-photography',
  '/Western-Photography-Prints': 'western-photography',

  '/Western-Wall-Art': 'interior-wall-art',
  '/Western-Interior-Design-Art': 'interior-wall-art',
  '/Modern-Western-Interior-Design-Art': 'interior-wall-art',
  '/Rustic-Western-Interior-Design-Art': 'interior-wall-art',
  '/Western-Wall-Art-for-Interior-Designers': 'interior-wall-art',

  '/vintage-western-art': 'old-vintage',
  '/old-western-art': 'old-vintage',

  '/Narrative-Western-Art': 'narrative',
  '/western-storytelling-photography': 'narrative',
  '/cinematic-western-art': 'narrative',

  '/Western-Fine-Art-Photography': 'core-western-art',
  '/Cowboy-Fine-Art-Photography': 'core-western-art',
  '/western-artwork': 'core-western-art',
  '/Western-Cowboy-Photography': 'core-western-art',
  '/American-Western-Art': 'core-western-art',
  '/Contemporary-Western-Art': 'core-western-art',
  '/Historical-Western-Art': 'core-western-art',
  '/Western-Frontier-Art': 'core-western-art',
  '/Painterly-Western-Photography': 'core-western-art',
  '/Fine-Art-Photography-of-the-American-West': 'core-western-art',
  '/Western-Black-and-White-Photography': 'core-western-art',
  '/western-landscape-art': 'core-western-art',
  '/western-portrait-photography': 'core-western-art',
  '/historical-fine-art-photography-collection': 'core-western-art',
  '/western-fine-art-photography-collection': 'core-western-art',
  '/cowboy-art-prints': 'core-western-art'
};

const clusterOwner = {
  'western-photography': '/Western-Photography-Art',
  'interior-wall-art': '/Western-Wall-Art',
  'old-vintage': '/vintage-western-art',
  'narrative': '/Narrative-Western-Art',
  'core-western-art': null
};

const pageRole = {
  '/Western-Wall-Art': 'hub',
  '/Western-Photography-Art': 'hub',
  '/Narrative-Western-Art': 'hub',
  '/Western-Fine-Art-Photography': 'hub',
  '/Western-Cowboy-Photography': 'hub',
  '/American-Western-Art': 'hub',
  '/Contemporary-Western-Art': 'hub',
  '/Historical-Western-Art': 'hub',
  '/Western-Frontier-Art': 'hub',
  '/Fine-Art-Photography-of-the-American-West': 'hub',

  '/Western-Interior-Design-Art': 'buyer page',
  '/Modern-Western-Interior-Design-Art': 'buyer page',
  '/Rustic-Western-Interior-Design-Art': 'buyer page',
  '/Western-Wall-Art-for-Interior-Designers': 'buyer page',
  '/Western-Photography-Prints': 'buyer page',
  '/cowboy-art-prints': 'buyer page',

  '/cinematic-western-art': 'editorial bridge',
  '/western-storytelling-photography': 'editorial bridge',

  '/Cowboy-Fine-Art-Photography': 'spoke',
  '/Painterly-Western-Photography': 'spoke',
  '/Western-Black-and-White-Photography': 'spoke',
  '/western-landscape-art': 'spoke',
  '/western-portrait-photography': 'spoke',
  '/western-photos': 'spoke',
  '/old-western-art': 'spoke',
  '/vintage-western-art': 'spoke',
  '/western-art-photography': 'spoke',
  '/western-artwork': 'spoke',
  '/historical-fine-art-photography-collection': 'spoke',
  '/western-fine-art-photography-collection': 'spoke'
};

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith('.astro')) out.push(full);
  }
  return out;
}

function toRoute(filePath) {
  const rel = path.relative(pagesRoot, filePath).replace(/\\/g, '/');
  if (rel.includes('/admin/') || rel.startsWith('admin/')) return null;
  if (rel.includes('[')) return null;
  if (rel === 'index.astro') return '/';
  if (rel.endsWith('/index.astro')) return '/' + rel.slice(0, -('/index.astro'.length));
  if (rel.endsWith('.astro')) return '/' + rel.slice(0, -('.astro'.length));
  return null;
}

function normalizeTarget(href, sourceRoute) {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('javascript:')) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      if (!/k4studios\.com$/i.test(u.hostname)) return null;
      return u.pathname.replace(/\/$/, '') || '/';
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith('/')) return trimmed.replace(/\/$/, '') || '/';
  if (trimmed.startsWith('./') || trimmed.startsWith('../') || /^[A-Za-z0-9].*/.test(trimmed)) {
    const baseDir = sourceRoute === '/' ? '/' : sourceRoute + '/';
    try {
      const u = new URL(trimmed, 'https://www.k4studios.com' + baseDir);
      return u.pathname.replace(/\/$/, '') || '/';
    } catch {
      return null;
    }
  }
  return null;
}

function stripTags(input) {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const astroFiles = walk(pagesRoot);
const inbound = new Map();
for (const page of commercialPages) inbound.set(page, []);

const linkRe = /<a\b[^>]*?href\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi;

for (const file of astroFiles) {
  const sourceRoute = toRoute(file);
  if (!sourceRoute) continue;
  const text = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    const href = m[1] || m[2] || '';
    const anchorTextRaw = m[3] || '';
    const anchorText = stripTags(anchorTextRaw).slice(0, 140);
    const target = normalizeTarget(href, sourceRoute);
    if (!target || !inbound.has(target)) continue;
    inbound.get(target).push({
      sourceRoute,
      href,
      anchorText: anchorText || '(image/link without text)'
    });
  }
}

function topReferrers(rows, limit = 5) {
  const bySource = new Map();
  for (const row of rows) {
    bySource.set(row.sourceRoute, (bySource.get(row.sourceRoute) || 0) + 1);
  }
  return [...bySource.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([route, count]) => `${route} (${count})`)
    .join('; ');
}

function topAnchors(rows, limit = 8) {
  const byAnchor = new Map();
  for (const row of rows) {
    const key = row.anchorText.toLowerCase();
    byAnchor.set(key, { text: row.anchorText, count: (byAnchor.get(key)?.count || 0) + 1 });
  }
  return [...byAnchor.values()]
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
    .slice(0, limit)
    .map((x) => `${x.text} (${x.count})`)
    .join('; ');
}

function supportingUrlsFor(page) {
  const cluster = clusterByPage[page];
  if (!cluster) return [];
  const all = commercialPages.filter((p) => clusterByPage[p] === cluster && p !== page);
  return all;
}

function ownerFor(page) {
  const cluster = clusterByPage[page];
  if (!cluster) return page;
  const owner = clusterOwner[cluster];
  if (!owner) return page;
  return owner;
}

function shouldLinkBackTo(page) {
  const cluster = clusterByPage[page];
  if (!cluster) return [];
  const owner = ownerFor(page);
  const peers = commercialPages.filter((p) => clusterByPage[p] === cluster && p !== page);
  const must = new Set();
  if (owner !== page) must.add(owner);
  for (const peer of peers.slice(0, 3)) must.add(peer);
  return [...must].slice(0, 4);
}

const rows = commercialPages.map((page) => {
  const links = inbound.get(page) || [];
  const owner = ownerFor(page);
  return {
    page,
    targetKeyword: targetKeyword[page] || page.slice(1).replace(/-/g, ' '),
    primaryOwningUrl: owner,
    supportingUrls: supportingUrlsFor(page).join(' | '),
    strongestInboundLinks: topReferrers(links),
    anchorTextUsed: topAnchors(links),
    shouldLinkBackTo: shouldLinkBackTo(page).join(' | '),
    role: pageRole[page] || 'spoke',
    inboundLinkCount: links.length
  };
});

const header = [
  'Page',
  'TargetKeyword',
  'PrimaryOwningUrl',
  'SupportingUrls',
  'StrongestInternalLinksPointingToIt',
  'AnchorTextUsed',
  'PagesItShouldLinkBackTo',
  'Role',
  'InboundLinkCount'
];

function esc(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

const csv = [header.join(','), ...rows.map((r) => [
  r.page,
  r.targetKeyword,
  r.primaryOwningUrl,
  r.supportingUrls,
  r.strongestInboundLinks,
  r.anchorTextUsed,
  r.shouldLinkBackTo,
  r.role,
  r.inboundLinkCount
].map(esc).join(','))].join('\n');

fs.writeFileSync(path.join(root, 'internal-link-ownership-audit.csv'), csv);

const weak = rows.filter((r) => r.inboundLinkCount <= 1).map((r) => r.page);
const none = rows.filter((r) => r.inboundLinkCount === 0).map((r) => r.page);

const summary = {
  totalCommercialPages: rows.length,
  pagesWithNoMeasuredInboundLinks: none,
  pagesWith0to1InboundLinks: weak,
  topLinkedPages: rows
    .slice()
    .sort((a, b) => b.inboundLinkCount - a.inboundLinkCount)
    .slice(0, 10)
    .map((r) => ({ page: r.page, inboundLinkCount: r.inboundLinkCount })),
  owners: rows
    .filter((r) => r.primaryOwningUrl === r.page)
    .map((r) => r.page)
};

fs.writeFileSync(path.join(root, 'internal-link-ownership-summary.json'), JSON.stringify(summary, null, 2));
console.log('Wrote internal-link-ownership-audit.csv and internal-link-ownership-summary.json');
