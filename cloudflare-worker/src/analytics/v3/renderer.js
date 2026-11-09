function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatNumber(value) { return Number(value || 0).toLocaleString('en-US'); }

function compactPathLabel(value, maxLength = 0) {
  const path = String(value || '');
  const facingHistory = '/Facing-History';
  const facingIndex = path.indexOf(facingHistory);
  let compact = path;
  if (facingIndex >= 0) compact = path.slice(facingIndex);
  else if (path.startsWith('/Galleries/Painterly-Fine-Art-Photography')) {
    compact = path.replace('/Galleries/Painterly-Fine-Art-Photography', '/Painterly');
  } else if (path.startsWith('/Galleries/Fine-Art-Photography')) {
    compact = path.replace('/Galleries/Fine-Art-Photography', '/Fine-Art');
  }
  return maxLength > 1 && compact.length > maxLength
    ? `…${compact.slice(-(maxLength - 1))}`
    : compact;
}

function renderCards(counts) {
  return [
    ['Visitors', counts?.visitors], ['Sessions', counts?.sessions], ['Page loads', counts?.page_views],
    ['Image views', counts?.image_views], ['Engaged sessions', counts?.engaged_sessions],
    ['Pricing opens', counts?.pricing_opens, 'pricing-opened']
  ].map(([label, value, className = '']) => `<article class="card${className ? ` ${className}` : ''}"><span>${label}</span><strong>${formatNumber(value)}</strong></article>`).join('');
}

function renderTable(title, rows, { linkPaths = false, accent = '' } = {}) {
  const body = rows?.length
    ? rows.map((row) => {
      const label = String(row.label || '');
      const displayLabel = linkPaths ? compactPathLabel(label) : label;
      const linkedLabel = linkPaths && label.startsWith('/')
        ? `<a class="page-link" href="https://www.k4studios.com${escapeHtml(label)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayLabel)}</a>`
        : escapeHtml(displayLabel);
      return `<tr><td title="${escapeHtml(label)}">${linkedLabel}</td><td>${formatNumber(row.count)}</td></tr>`;
    }).join('')
    : '<tr><td colspan="2" class="empty">No activity in this window.</td></tr>';
  return `<section class="panel${accent ? ` accent-${escapeHtml(accent)}` : ''}"><h2>${escapeHtml(title)}</h2><table><tbody>${body}</tbody></table></section>`;
}

function renderEntryNavigation(rows) {
  const percent = (count, total) => total > 0 ? `${Math.round((count / total) * 100)}%` : '0%';
  const body = rows?.length ? rows.map((row) => {
    const label = String(row.label || '');
    const displayLabel = compactPathLabel(label, 36);
    const linkedLabel = label.startsWith('/')
      ? `<a class="page-link" href="https://www.k4studios.com${escapeHtml(label)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayLabel)}</a>`
      : escapeHtml(displayLabel);
    return `<tr><td title="${escapeHtml(label)}">${linkedLabel}</td><td>${formatNumber(row.entries)}</td><td title="${formatNumber(row.continued)} of ${formatNumber(row.entries)} entry sessions">${percent(row.continued, row.entries)}</td><td title="${formatNumber(row.chapters)} of ${formatNumber(row.entries)} entry sessions">${percent(row.chapters, row.entries)}</td></tr>`;
  }).join('') : '<tr><td colspan="4" class="empty">No entry navigation activity in this window.</td></tr>';
  return `<section class="panel accent-entry entry-navigation"><h2>Top 10 Entry Navigation</h2><table><colgroup><col><col class="entries-col"><col class="continued-col"><col class="chapter-col"></colgroup><thead><tr><th>Entry page</th><th>Entries</th><th title="Sessions with at least two tracked page loads">Continued</th><th title="Sessions that reached a chapter view">Chapter</th></tr></thead><tbody>${body}</tbody></table></section>`;
}

