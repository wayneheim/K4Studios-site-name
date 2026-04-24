import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distRoot = path.join(root, 'dist');
const base = 'https://www.k4studios.com';

const targets = [
  '/western-photos',
  '/western-art-photography',
  '/Western-Photography-Art',
  '/Western-Photography-Prints'
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
      const baseUrl = sourceRoute === '/' ? `${base}/` : `${base}${sourceRoute}/`;
      const u = new URL(raw, baseUrl);
      if (!/k4studios\.com$/i.test(u.hostname)) return null;
      p = u.pathname;
    } catch {
      return null;
    }
  }

  p = p.split('#')[0].split('?')[0];
  return p.replace(/\/$/, '') || '/';
}

function summarizeLinksByTarget(linksByTarget) {
  return targets.map((target) => {
    const links = linksByTarget.get(target) || [];
    const manual = links.filter((l) => l.sourceType === 'manual-structural');
    const auto = links.filter((l) => l.sourceType === 'auto-keyword-linker');

    const bySource = new Map();
    const byAnchor = new Map();

    for (const l of links) {
      const sourceKey = `${l.sourceRoute}||${l.sourceType}`;
      bySource.set(sourceKey, (bySource.get(sourceKey) || 0) + 1);

      const anchorKey = `${l.anchorText}||${l.sourceType}`;
      byAnchor.set(anchorKey, (byAnchor.get(anchorKey) || 0) + 1);
    }

    return {
      target,
      inboundTotal: links.length,
      inboundManualStructural: manual.length,
      inboundAutoKeywordLinker: auto.length,
      uniqueSourcePages: [...new Set(links.map((l) => l.sourceRoute))].length,
      allVisibleInRawHtmlNoJs: links.every((l) => l.rawHtmlVisible === true),
      sourceBreakdown: [...bySource.entries()].sort((a, b) => b[1] - a[1]).map(([k, count]) => {
        const [sourcePage, sourceType] = k.split('||');
        return { sourcePage, sourceType, count };
      }),
      anchorBreakdown: [...byAnchor.entries()].sort((a, b) => b[1] - a[1]).map(([k, count]) => {
        const [anchorText, sourceType] = k.split('||');
        return { anchorText, sourceType, count };
      })
    };
  });
}

function extractCanonicalMap(pageHtmlByRoute) {
  const out = {};
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

    out[t] = {
      canonicalHref,
      normalizedCanonicalPath,
      selfReferential: normalizedCanonicalPath === t
    };
  }
  return out;
}

function collectLinks(pageHtmlByRoute) {
  const linksByTarget = new Map();
  for (const t of targets) linksByTarget.set(t, []);

  const anchorRe = /<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)')([^>]*)>([\s\S]*?)<\/a>/gi;

  for (const [route, packet] of pageHtmlByRoute.entries()) {
    const html = packet?.text || '';
    if (!html) continue;

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
      const sourceType = /class\s*=\s*['"][^'"]*\bkw-link\b/i.test(attrs)
        ? 'auto-keyword-linker'
        : 'manual-structural';

      linksByTarget.get(target).push({
        sourceRoute: route,
        sourceType,
        anchorText,
        hrefRaw: href,
        rawHtmlVisible: true
      });
    }
  }

  return linksByTarget;
}

const htmlFiles = walk(distRoot);
const routes = htmlFiles.map(routeFromDistHtml).filter(Boolean);

const renderedHtmlByRoute = new Map();
for (const route of routes) {
  const rel = route === '/' ? 'index.html' : `${route.replace(/^\//, '')}/index.html`;
  const full = path.join(distRoot, rel);
  if (!fs.existsSync(full)) continue;
  renderedHtmlByRoute.set(route, { status: 200, url: `${base}${route === '/' ? '' : route}`, text: fs.readFileSync(full, 'utf8') });
}

const renderedLinks = collectLinks(renderedHtmlByRoute);
const renderedTargets = summarizeLinksByTarget(renderedLinks);
const renderedCanonical = extractCanonicalMap(renderedHtmlByRoute);

async function fetchText(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; K4-Phase1-Owner-Audit/1.0; +https://www.k4studios.com)'
    }
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, url: res.url, text };
}

const liveHtmlByRoute = new Map();
const fetchErrors = [];

for (const route of routes) {
  const url = `${base}${route === '/' ? '' : route}`;
  try {
    const r = await fetchText(url);
    liveHtmlByRoute.set(route, r);
    if (!r.ok) fetchErrors.push({ route, status: r.status, finalUrl: r.url });
  } catch (e) {
    fetchErrors.push({ route, status: 'ERR', error: String(e) });
  }
}

const liveLinks = collectLinks(liveHtmlByRoute);
const liveTargets = summarizeLinksByTarget(liveLinks);
const liveCanonical = extractCanonicalMap(liveHtmlByRoute);

const result = {
  generatedAt: new Date().toISOString(),
  base,
  scannedRouteCount: routes.length,
  liveFetchErrorsCount: fetchErrors.length,
  liveFetchErrors: fetchErrors.slice(0, 50),
  rendered: {
    source: 'dist rendered HTML (no JS execution)',
    targets: renderedTargets,
    canonical: renderedCanonical
  },
  live: {
    source: 'production fetched raw HTML (no JS execution)',
    targets: liveTargets,
    canonical: liveCanonical
  }
};

fs.writeFileSync(path.join(root, 'phase1-owner-audit.json'), JSON.stringify(result, null, 2));
console.log('Wrote phase1-owner-audit.json');
