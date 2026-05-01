import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const csvPath = path.join(root, 'public/data/23445334_2742351_position_tracking_rankings_overview_20260501.csv');
const semPath = path.join(root, 'src/data/semantic/K4-Sem.ts');
const srcPagesDir = path.join(root, 'src/pages');
const distDir = path.join(root, 'dist');
const docsDir = path.join(root, 'docs');

const outMd = path.join(docsDir, 'k4-semrush-keyword-opportunity-audit-2026-05-01.md');
const outCsv = path.join(docsDir, 'k4-semrush-keyword-map-2026-05-01.csv');

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headerIndex = lines.findIndex((line) => line.startsWith('Keyword,'));
  const headers = parseCsvLine(lines[headerIndex]);
  return lines.slice(headerIndex + 1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
  });
}

function walk(dir, test, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, test, files);
    else if (test(full)) files.push(full);
  }
  return files;
}

function pageUrlFromSource(file) {
  const rel = path.relative(srcPagesDir, file).replace(/\\/g, '/');
  if (rel.includes('/admin/') || rel.startsWith('admin/')) return null;
  if (rel.includes('[') || rel.includes('_')) return null;
  let url = '/' + rel.replace(/\.(astro|md|mdx)$/i, '');
  url = url.replace(/\/index$/i, '');
  url = url.replace(/\/all$/i, '/all');
  if (url === '/index') url = '/';
  return url;
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlForPath(urlPath) {
  if (!fs.existsSync(distDir)) return null;
  const cleaned = urlPath.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
  const file = cleaned ? path.join(distDir, cleaned, 'index.html') : path.join(distDir, 'index.html');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  return null;
}

function extractHtmlMeta(urlPath) {
  const html = htmlForPath(urlPath);
  if (!html) return {};
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim() || '';
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1]?.trim() || '';
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const schemaTypes = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || html;
  const firstText = stripTags(body).slice(0, 420);
  return {
    title: stripTags(title),
    description,
    canonical,
    h1: h1 ? stripTags(h1) : '',
    schema: [...new Set(schemaTypes)].slice(0, 8).join('; '),
    firstText,
  };
}

function normalizePath(value) {
  if (!value || value === '-') return '';
  try {
    const url = new URL(value);
    return url.pathname.replace(/\/$/, '') || '/';
  } catch {
    return value.replace(/\/$/, '') || '/';
  }
}

function rankBucket(rank) {
  if (!rank || rank === '-') return 'Unranked';
  const n = Number(rank);
  if (n <= 3) return 'Top 3';
  if (n <= 10) return '4-10';
  if (n <= 20) return '11-20';
  if (n <= 40) return '21-40';
  return '41-100';
}

