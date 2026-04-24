import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distRoot = path.join(root, 'dist');
const base = 'https://www.k4studios.com';

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
      const b = sourceRoute === '/' ? `${base}/` : `${base}${sourceRoute}/`;
      const u = new URL(raw, b);
      if (!/k4studios\.com$/i.test(u.hostname)) return null;
      p = u.pathname;
    } catch {
      return null;
    }
  }

  p = p.split('#')[0].split('?')[0];
  return p.replace(/\/$/, '') || '/';
}

async function fetchText(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; K4-Live-Owner-Audit/1.0; +https://www.k4studios.com)'
    }
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, url: res.url, text };
}

const htmlFiles = walk(distRoot);
const routes = htmlFiles.map(routeFromDistHtml).filter(Boolean);

const pageHtmlByRoute = new Map();
const fetchErrors = [];

const concurrency = 8;
let idx = 0;

async function worker() {
  while (idx < routes.length) {
    const i = idx++;
    const route = routes[i];
    const url = `${base}${route === '/' ? '' : route}`;
    try {
      const r = await fetchText(url);
      pageHtmlByRoute.set(route, r);
      if (!r.ok) {
        fetchErrors.push({ route, status: r.status, finalUrl: r.url });
      }
    } catch (e) {
      fetchErrors.push({ route, status: 'ERR', error: String(e) });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

const linksByTarget = new Map();
for (const t of targets) linksByTarget.set(t, []);

const anchorRe = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)')([^>]*)>([\s\S]*?)<\/a>/gi;

for (const route of routes) {
  const packet = pageHtmlByRoute.get(route);
  if (!packet || !packet.text) continue;
  const html = packet.text;

  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const attrsPre = m[1] || '';
    const href = m[2] || m[3] || '';
    const attrsPost = m[4] || '';
    const inner = m[5] || '';
    const attrs = `${attrsPre} ${attrsPost}`;

    const target = normalizeInternalHref(href, route);
    if (!target || !linksByTarget.has(target)) continue;

    const anchorText = stripTags(inner) || '(image/link without text)';
    const sourceType = /class\s*=\s*['"][^'"]*\bkw-link\b/i.test(attrs) ? 'auto-keyword-linker' : 'manual-structural';

    linksByTarget.get(target).push({
      sourceRoute: route,
      sourceType,
      hrefRaw: href,
      anchorText,
      rawHtmlVisible: true
    });
  }
}

const targetCanonical = {};
for (const t of targets) {
  const packet = pageHtmlByRoute.get(t);
  const html = packet?.text || '';
  const canonicalMatch = html.match(/<link\s+[^>]*rel\s*=\s*["']canonical["'][^>]*>/i);
  let canonicalHref = null;
  if (canonicalMatch) {
    const tag = canonicalMatch[0];
    const hrefMatch = tag.match(/href\s*=\s*(?:"([^"]+)"|'([^']+)')/i);
    canonicalHref = hrefMatch ? (hrefMatch[1] || hrefMatch[2] || null) : null;
  }

  let normalizedCanonicalPath = null;
  if (canonicalHref) {
    try {
      const u = canonicalHref.startsWith('http') ? new URL(canonicalHref) : new URL(canonicalHref, base);
      normalizedCanonicalPath = (u.pathname || '/').replace(/\/$/, '') || '/';
    } catch {
      normalizedCanonicalPath = null;
    }
  }

  targetCanonical[t] = {
    canonicalHref,
    normalizedCanonicalPath,
    selfReferential: normalizedCanonicalPath === t
  };
}

const rows = targets.map((target) => {
  const links = linksByTarget.get(target) || [];
  const manual = links.filter((l) => l.sourceType === 'manual-structural');
  const auto = links.filter((l) => l.sourceType === 'auto-keyword-linker');
  const uniqueSources = [...new Set(links.map((l) => l.sourceRoute))].sort();

  return {
    target,
    inboundTotal: links.length,
    inboundManualStructural: manual.length,
    inboundAutoKeywordLinker: auto.length,
    uniqueSourcePages: uniqueSources.length,
    allVisibleInRawHtmlNoJs: links.every((l) => l.rawHtmlVisible === true),
    sourcePages: uniqueSources
  };
});

const westernPhotosAnchorTargetCounts = new Map();
let westernPhotosAnchorsTotal = 0;

for (const route of routes) {
  const packet = pageHtmlByRoute.get(route);
  if (!packet || !packet.text) continue;
  const html = packet.text;

  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[2] || m[3] || '';
    const inner = m[5] || '';
    const anchorText = stripTags(inner).toLowerCase();
    if (anchorText !== 'western photos') continue;
    westernPhotosAnchorsTotal += 1;
    const target = normalizeInternalHref(href, route);
    if (!target) continue;
    westernPhotosAnchorTargetCounts.set(target, (westernPhotosAnchorTargetCounts.get(target) || 0) + 1);
  }
}

let dist = null;
try {
  dist = JSON.parse(fs.readFileSync(path.join(root, 'rendered-owner-audit.json'), 'utf8'));
} catch {
  dist = null;
}

let mismatch = null;
if (dist && Array.isArray(dist.targets)) {
  const distMap = new Map(dist.targets.map((d) => [d.target, d]));
  mismatch = rows.map((live) => {
    const d = distMap.get(live.target);
    if (!d) return { target: live.target, missingInDist: true };
    return {
      target: live.target,
      distInboundTotal: d.inboundTotal,
      liveInboundTotal: live.inboundTotal,
      distManual: d.inboundManualStructural,
      liveManual: live.inboundManualStructural,
      distAuto: d.inboundAutoKeywordLinker,
      liveAuto: live.inboundAutoKeywordLinker,
      totalsMatch: d.inboundTotal === live.inboundTotal,
      splitMatch: d.inboundManualStructural === live.inboundManualStructural && d.inboundAutoKeywordLinker === live.inboundAutoKeywordLinker
    };
  });
}

const result = {
  generatedAt: new Date().toISOString(),
  base,
  scannedRouteCount: routes.length,
  fetchErrorsCount: fetchErrors.length,
  fetchErrors: fetchErrors.slice(0, 50),
  targets: rows,
  targetCanonical,
  westernPhotosAnchorsTotal,
  westernPhotosAnchorTargetCounts: [...westernPhotosAnchorTargetCounts.entries()].sort((a, b) => b[1] - a[1]).map(([target, count]) => ({ target, count })),
  distLiveMismatch: mismatch
};

fs.writeFileSync(path.join(root, 'live-owner-audit.json'), JSON.stringify(result, null, 2));

console.log(`Scanned routes: ${routes.length}`);
console.log(`Fetch errors: ${fetchErrors.length}`);
console.log('Wrote live-owner-audit.json');