function renderOimDomainFunnel(rows) {
  const domains = [
    'one-image-movie.com',
    'one-image-movies.com',
    'one-imagemovie.com',
    'one-imagemovies.com',
    'oneimagemovie.com',
    'oneimagemovies.com'
  ];
  const activity = new Map((rows || []).map((row) => [row.label, row]));
  const domainRows = domains.map((label) => activity.get(label) || ({ label, entries: 0, continued: 0, chapters: 0 }));
  const percent = (count, total) => total > 0 ? `${Math.round((count / total) * 100)}%` : '0%';
  const body = domainRows.map((row) => `
    <tr><td>${escapeHtml(row.label)}</td><td>${formatNumber(row.entries)}</td><td title="${formatNumber(row.continued)} of ${formatNumber(row.entries)} vanity-domain sessions">${percent(row.continued, row.entries)}</td><td title="${formatNumber(row.chapters)} of ${formatNumber(row.entries)} vanity-domain sessions">${percent(row.chapters, row.entries)}</td></tr>
  `).join('');
  return `<section class="panel accent-entry entry-navigation oim-domain-funnel"><h2>One-Image Movie Domain Journey</h2><p class="sub">Each forwarded domain, followed through the site within the same session.</p><table><colgroup><col><col class="entries-col"><col class="continued-col"><col class="chapter-col"></colgroup><thead><tr><th>Forwarded domain</th><th>Entries</th><th title="Sessions with at least two tracked page loads">Continued</th><th title="Sessions that reached a chapter view">Chapter</th></tr></thead><tbody>${body}</tbody></table></section>`;
}

const DEVICE_ORDER = ['Windows', 'Mac', 'Apple mobile', 'Android', 'Other'];
const DEVICE_ICONS = { Windows: 'WIN', Mac: 'MAC', 'Apple mobile': 'IOS', Android: 'AND', Other: '---' };
const DEVICE_CLASSES = { Windows: 'windows', Mac: 'mac', 'Apple mobile': 'apple-mobile', Android: 'android', Other: 'other' };

function renderDevices(title, rows) {
  const counts = new Map((rows || []).map((row) => [row.label, Number(row.count || 0)]));
  const ordered = DEVICE_ORDER.map((label) => ({ label, count: counts.get(label) || 0 }));
  const total = ordered.reduce((sum, row) => sum + row.count, 0);
  const body = total ? ordered.map((row) => {
    const percentage = (row.count / total) * 100;
    return `<tr class="device-${DEVICE_CLASSES[row.label]}"><td><span class="device-icon">${DEVICE_ICONS[row.label]}</span>${escapeHtml(row.label)}</td><td>${formatNumber(row.count)}</td><td>${percentage.toFixed(percentage < 10 ? 1 : 0)}%</td></tr>`;
  }).join('') : '<tr><td colspan="3" class="empty">No activity in this window.</td></tr>';
  return `<section class="panel device-panel"><h2>${escapeHtml(title)}</h2><table><thead><tr><th>Device</th><th>Visitors</th><th>Share</th></tr></thead><tbody>${body}</tbody></table></section>`;
}

const US_STATE_NAMES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
  'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee',
  'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming', 'Puerto Rico'
];
const US_STATES = new Set(US_STATE_NAMES);
const COUNTRY_NAMES = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

function parseGeoLabel(value) {
  const label = String(value || '').trim() || 'Unknown location';
  const parts = label.split(',').map((part) => part.trim()).filter(Boolean);
  const possibleCountry = parts.at(-1)?.toUpperCase();
  const hasCountry = /^[A-Z]{2}$/.test(possibleCountry || '');
  let countryCode = hasCountry ? possibleCountry : null;
  let region = hasCountry ? (parts.length > 1 ? parts.at(-2) : null) : (parts.length > 1 ? parts.at(-1) : null);

  // Legacy V3 labels omitted US when a state was present. This preserves
  // correct grouping until the disposable 30-day rollups are regenerated.
  if (!countryCode && US_STATES.has(region)) countryCode = 'US';
  if (!countryCode) countryCode = 'ZZ';
  if (countryCode !== 'US') region = null;

  const countryName = countryCode === 'ZZ'
    ? 'International / other'
    : (COUNTRY_NAMES?.of(countryCode) || countryCode);
  const displayParts = [...parts];
  if (hasCountry) displayParts.pop();
  if (countryCode === 'US' && displayParts.length > 1 && displayParts.at(-1) === region) displayParts.pop();
  return { label, displayLabel: displayParts.join(', ') || label, countryCode, countryName, region: region || 'Unknown state' };
}