function numberOrZero(value) {
  const n = Number(String(value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const sourceRoutes = new Map();
for (const file of walk(srcPagesDir, (f) => /\.(astro|md|mdx)$/i.test(f))) {
  const url = pageUrlFromSource(file);
  if (url) sourceRoutes.set(url.toLowerCase(), { url, file });
}

const distRoutes = new Set();
for (const file of walk(distDir, (f) => /index\.html$/i.test(f))) {
  const rel = path.relative(distDir, path.dirname(file)).replace(/\\/g, '/');
  const url = rel ? '/' + rel : '/';
  if (!/\/i-[A-Za-z0-9]+$/.test(url)) distRoutes.add(url.toLowerCase());
}

const semText = fs.readFileSync(semPath, 'utf8');
const semEntries = [];
const blockRegex = /(\w+)\s*:\s*\{([\s\S]*?)(?=\n\s*\w+\s*:\s*\{|export|\/\/ ---|\n\};)/g;
for (const match of semText.matchAll(blockRegex)) {
  const [, key, block] = match;
  const pathMatch = block.match(/path:\s*["']([^"']+)["']/);
  const semUrl = pathMatch?.[1] || '';
  const phrases = [...block.matchAll(/phrase:\s*["']([^"']+)["'][\s\S]*?(?:rating:\s*(\d+))?[\s\S]*?(?:link:\s*["']([^"']+)["'])?/g)]
    .map((m) => ({ phrase: m[1], rating: Number(m[2] || 0), link: m[3] || semUrl }))
    .filter((p) => p.phrase);
  if (semUrl || phrases.length) semEntries.push({ key, path: semUrl, phrases });
}

function semMatch(keyword) {
  const lower = keyword.toLowerCase();
  const exact = [];
  for (const entry of semEntries) {
    for (const phrase of entry.phrases) {
      const p = phrase.phrase.toLowerCase();
      if (p === lower) exact.push({ entry, phrase });
    }
  }
  return exact[0] || null;
}

function clusterFor(keyword) {
  const k = keyword.toLowerCase();
  if (/black and white|black white|monochrome/.test(k) && /(cowboy|western)/.test(k)) return 'Black-and-white Western / cowboy';
  if (/vintage|old west|old western|retro/.test(k) && /(cowboy|western|west)/.test(k)) return 'Vintage Western / Old West';
  if (/wild west|frontier/.test(k)) return 'Wild West / frontier';
  if (/cowboy portrait|cowboy portraits|western portrait|western portraits|western photographer|western cowboy photography|cowboy photography/.test(k)) return 'Cowboy / Western portraits';
  if (/western fine art|fine art western|western photography art|art photography|western photographs|western photography prints|limited edition western/.test(k)) return 'Western fine art photography';
  if (/cowboy art|cowboy artwork|western art|western artwork|western prints|western wall|cowboy wall|western paintings|western interior|decor|man cave/.test(k)) return 'Broad commercial Western / cowboy art';
  if (/civil war|wwii|reenact|historical|historically|history inspired|roaring 20s/.test(k)) return 'History / reenactment / war';
  if (/train|steam|locomotive|rail/.test(k)) return 'Train / transportation';
  if (/painterly/.test(k)) return 'Painterly photography';
  if (/mountain|landscape|faroe|canadian rockies|sunset/.test(k)) return 'Landscape / travel';
  return 'Other / low fit';
}

function fallbackTarget(keyword, cluster) {
  const k = keyword.toLowerCase();
  if (cluster === 'Black-and-white Western / cowboy') return '/Western-Black-and-White-Photography';
  if (cluster === 'Vintage Western / Old West') return '/vintage-western-art';
  if (cluster === 'Wild West / frontier') return /art|artwork|poster|painting|print/.test(k) ? '/wild-west-art' : '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West';
  if (cluster === 'Cowboy / Western portraits') return '/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits';
  if (cluster === 'Western fine art photography') return '/Western-Fine-Art-Photography';
  if (cluster === 'Broad commercial Western / cowboy art') {
    if (/cowboy art prints/.test(k)) return '/cowboy-art-prints';
    if (/cowboy wall/.test(k)) return '/cowboy-wall-art';
    if (/western artwork|artwork western|western art paintings/.test(k)) return '/western-artwork';
    if (/western art$|american western art|art of the west/.test(k)) return '/Blog/what-is-western-art';
    return '/Western-Wall-Art';
  }
  if (cluster === 'History / reenactment / war') {
    if (/civil war/.test(k)) return '/Civil-War-Art';
    if (/wwii/.test(k)) return '/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII';
    if (/historically themed/.test(k)) return '/Blog/what-is-historically-themed-photography';
    return '/Historical-Reenactment-Photography';
  }
  if (cluster === 'Train / transportation') return '/Galleries/Fine-Art-Photography/Transportation/Trains';
  if (cluster === 'Painterly photography') return /what is|definition/.test(k) ? '/Blog/what-is-painterly-photography' : '/Galleries/Painterly-Fine-Art-Photography';
  return '';
}

function intendedTarget(keyword, cluster, sem) {
  const k = keyword.toLowerCase();
  if (cluster === 'Black-and-white Western / cowboy') return fallbackTarget(keyword, cluster);
  if (cluster === 'Vintage Western / Old West') return fallbackTarget(keyword, cluster);
  if (cluster === 'Wild West / frontier' && /art|artwork|poster|painting|print|frontier/.test(k)) return fallbackTarget(keyword, cluster);
  if (cluster === 'Cowboy / Western portraits') return fallbackTarget(keyword, cluster);
  if (cluster === 'Train / transportation') return fallbackTarget(keyword, cluster);
  if (sem?.phrase?.link || sem?.entry?.path) return sem.phrase.link || sem.entry.path;
  return fallbackTarget(keyword, cluster);
}

function pageType(urlPath) {
  if (!urlPath) return 'missing';
  if (urlPath.startsWith('/Blog/what-is-')) return 'definition blog';
  if (urlPath.startsWith('/Blog/')) return 'blog';
  if (urlPath.startsWith('/Galleries/') && /\/i-[A-Za-z0-9]+$/.test(urlPath)) return 'image';
  if (urlPath.startsWith('/Galleries/')) return 'gallery';
  if (/Western|western|cowboy|wild|vintage|Art|Photography|Interior|Wall/.test(urlPath)) return 'doorway / hub';
  return 'page';
}

function actionFor(row, intended, currentPath, cluster) {
  const bucket = row.rankBucket;
  const commercial = row.intent.includes('c');
  if (bucket === 'Top 3') return 'defend existing winner';
  if (!currentPath) {
    if (intended) return commercial ? 'strengthen/build commercial doorway target' : 'build supporting article/page or strengthen target';
    return 'ignore / wrong intent';
  }
  if (intended && currentPath.toLowerCase() !== intended.toLowerCase()) {
    if (bucket === '4-10' || bucket === '11-20') return 'improve internal linking to intended target without disturbing winner';
    return 'resolve landing mismatch / possible cannibalization';
  }
  if (bucket === '4-10' || bucket === '11-20' || bucket === '21-40') return 'strengthen existing page';
  if (cluster === 'Other / low fit') return 'monitor only';
  return 'improve internal linking';
}

function priority(row, intended, currentPath, cluster) {
  const volume = row.volume;
  const kd = row.kd;
  const rank = row.rank === '-' ? 101 : Number(row.rank);
  const rankScore = rank <= 3 ? 5 : rank <= 10 ? 8 : rank <= 20 ? 18 : rank <= 40 ? 15 : 8;
  const volumeScore = Math.min(25, Math.log10(volume + 1) * 8);
  const kdScore = Math.max(0, 18 - kd / 2);
  const fit = {
    'Black-and-white Western / cowboy': 20,
    'Vintage Western / Old West': 18,
    'Wild West / frontier': 20,
    'Cowboy / Western portraits': 20,
    'Western fine art photography': 20,
    'Broad commercial Western / cowboy art': 15,
    'History / reenactment / war': 14,
    'Train / transportation': 10,
    'Painterly photography': 16,
    'Landscape / travel': 7,
    'Other / low fit': 0,
  }[cluster] ?? 0;
  const existing = intended || currentPath ? 14 : 0;
  return Math.round(volumeScore + kdScore + rankScore + fit + existing);
}

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8')).map((r) => {
  const keyword = r.Keyword;
  const rank = r['*.k4studios.com/*_20260501'];
  const currentPath = normalizePath(r['*.k4studios.com/*_20260501_landing']);
  const cluster = clusterFor(keyword);
  const sem = semMatch(keyword);
  const intended = intendedTarget(keyword, cluster, sem);
  const pageMeta = extractHtmlMeta(currentPath || intended);
  const row = {
    keyword,
    volume: numberOrZero(r['Search Volume']),
    kd: numberOrZero(r['Keyword Difficulty']),
    intent: r.Intents || '',
    cpc: r.CPC || '',
    rank,
    rankBucket: rankBucket(rank),
    currentPath,
    currentPageType: pageType(currentPath),
    matchedRepoPage: currentPath && (sourceRoutes.has(currentPath.toLowerCase()) || distRoutes.has(currentPath.toLowerCase())) ? 'yes' : (currentPath ? 'built/generated' : 'no'),
    intended,
    intendedPageType: pageType(intended),
    currentLandingCorrect: currentPath && intended ? (currentPath.toLowerCase() === intended.toLowerCase() ? 'yes' : 'review') : (currentPath ? 'review' : 'no current landing'),
    cluster,
    semEntry: sem?.entry?.key || '',
    semPhrase: sem?.phrase?.phrase || '',
    title: pageMeta.title || '',
    h1: pageMeta.h1 || '',
    metaDescription: pageMeta.description || '',
    canonical: pageMeta.canonical || '',
    schema: pageMeta.schema || '',
    firstText: pageMeta.firstText || '',
  };
  row.recommendedAction = actionFor(row, intended, currentPath, cluster);
  row.priority = priority(row, intended, currentPath, cluster);
  row.cannibalizationRisk = currentPath && intended && currentPath.toLowerCase() !== intended.toLowerCase() ? 'possible' : '';
  row.optimizationRead = !currentPath ? 'missing/unranked' : (row.title && row.h1 && row.metaDescription ? 'has core SSR metadata' : 'check title/h1/meta');
  return row;
}).sort((a, b) => b.priority - a.priority || b.volume - a.volume);

fs.mkdirSync(docsDir, { recursive: true });
const csvHeaders = [
  'keyword', 'volume', 'kd', 'intent', 'rank', 'rankBucket', 'cluster', 'currentPath', 'matchedRepoPage',
  'intended', 'currentLandingCorrect', 'cannibalizationRisk', 'recommendedAction', 'priority',
  'currentPageType', 'intendedPageType', 'semEntry', 'semPhrase', 'title', 'h1', 'metaDescription', 'canonical', 'schema',
];
fs.writeFileSync(outCsv, [
  csvHeaders.join(','),
  ...rows.map((r) => csvHeaders.map((h) => csvEscape(r[h])).join(',')),
].join('\n'));

const ranked = rows.filter((r) => r.rank !== '-');
const bucketCounts = rows.reduce((acc, r) => ((acc[r.rankBucket] = (acc[r.rankBucket] || 0) + 1), acc), {});
const clusterGroups = rows.reduce((map, row) => {
  const list = map.get(row.cluster) || [];
  list.push(row);
  map.set(row.cluster, list);
  return map;
}, new Map());
const topByCluster = [...clusterGroups.entries()].map(([cluster, items]) => ({
  cluster,
  count: items.length,
  ranked: items.filter((r) => r.rank !== '-').length,
  volume: items.reduce((sum, r) => sum + r.volume, 0),
  top: items.slice().sort((a, b) => b.priority - a.priority).slice(0, 8),
})).sort((a, b) => b.volume - a.volume);

function mdTable(items, headers) {
  return [
    `| ${headers.map((h) => h.label).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...items.map((item) => `| ${headers.map((h) => String(item[h.key] ?? '').replace(/\|/g, '/')).join(' | ')} |`),
  ].join('\n');
}

const quickWins = rows.filter((r) => r.rank !== '-' && Number(r.rank) >= 4 && Number(r.rank) <= 40 && r.priority >= 65).slice(0, 20);
const breathing = rows.filter((r) => r.rank !== '-' && Number(r.rank) <= 20).slice(0, 30);
const missing = rows.filter((r) => r.rank === '-' && r.priority >= 55).slice(0, 25);
const risks = rows.filter((r) => r.cannibalizationRisk).slice(0, 25);
const defend = rows.filter((r) => r.rankBucket === 'Top 3').slice(0, 25);

const firstActions = [
  'Strengthen `/Western-Black-and-White-Photography` as the semantic parent for black-and-white cowboy/western terms, then point the ranking B&W gallery/all pages toward it and back again with exact but natural anchors.',
  'Keep the B&W gallery/all pages alive. They are ranking, so treat them as visual inventory pages that pass authority upward rather than pages to replace.',
  'Tighten `/vintage-western-art` around vintage cowboy art, vintage western prints, vintage cowboy print, old west art, and old west posters. One page can serve this whole cluster.',
  'Expand `/wild-west-art` to explicitly absorb Wild West art, Old West art, Wild West artwork, frontier art, prints, posters, and paintings while preserving the Trojan Horse voice.',
  'Clarify the cowboy portrait hierarchy: `/Galleries/.../Western-Cowboy-Portraits` should be the parent; Color, Black-White, and all pages should be supporting children.',
  'Leave `/Blog/what-is-painterly-photography` as the AI/definition winner, but add stronger collector-path links to `/Galleries/Painterly-Fine-Art-Photography` and `/Painterly-Western-Photography`.',
  'Treat `/Civil-War-Art` as the restored Civil War authority doorway and link to it from Civil War gallery pages, Facing History, and historical definition pages without disturbing the gallery page that already ranks.',
  'Add a commercial-but-not-flat block to `/Western-Wall-Art` for cowboy art, cowboy artwork, western prints, western art prints, and western wall decor. This is where the commercial game belongs.',
  'Lightly improve the train pages: reinforce `/Galleries/Fine-Art-Photography/Transportation/Trains` as the generic train photography target and use painterly train pages for painterly/fine-art modifiers.',
  'Do not chase broad `cowboy art` with only one page. Use a cluster: `/Western-Wall-Art` for commercial intent, `/Cowboy-Fine-Art-Photography` for medium/collector intent, and cowboy galleries for proof.',
];

const md = `# K4 Semrush Keyword Opportunity Audit - 2026-05-01

Source CSV: \`public/data/23445334_2742351_position_tracking_rankings_overview_20260501.csv\`

## Executive summary

- Tracked keywords: ${rows.length}
- Ranking keywords: ${ranked.length}
- Top 3: ${bucketCounts['Top 3'] || 0}; 4-10: ${bucketCounts['4-10'] || 0}; 11-20: ${bucketCounts['11-20'] || 0}; 21-40: ${bucketCounts['21-40'] || 0}; 41-100: ${bucketCounts['41-100'] || 0}; unranked: ${bucketCounts.Unranked || 0}
- The cleanest near-term gains are not the huge broad terms. They are the clusters where K4 already sits from positions 11-40 with low KD: black-and-white cowboy/western, vintage western/cowboy, Wild West/frontier, cowboy portraits, western fine art photography, and trains.
- The broad commercial terms are worth playing, but they should live in doorway/commercial buffer pages like \`/Western-Wall-Art\`, \`/cowboy-art-prints\`, \`/cowboy-wall-art\`, \`/western-artwork\`, and \`/wild-west-art\`, not by flattening the main gallery voice.
- Definition pages are doing the expected AI/answer-engine work. \`/Blog/what-is-painterly-photography\` is a winner and should be defended, with stronger collector pathways rather than heavy rewriting.

## Biggest quick wins

${mdTable(quickWins, [
  { key: 'keyword', label: 'Keyword' },
  { key: 'rank', label: 'Rank' },
  { key: 'volume', label: 'Vol' },
  { key: 'kd', label: 'KD' },
  { key: 'cluster', label: 'Cluster' },
  { key: 'currentPath', label: 'Current landing' },
  { key: 'intended', label: 'Likely target' },
  { key: 'recommendedAction', label: 'Action' },
])}

## Existing pages already breathing

${mdTable(breathing, [
  { key: 'keyword', label: 'Keyword' },
  { key: 'rank', label: 'Rank' },
  { key: 'volume', label: 'Vol' },
  { key: 'kd', label: 'KD' },
  { key: 'currentPath', label: 'Landing' },
  { key: 'recommendedAction', label: 'Action' },
])}

## Missing or weak opportunities

${mdTable(missing, [
  { key: 'keyword', label: 'Keyword' },
  { key: 'volume', label: 'Vol' },
  { key: 'kd', label: 'KD' },
  { key: 'intent', label: 'Intent' },
  { key: 'cluster', label: 'Cluster' },
  { key: 'intended', label: 'Likely target' },
  { key: 'recommendedAction', label: 'Action' },
])}

## Cannibalization or wrong-landing risks

These are not automatic problems. Several are cases where a gallery page is ranking because it has image proof. Treat them as review flags before changing anything.

${mdTable(risks, [
  { key: 'keyword', label: 'Keyword' },
  { key: 'rank', label: 'Rank' },
  { key: 'currentPath', label: 'Current landing' },
  { key: 'intended', label: 'Likely target' },
  { key: 'recommendedAction', label: 'Action' },
])}

## Pages that should not be disturbed

${mdTable(defend, [
  { key: 'keyword', label: 'Keyword' },
  { key: 'rank', label: 'Rank' },
  { key: 'currentPath', label: 'Landing' },
  { key: 'cluster', label: 'Cluster' },
])}

## Cluster read

${topByCluster.map((g) => `### ${g.cluster}

- Tracked terms: ${g.count}; ranked: ${g.ranked}; combined tracked volume: ${g.volume}
- Best next targets: ${g.top.map((r) => `${r.keyword} (${r.rank === '-' ? 'unranked' : `#${r.rank}`}, vol ${r.volume}, KD ${r.kd})`).join('; ')}
`).join('\n')}

## Recommended first 10 actions

${firstActions.map((item, i) => `${i + 1}. ${item}`).join('\n')}

## Questions for Wayne / Quill

1. For \`cowboy art\`, do we want \`/Western-Wall-Art\` to remain the commercial collector buffer, or should \`/cowboy-art-prints\` become the sharper exact-match commercial target?
2. Should \`/wild-west-art\` carry poster/painting language explicitly, or should \`old west posters\` and \`wild west poster\` get a supporting commercial page later?
3. Are the B&W \`/all\` pages intentionally indexable as keyword catchers? They are working, but they need clear parent/child linking to avoid splitting authority.
4. For AI SERP, do we want more FAQ/definition blocks on doorway pages, or should definition language stay mostly in \`Blog/what-is-...\` pages?
5. Should \`/american-wild-west\` stay as a historical bridge page only, or should it also become a soft target for broader informational Wild West queries?

## Notes

- The CSV companion file contains every tracked keyword with rank bucket, target mapping, risk flag, and recommended action: \`docs/k4-semrush-keyword-map-2026-05-01.csv\`.
- This audit used local source routes, \`K4-Sem.ts\`, and built HTML in \`dist\` for title/H1/meta/schema extraction where available.
- No site content was changed.
`;

fs.writeFileSync(outMd, md);
console.log(`Wrote ${outMd}`);
console.log(`Wrote ${outCsv}`);
