const fs = require('fs');

const USER_AGENT = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';

async function getText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/xml,text/xml,text/html,*/*'
    },
    redirect: 'follow'
  });
  return { status: res.status, finalUrl: res.url, text: await res.text(), headers: res.headers };
}

function extractLocs(xml) {
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)];
  return matches.map((m) => m[1].trim());
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    if (u.pathname !== '/' && u.pathname.endsWith('/')) u.pathname = u.pathname.replace(/\/+$/g, '');
    return u.toString();
  } catch {
    return url;
  }
}

function canonicalMatches(url, canonical) {
  if (!canonical) return false;
  return normalizeUrl(url).toLowerCase() === normalizeUrl(canonical).toLowerCase();
}

async function fetchHtmlAudit(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'Cache-Control': 'no-cache'
    },
    redirect: 'follow'
  });
  const html = await res.text();
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  const metaRobotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']robots["'][^>]*>/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const pCount = (html.match(/<p\b/gi) || []).length;
  const xRobots = res.headers.get('x-robots-tag') || null;

  return {
    url,
    final_url: res.url,
    status: res.status,
    x_robots_tag: xRobots,
    meta_robots: metaRobotsMatch ? metaRobotsMatch[1] : null,
    canonical: canonicalMatch ? canonicalMatch[1] : null,
    canonical_self: canonicalMatches(res.url, canonicalMatch ? canonicalMatch[1] : null),
    h1_count: h1Count,
    p_count: pCount,
    html_bytes: Buffer.byteLength(html, 'utf8')
  };
}

async function main() {
  const report = {
    generated_at: new Date().toISOString(),
    sitemap: {},
    status_sweep: {},
    triage: {},
    flags: []
  };

  const sitemapRoot = 'https://www.k4studios.com/sitemap.xml';
  const root = await getText(sitemapRoot);
  const rootLocs = extractLocs(root.text);
  const isIndex = /<sitemapindex/i.test(root.text);

  report.sitemap.root_status = root.status;
  report.sitemap.root_is_index = isIndex;
  report.sitemap.root_loc_count = rootLocs.length;

  const urlPool = [];
  if (isIndex) {
    const childSitemaps = rootLocs.slice(0, 8);
    report.sitemap.child_sitemaps_checked = childSitemaps;
    for (const sm of childSitemaps) {
      try {
        const sres = await getText(sm);
        const locs = extractLocs(sres.text);
        for (const loc of locs) urlPool.push(loc);
      } catch (e) {
        report.flags.push(`Failed to fetch child sitemap: ${sm}`);
      }
      if (urlPool.length >= 120) break;
    }
  } else {
    for (const loc of rootLocs) urlPool.push(loc);
  }

  const deduped = [...new Set(urlPool)].filter((u) => /^https?:\/\//i.test(u));
  const sample = deduped.slice(0, 50);

  const statuses = {};
  const xRobotsCounts = {};
  const suspicious = [];

  for (const url of sample) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        },
        redirect: 'follow'
      });
      const status = String(res.status);
      statuses[status] = (statuses[status] || 0) + 1;
      const xr = (res.headers.get('x-robots-tag') || '').trim().toLowerCase();
      if (xr) xRobotsCounts[xr] = (xRobotsCounts[xr] || 0) + 1;
      if (res.status >= 400 || xr.includes('noindex') || xr.includes('nofollow')) {
        suspicious.push({ url, final_url: res.url, status: res.status, x_robots_tag: xr || null });
      }
    } catch (e) {
      statuses['fetch_error'] = (statuses['fetch_error'] || 0) + 1;
      suspicious.push({ url, final_url: null, status: 'fetch_error', x_robots_tag: null });
    }
  }

  report.status_sweep.sample_size = sample.length;
  report.status_sweep.status_counts = statuses;
  report.status_sweep.x_robots_counts = xRobotsCounts;
  report.status_sweep.suspicious = suspicious;

  const blogUrl = sample.find((u) => /\/blog\//i.test(u));
  const galleryUrl = sample.find((u) => /\/Galleries\//.test(u) && !/\/i-[A-Za-z0-9-]+\/?$/.test(u));
  const imageUrl = sample.find((u) => /\/i-[A-Za-z0-9-]+\/?$/.test(u));

  report.triage.selected = { blogUrl: blogUrl || null, galleryUrl: galleryUrl || null, imageUrl: imageUrl || null };

  if (blogUrl) report.triage.blog = await fetchHtmlAudit(blogUrl);
  if (galleryUrl) report.triage.gallery = await fetchHtmlAudit(galleryUrl);
  if (imageUrl) report.triage.image = await fetchHtmlAudit(imageUrl);

  const triageEntries = [report.triage.blog, report.triage.gallery, report.triage.image].filter(Boolean);
  for (const t of triageEntries) {
    if (t.x_robots_tag && /noindex|nofollow/i.test(t.x_robots_tag)) report.flags.push(`X-Robots noindex/nofollow on ${t.url}`);
    if (t.meta_robots && /noindex|nofollow|none/i.test(t.meta_robots)) report.flags.push(`Meta robots restrictive on ${t.url}: ${t.meta_robots}`);
    if (t.canonical && !t.canonical_self) report.flags.push(`Canonical mismatch on ${t.url} -> ${t.canonical}`);
    if (t.h1_count === 0 || t.p_count < 1 || t.html_bytes < 8000) report.flags.push(`Thin SSR signal on ${t.url} (h1=${t.h1_count}, p=${t.p_count}, bytes=${t.html_bytes})`);
  }

  const outFile = 'bing-gauntlet-report.json';
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({
    outFile,
    sitemap: report.sitemap,
    status_sweep: {
      sample_size: report.status_sweep.sample_size,
      status_counts: report.status_sweep.status_counts,
      x_robots_counts: report.status_sweep.x_robots_counts,
      suspicious_count: report.status_sweep.suspicious.length
    },
    triage_selected: report.triage.selected,
    flags: report.flags
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