function stateColor(state) {
  const stateIndex = US_STATE_NAMES.indexOf(state);
  const index = stateIndex >= 0 ? stateIndex : US_STATE_NAMES.length;
  // Golden-angle spacing gives every state a stable, distinct hue.
  return `hsl(${Math.round((index * 137.508) % 360)} 48% 64%)`;
}

function renderGeography(title, rows, { imageViews = false } = {}) {
  if (!rows?.length) {
    const columns = imageViews ? 3 : 2;
    return `<section class="panel"><h2>${escapeHtml(title)}</h2><table class="geo-table"><tbody><tr><td colspan="${columns}" class="empty">No activity in this window.</td></tr></tbody></table></section>`;
  }

  const enriched = rows.map((row) => ({ ...row, ...parseGeoLabel(row.label) }));
  const countries = new Map();
  for (const row of enriched) {
    if (!countries.has(row.countryCode)) countries.set(row.countryCode, []);
    countries.get(row.countryCode).push(row);
  }
  const total = (items, field) => items.reduce((sum, row) => sum + Number(row[field] || 0), 0);
  const countryGroups = [...countries].sort((a, b) => {
    if (a[0] === 'US') return -1;
    if (b[0] === 'US') return 1;
    return (total(b[1], 'count') - total(a[1], 'count')) || a[1][0].countryName.localeCompare(b[1][0].countryName);
  });

  const body = countryGroups.map(([countryCode, countryRows]) => {
    const countryCount = total(countryRows, 'count');
    const countryImageViews = total(countryRows, 'imageViews');
    const countrySummary = imageViews
      ? `${formatNumber(countryCount)} ${countryCount === 1 ? 'viewer' : 'viewers'} · ${formatNumber(countryImageViews)} ${countryImageViews === 1 ? 'image' : 'images'}`
      : `${formatNumber(countryCount)} ${countryCount === 1 ? 'visitor' : 'visitors'}`;
    const countryHeader = `<tr class="geo-country"><th>${escapeHtml(countryRows[0].countryName)} <span class="geo-group-total">${countrySummary}</span></th><th></th>${imageViews ? '<th></th>' : ''}</tr>`;
    if (countryCode !== 'US') {
      return countryHeader + countryRows.sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label))
        .map((row) => `<tr class="geo-row geo-international"><td title="${escapeHtml(row.label)}">${escapeHtml(row.displayLabel)}</td><td>${formatNumber(row.count)}</td>${imageViews ? `<td>${formatNumber(row.imageViews)}</td>` : ''}</tr>`).join('');
    }

    const states = new Map();
    for (const row of countryRows) {
      if (!states.has(row.region)) states.set(row.region, []);
      states.get(row.region).push(row);
    }
    return countryHeader + [...states].sort((a, b) => (total(b[1], 'count') - total(a[1], 'count')) || a[0].localeCompare(b[0]))
      .map(([state, stateRows]) => {
        const color = stateColor(state);
        const stateCount = total(stateRows, 'count');
        const stateImageViews = total(stateRows, 'imageViews');
        const stateSummary = imageViews
          ? `${formatNumber(stateCount)} ${stateCount === 1 ? 'viewer' : 'viewers'} · ${formatNumber(stateImageViews)} ${stateImageViews === 1 ? 'image' : 'images'}`
          : `${formatNumber(stateCount)} ${stateCount === 1 ? 'visitor' : 'visitors'}`;
        const stateHeader = `<tr class="geo-state" style="--state-color:${color}"><th>${escapeHtml(state)} <span class="geo-group-total">${stateSummary}</span></th><th></th>${imageViews ? '<th></th>' : ''}</tr>`;
        const locations = stateRows.sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label))
          .map((row) => `<tr class="geo-row geo-us" style="--state-color:${color}"><td title="${escapeHtml(row.label)}">${escapeHtml(row.displayLabel)}</td><td>${formatNumber(row.count)}</td>${imageViews ? `<td>${formatNumber(row.imageViews)}</td>` : ''}</tr>`).join('');
        return stateHeader + locations;
      }).join('');
  }).join('');

  const heading = imageViews
    ? '<thead><tr><th>Location</th><th>Viewers</th><th>Images viewed</th></tr></thead>'
    : '<thead><tr><th>Location</th><th>Visitors</th></tr></thead>';
  return `<section class="panel"><h2>${escapeHtml(title)}</h2><table class="geo-table">${heading}<tbody>${body}</tbody></table></section>`;
}

