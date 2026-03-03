const fs = require('fs');
const crypto = require('crypto');

const UA = 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';

function extract(regex, text, group = 1) {
  const match = text.match(regex);
  return match ? (match[group] || '').trim() : null;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    if (u.pathname !== '/' && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/g, '');
    }
    return u.toString().toLowerCase();
  } catch {
    return String(url || '').toLowerCase();
  }
}

async function fetchAudit(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'Cache-Control': 'no-cache'
    },
    redirect: 'follow'
  });

  const html = await response.text();
  const title = extract(/<title[^>]*>([\s\S]*?)<\/title>/i, html);
  const canonical =
    extract(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i, html) ||
    extract(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i, html);
  const metaRobots =
    extract(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i, html) ||
    extract(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']robots["'][^>]*>/i, html);
  const metaDescription =
    extract(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i, html) ||
    extract(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i, html);

  const text = stripHtml(html);
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const textHash = crypto.createHash('sha1').update(text.slice(0, 5000)).digest('hex');

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const pCount = (html.match(/<p\b/gi) || []).length;
  const imgCount = (html.match(/<img\b/gi) || []).length;

  return {
    url,
    finalUrl: response.url,
    status: response.status,
    xRobotsTag: response.headers.get('x-robots-tag') || null,
    canonical,
    canonicalSelf: canonical ? normalizeUrl(canonical) === normalizeUrl(response.url) : false,
    metaRobots,
    title,
    titleLength: title ? title.length : 0,
    descriptionLength: metaDescription ? metaDescription.length : 0,
    h1Count,
    pCount,
    imgCount,
    htmlBytes: Buffer.byteLength(html, 'utf8'),
    textWords: words.length,
    textHash
  };
}

function summarize(rows) {
  const statusCounts = {};
  let canonicalSelf = 0;
  let hasMetaRobotsNoindex = 0;
  let hasXRobotsNoindex = 0;
  let thinPages = 0;
  const titleCounts = new Map();
  const textCounts = new Map();

  for (const row of rows) {
    const statusKey = String(row.status);
    statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
    if (row.canonicalSelf) canonicalSelf += 1;
    if ((row.metaRobots || '').toLowerCase().includes('noindex')) hasMetaRobotsNoindex += 1;
    if ((row.xRobotsTag || '').toLowerCase().includes('noindex')) hasXRobotsNoindex += 1;
    if (row.textWords < 250 || row.pCount < 2) thinPages += 1;

    const titleKey = (row.title || '').trim().toLowerCase();
    if (titleKey) titleCounts.set(titleKey, (titleCounts.get(titleKey) || 0) + 1);
    textCounts.set(row.textHash, (textCounts.get(row.textHash) || 0) + 1);
  }

  const duplicateTitles = [...titleCounts.values()].filter((count) => count > 1).reduce((a, b) => a + b, 0);
  const duplicateText = [...textCounts.values()].filter((count) => count > 1).reduce((a, b) => a + b, 0);

  return {
    sampleSize: rows.length,
    statusCounts,
    canonicalSelfRate: rows.length ? Number((canonicalSelf / rows.length).toFixed(2)) : 0,
    metaNoindexCount: hasMetaRobotsNoindex,
    xRobotsNoindexCount: hasXRobotsNoindex,
    thinPagesCount: thinPages,
    duplicateTitleRows: duplicateTitles,
    duplicateTextRows: duplicateText,
    avgWords: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.textWords, 0) / rows.length) : 0,
    avgHtmlBytes: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.htmlBytes, 0) / rows.length) : 0
  };
}

(async () => {
  const sitemapXml = await (await fetch('https://www.k4studios.com/sitemap.xml', { headers: { 'User-Agent': UA } })).text();
  const allUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  const uniqueUrls = [...new Set(allUrls)];

  const imageUrls = uniqueUrls.filter((url) => /\/i-[A-Za-z0-9-]+\/?$/.test(url));
  const nonImageUrls = uniqueUrls.filter((url) => !/\/i-[A-Za-z0-9-]+\/?$/.test(url));

  const pickRandom = (arr, count) => {
    const copy = [...arr].sort(() => Math.random() - 0.5);
    return copy.slice(0, Math.min(count, copy.length));
  };

  const imageSample = pickRandom(imageUrls, 20);
  const nonImageSample = pickRandom(nonImageUrls, 20);

  const imageRows = [];
  for (const url of imageSample) {
    imageRows.push(await fetchAudit(url));
  }

  const nonImageRows = [];
  for (const url of nonImageSample) {
    nonImageRows.push(await fetchAudit(url));
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sample: {
      imageTotalInSitemap: imageUrls.length,
      nonImageTotalInSitemap: nonImageUrls.length,
      imageSampleSize: imageRows.length,
      nonImageSampleSize: nonImageRows.length
    },
    summary: {
      image: summarize(imageRows),
      nonImage: summarize(nonImageRows)
    },
    details: {
      image: imageRows,
      nonImage: nonImageRows
    }
  };

  fs.writeFileSync('bing-page-quality-compare.json', JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output.summary, null, 2));
  console.log('WROTE bing-page-quality-compare.json');
})();