function renderImages(title, rows) {
  const orderedRows = rows?.length ? [...rows].sort((a, b) => {
    const aIsUs = a.dominantGeo && parseGeoLabel(a.dominantGeo).countryCode === 'US';
    const bIsUs = b.dominantGeo && parseGeoLabel(b.dominantGeo).countryCode === 'US';
    return Number(bIsUs) - Number(aIsUs);
  }) : [];
  const body = orderedRows.length ? orderedRows.map((row, index) => {
    const imageId = String(row.imageId || row.label || '');
    const pagePath = row.pagePath && String(row.pagePath).startsWith('/') ? String(row.pagePath) : `/art/${encodeURIComponent(imageId)}`;
    const href = `https://www.k4studios.com${pagePath}`;
    const thumb = `https://www.k4studios.com/img/${encodeURIComponent(imageId)}/s`;
    const priced = Number(row.pricingOpens || 0) > 0;
    const dominantGeo = row.dominantGeo ? parseGeoLabel(row.dominantGeo) : null;
    const stateAccent = dominantGeo?.countryCode === 'US';
    const geoStyle = stateAccent ? ` style="--image-geo-color:${stateColor(dominantGeo.region)}"` : '';
    const geoBar = stateAccent
      ? `<i class="image-geo-bar" title="${escapeHtml(`Top viewer city: ${dominantGeo.displayLabel}, ${dominantGeo.region} · ${formatNumber(row.dominantGeoViews)} ${Number(row.dominantGeoViews) === 1 ? 'view' : 'views'}`)}" aria-label="Dominant viewer location"></i>`
      : '';
    const geoLabel = dominantGeo
      ? `<small class="image-geo-label">Top area: ${escapeHtml(stateAccent ? dominantGeo.region : dominantGeo.countryName)} · ${formatNumber(row.dominantGeoViews)} ${Number(row.dominantGeoViews) === 1 ? 'view' : 'views'}</small>`
      : '';
    return `<a class="image-row${priced ? ' pricing-opened' : ''}${stateAccent ? ' image-geo-us' : ''}"${geoStyle} href="${escapeHtml(href)}" target="_blank" rel="noopener">${geoBar}<img src="${escapeHtml(thumb)}" alt="" loading="${index < 4 ? 'eager' : 'lazy'}"><span><strong>${escapeHtml(imageId)}</strong><small title="${escapeHtml(pagePath)}">${escapeHtml(pagePath)}</small>${geoLabel}${priced ? `<em>Pricing: ${formatNumber(row.pricingOpens)}</em>` : ''}</span><b>${formatNumber(row.count)}</b></a>`;
  }).join('') : '<p class="empty">No image activity in this window.</p>';
  return `<section class="panel"><h2>${escapeHtml(title)}</h2><div class="image-list">${body}</div></section>`;
}

function renderCoreActions(groups, actions) {
  return `<section class="panel actions-panel"><h2>Core actions and groups</h2><div class="action-columns"><div><h3>Groups</h3>${renderRows(groups)}</div><div><h3>Actions</h3>${renderRows(actions)}</div></div></section>`;
}

function renderCartFunnel(rows) {
  return `<section class="panel cart-funnel"><h2>Shopping cart funnel</h2><p class="fineprint">Browser sessions reaching each step in this reporting window.</p>${renderRows(rows)}</section>`;
}

function renderHomepageWidgetClicks(counts) {
  return renderTable('Homepage widget clicks', [
    { label: 'Cowboy widget clicks', count: counts?.cowboy_widget_clicks || 0 },
    { label: 'Picture Show widget clicks', count: counts?.picture_shows_widget_clicks || 0 }
  ]);
}

function renderRows(rows) {
  if (!rows?.length) return '<p class="empty">No activity in this window.</p>';
  return `<table><tbody>${rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${formatNumber(row.count)}</td></tr>`).join('')}</tbody></table>`;
}

export function renderV3Diagnostics(data) {
  return `<div class="diagnostic-grid">${renderTable('Non-core event mix', data?.eventMix)}${renderTable('Network mix', data?.asnMix)}${renderTable('User agents', data?.userAgents)}</div><p class="fineprint">Diagnostics were queried manually. Reloading the main report does not run these queries.</p>`;
}

export function renderDashboardV3({ summary }) {
  const window = summary?.window || { key: 'today', label: 'Today' };
  const state = summary?.state || {};
  const windows = [['today','Today'],['yesterday','Yesterday'],['7d','7 days'],['30d','30 days']]
    .map(([key,label]) => `<a class="${window.key === key ? 'active' : ''}" href="/__k4stats-v3?window=${key}">${label}</a>`).join('');
  const lastEvent = state.last_event_ts ? escapeHtml(state.last_event_ts) : 'not initialized';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>K4 Analytics V3</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Glegoo:wght@400;700&display=swap" rel="stylesheet"><style>
  :root{color-scheme:dark;--bg:#11130f;--panel:#1b1f18;--line:#343b2f;--gold:#d8b46a;--text:#f2f0e8;--muted:#a8ad9f;--entry-accent:#c996e8;--site-accent:#72bdd2}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.45 'Glegoo',serif}main{max-width:1180px;margin:auto;padding:28px 18px 60px}header{display:flex;justify-content:space-between;gap:20px;align-items:end;flex-wrap:wrap}h1{margin:0;font:700 30px/1.25 'Glegoo',serif;color:var(--gold)}h2{font-size:17px;margin:0 0 12px}h3{font-size:13px;color:var(--muted);text-transform:uppercase}.sub,.fineprint{color:var(--muted)}nav,.update{display:flex;gap:7px;align-items:center;flex-wrap:wrap}nav a,button{border:1px solid var(--line);background:#24291f;color:var(--text);padding:8px 11px;border-radius:7px;text-decoration:none;cursor:pointer;font-family:inherit}nav a.active{border-color:var(--gold);color:var(--gold)}nav a.filter-toggle{margin-left:5px;border-color:#56705d}nav a.filter-active{border-color:#5fc47a;background:#193722;color:#a8edb9}button.primary{background:#735c2f;border-color:var(--gold)}button:disabled{opacity:.55;cursor:wait}.update{margin:18px 0}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;margin:18px 0}.card,.panel,.system{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:15px}.card span{display:block;color:var(--muted);font-size:12px;text-transform:uppercase}.card strong{display:block;font-size:27px;margin-top:5px}.card.pricing-opened{border-color:#318a4b;background:#173621;box-shadow:inset 3px 0 #56c777}.card.pricing-opened span{color:#91e6a8}.grid,.diagnostic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.entry-site-stack{display:flex;flex-direction:column;gap:12px;min-width:0}.panel.accent-entry{border-color:color-mix(in srgb,var(--entry-accent) 55%,var(--line))}.panel.accent-site{border-color:color-mix(in srgb,var(--site-accent) 55%,var(--line))}.panel.accent-entry>h2,.panel.accent-site>h2{margin:-15px -15px 12px;padding:10px 14px;border-radius:9px 9px 0 0;border-bottom:1px solid currentColor}.panel.accent-entry>h2{color:var(--entry-accent);background:#2b2130}.panel.accent-site>h2{color:var(--site-accent);background:#182d32}.panel table{width:100%;border-collapse:collapse}.panel th{padding:4px 2px 7px;color:var(--muted);font-size:11px;font-weight:600;text-align:left;text-transform:uppercase}.panel td{padding:7px 2px;border-top:1px solid #292e25}.panel td:first-child{max-width:430px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.panel td:last-child{text-align:right;color:var(--gold);font-variant-numeric:tabular-nums}.entry-navigation table{table-layout:fixed}.entry-navigation .entries-col{width:52px}.entry-navigation .continued-col{width:72px}.entry-navigation .chapter-col{width:58px}.entry-navigation th:not(:first-child),.entry-navigation td:not(:first-child){text-align:right}.entry-navigation th{font-size:9px}.entry-navigation td:nth-child(n+2){color:var(--gold);font-variant-numeric:tabular-nums}.oim-domain-funnel{grid-column:1/-1}.oim-domain-funnel>p{margin:-3px 0 11px;font-size:12px}.page-link{color:var(--text);text-decoration:none}.page-link:hover{color:var(--gold);text-decoration:underline}.device-section{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:8px;border:2px solid #566149;border-radius:13px;background:#151912;box-shadow:0 0 0 1px #0c0e0b,inset 0 0 18px #0c0e0b}.device-panel{border-color:#414a39}.device-panel th:not(:first-child),.device-panel td:not(:first-child){text-align:right}.device-panel td:nth-child(2){color:var(--text);font-variant-numeric:tabular-nums}.device-icon{display:inline-block;width:34px;margin-right:8px;padding:2px 3px;border:1px solid currentColor;border-radius:4px;color:var(--device-color);background:color-mix(in srgb,var(--device-color) 12%,transparent);font:700 9px/1.2 system-ui;text-align:center}.device-windows{--device-color:#69a9ff}.device-mac{--device-color:#c7a6ff}.device-apple-mobile{--device-color:#ff91b8}.device-android{--device-color:#75d876}.device-other{--device-color:#d8b46a}.device-panel tr[class^="device-"] td:first-child{border-left:3px solid var(--device-color);padding-left:8px}.geo-table th:not(:first-child),.geo-table td:not(:first-child){text-align:right}.geo-table td:nth-child(2){color:var(--muted);font-variant-numeric:tabular-nums}.geo-table .geo-country th{padding:10px 3px 6px;border-top:2px solid var(--line);color:var(--gold);font-size:12px}.geo-table .geo-state th{padding:7px 3px 5px;border-top:1px solid color-mix(in srgb,var(--state-color) 50%,transparent);color:var(--state-color);font-size:11px}.geo-table .geo-us td:first-child{padding-left:11px;border-left:3px solid var(--state-color)}.geo-table .geo-us td{background:color-mix(in srgb,var(--state-color) 7%,transparent)}.geo-table .geo-international td{background:#181b16}.system{margin-top:14px}.system summary{cursor:pointer;font-weight:650}.system-controls{display:flex;gap:10px;align-items:center;margin:14px 0}.error{color:#ff9c91}.empty{color:var(--muted)!important;text-align:left!important}.image-row{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 5px;border-top:1px solid #292e25;color:var(--text);text-decoration:none}.image-row img{width:48px;height:48px;object-fit:cover;border-radius:5px;background:#0b0d0a}.image-row span,.image-row small{display:block;min-width:0}.image-row small{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.image-row .image-geo-label{color:#c8cbbf;font-size:11px}.image-row b{color:var(--gold)}.image-row em{display:inline-block;margin-top:3px;color:#91e6a8;font-size:11px;font-style:normal;font-weight:700;text-transform:uppercase}.image-row.pricing-opened{margin:3px 0;border:1px solid #318a4b;border-radius:7px;background:#173621;box-shadow:inset 3px 0 #56c777}.image-row.pricing-opened img{outline:2px solid #56c777}.image-row.image-geo-us{position:relative;padding-left:14px}.image-geo-bar{position:absolute;inset:3px auto 3px 0;width:8px;border-radius:0 4px 4px 0;background:var(--image-geo-color);cursor:help}.action-columns{display:grid;grid-template-columns:1fr 2fr;gap:24px}.actions-panel{grid-column:1/-1}@media(max-width:720px){.grid,.diagnostic-grid,.action-columns,.device-section{grid-template-columns:1fr}}
  .geo-group-total{margin-left:5px;color:var(--muted);font-size:10px;font-weight:400;text-transform:none}
  </style></head><body><main><header><div><h1>K4 Analytics V3</h1><div class="sub">${escapeHtml(window.label)} · confirmed browser activity</div></div><nav>${windows}</nav></header>
  <div class="update"><button class="primary" id="update-stats" type="button">Update with new rows</button><span id="update-status" class="sub">Current through ${lastEvent} · row ${formatNumber(state.last_raw_event_id)}</span></div>
  <div class="cards">${renderCards(summary?.counts || {})}</div><div class="grid"><div class="device-section">${renderDevices('Site visitor devices', summary?.siteDevices)}${renderDevices('Image viewer devices', summary?.imageDevices)}</div>${renderOimDomainFunnel(summary?.oimDomainFunnel)}${renderTable('Top 25 entry pages', summary?.entryPages, { linkPaths: true, accent: 'entry' })}<div class="entry-site-stack">${renderEntryNavigation(summary?.entryNavigation)}${renderTable('Top 10 site pages', summary?.topPages, { linkPaths: true, accent: 'site' })}</div>${renderCartFunnel(summary?.cartFunnel)}<div class="entry-site-stack">${renderHomepageWidgetClicks(summary?.counts)}${renderTable('Expedition activity', summary?.expeditionActions)}</div>${renderImages(`Images accessed ${window.label.toLowerCase()}`, summary?.topImages)}${renderGeography('Visitor geography', summary?.visitorGeography)}${renderGeography('Image viewer geography', summary?.imageGeography, { imageViews: true })}${renderTable('Entry sources', summary?.acquisition)}${renderCoreActions(summary?.actionGroups, summary?.actions)}</div>
  <details class="system"><summary>System & bot diagnostics</summary><p class="sub">This section makes no database queries until you request it.</p><div class="system-controls"><button id="load-diagnostics" type="button">Load diagnostics</button><span id="diagnostic-status" class="sub"></span></div><div id="diagnostics"></div></details>
  <p class="fineprint">The owner IP is excluded before persistence and from existing rollups. Opening V3 reads only compact summaries; it does not scan raw event history.</p>
  <script>
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.getElementById('update-stats').addEventListener('click',async function(){const b=this,s=document.getElementById('update-status');b.disabled=true;let total=0,d={hasMore:true};try{s.textContent='Catching up new rows…';const r=await fetch('/__k4stats-v3/update?maxRows=1000',{method:'POST',credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error(await r.text());d=await r.json();total=Number(d.scanned||0);s.textContent='Current through '+(d.lastEventTs||'unknown')+' · '+total.toLocaleString()+' rows processed';if(d.hasMore){s.textContent+=' · more rows remain; click again to continue';b.disabled=false;}else{s.textContent+=' · caught up; reloading…';location.reload();}}catch(e){s.innerHTML='<span class="error">Update failed: '+esc(e.message||e)+'</span>';b.disabled=false;}});
  document.getElementById('load-diagnostics').addEventListener('click',async function(){const b=this,s=document.getElementById('diagnostic-status'),t=document.getElementById('diagnostics');b.disabled=true;s.textContent='Loading…';try{const r=await fetch('/__k4stats-v3/diagnostics?window=${encodeURIComponent(window.key)}',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error(await r.text());t.innerHTML=await r.text();s.textContent='Loaded just now';}catch(e){s.textContent='';t.innerHTML='<p class="error">Could not load diagnostics: '+esc(e.message||e)+'</p>';b.disabled=false;}});
  </script></main></body></html>`;
}
