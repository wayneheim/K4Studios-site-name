function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatNumber(value) { return Number(value || 0).toLocaleString('en-US'); }

function renderCards(counts) {
  return [
    ['Visitors', counts?.visitors], ['Sessions', counts?.sessions], ['Page loads', counts?.page_views],
    ['Image views', counts?.image_views], ['Engaged sessions', counts?.engaged_sessions],
    ['Pricing opens', counts?.pricing_opens], ['Orders submitted', counts?.order_submits]
  ].map(([label, value]) => `<article class="card"><span>${label}</span><strong>${formatNumber(value)}</strong></article>`).join('');
}

function renderTable(title, rows) {
  const body = rows?.length
    ? rows.map((row) => `<tr><td title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</td><td>${formatNumber(row.count)}</td></tr>`).join('')
    : '<tr><td colspan="2" class="empty">No activity in this window.</td></tr>';
  return `<section class="panel"><h2>${escapeHtml(title)}</h2><table><tbody>${body}</tbody></table></section>`;
}

function renderImages(title, rows) {
  const body = rows?.length ? rows.map((row, index) => {
    const imageId = String(row.imageId || row.label || '');
    const pagePath = row.pagePath && String(row.pagePath).startsWith('/') ? String(row.pagePath) : `/art/${encodeURIComponent(imageId)}`;
    const href = `https://www.k4studios.com${pagePath}`;
    const thumb = `https://www.k4studios.com/img/${encodeURIComponent(imageId)}/s`;
    const priced = Number(row.pricingOpens || 0) > 0;
    return `<a class="image-row${priced ? ' pricing-opened' : ''}" href="${escapeHtml(href)}" target="_blank" rel="noopener"><img src="${escapeHtml(thumb)}" alt="" loading="${index < 4 ? 'eager' : 'lazy'}"><span><strong>${escapeHtml(imageId)}</strong><small title="${escapeHtml(pagePath)}">${escapeHtml(pagePath)}</small>${priced ? '<em>Pricing opened</em>' : ''}</span><b>${formatNumber(row.count)}</b></a>`;
  }).join('') : '<p class="empty">No image activity in this window.</p>';
  return `<section class="panel"><h2>${escapeHtml(title)}</h2><div class="image-list">${body}</div></section>`;
}

function renderCoreActions(groups, actions) {
  return `<section class="panel actions-panel"><h2>Core actions and groups</h2><div class="action-columns"><div><h3>Groups</h3>${renderRows(groups)}</div><div><h3>Actions</h3>${renderRows(actions)}</div></div></section>`;
}

function renderImageGeography(rows) {
  const body = rows?.length
    ? rows.map((row) => `<tr><td title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</td><td>${formatNumber(row.count)}</td><td>${formatNumber(row.imageViews)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="empty">No activity in this window.</td></tr>';
  return `<section class="panel"><h2>Image viewer geography</h2><table class="geo-table"><thead><tr><th>Location</th><th>Viewers</th><th>Images viewed</th></tr></thead><tbody>${body}</tbody></table></section>`;
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>K4 Analytics V3</title><style>
  :root{color-scheme:dark;--bg:#11130f;--panel:#1b1f18;--line:#343b2f;--gold:#d8b46a;--text:#f2f0e8;--muted:#a8ad9f}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.45 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:28px 18px 60px}header{display:flex;justify-content:space-between;gap:20px;align-items:end;flex-wrap:wrap}h1{margin:0;font:600 30px Georgia,serif;color:var(--gold)}h2{font-size:17px;margin:0 0 12px}h3{font-size:13px;color:var(--muted);text-transform:uppercase}.sub,.fineprint{color:var(--muted)}nav,.update{display:flex;gap:7px;align-items:center;flex-wrap:wrap}nav a,button{border:1px solid var(--line);background:#24291f;color:var(--text);padding:8px 11px;border-radius:7px;text-decoration:none;cursor:pointer}nav a.active{border-color:var(--gold);color:var(--gold)}button.primary{background:#735c2f;border-color:var(--gold)}button:disabled{opacity:.55;cursor:wait}.update{margin:18px 0}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;margin:18px 0}.card,.panel,.system{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:15px}.card span{display:block;color:var(--muted);font-size:12px;text-transform:uppercase}.card strong{display:block;font-size:27px;margin-top:5px}.grid,.diagnostic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.panel table{width:100%;border-collapse:collapse}.panel th{padding:4px 2px 7px;color:var(--muted);font-size:11px;font-weight:600;text-align:left;text-transform:uppercase}.panel td{padding:7px 2px;border-top:1px solid #292e25}.panel td:first-child{max-width:430px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.panel td:last-child{text-align:right;color:var(--gold);font-variant-numeric:tabular-nums}.geo-table th:not(:first-child),.geo-table td:not(:first-child){text-align:right}.geo-table td:nth-child(2){color:var(--muted);font-variant-numeric:tabular-nums}.system{margin-top:14px}.system summary{cursor:pointer;font-weight:650}.system-controls{display:flex;gap:10px;align-items:center;margin:14px 0}.error{color:#ff9c91}.empty{color:var(--muted)!important;text-align:left!important}.image-row{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 5px;border-top:1px solid #292e25;color:var(--text);text-decoration:none}.image-row img{width:48px;height:48px;object-fit:cover;border-radius:5px;background:#0b0d0a}.image-row span,.image-row small{display:block;min-width:0}.image-row small{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.image-row b{color:var(--gold)}.image-row em{display:inline-block;margin-top:3px;color:#91e6a8;font-size:11px;font-style:normal;font-weight:700;text-transform:uppercase}.image-row.pricing-opened{margin:3px 0;border:1px solid #318a4b;border-radius:7px;background:#173621;box-shadow:inset 3px 0 #56c777}.image-row.pricing-opened img{outline:2px solid #56c777}.action-columns{display:grid;grid-template-columns:1fr 2fr;gap:24px}.actions-panel{grid-column:1/-1}@media(max-width:720px){.grid,.diagnostic-grid,.action-columns{grid-template-columns:1fr}}
  </style></head><body><main><header><div><h1>K4 Analytics V3</h1><div class="sub">${escapeHtml(window.label)} · confirmed browser activity</div></div><nav>${windows}</nav></header>
  <div class="update"><button class="primary" id="update-stats" type="button">Update with new rows</button><span id="update-status" class="sub">Current through ${lastEvent} · row ${formatNumber(state.last_raw_event_id)}</span></div>
  <div class="cards">${renderCards(summary?.counts || {})}</div><div class="grid">${renderTable('Top 25 entry pages', summary?.entryPages)}${renderTable('Top 10 site pages', summary?.topPages)}${renderImages(`Images accessed ${window.label.toLowerCase()}`, summary?.topImages)}${renderTable('Visitor geography', summary?.visitorGeography)}${renderImageGeography(summary?.imageGeography)}${renderTable('Entry sources', summary?.acquisition)}${renderCoreActions(summary?.actionGroups, summary?.actions)}</div>
  <details class="system"><summary>System & bot diagnostics</summary><p class="sub">This section makes no database queries until you request it.</p><div class="system-controls"><button id="load-diagnostics" type="button">Load diagnostics</button><span id="diagnostic-status" class="sub"></span></div><div id="diagnostics"></div></details>
  <p class="fineprint">Opening V3 reads only compact summaries. Updating scans raw rows after the saved row cursor and never rebuilds prior history.</p>
  <script>
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  document.getElementById('update-stats').addEventListener('click',async function(){const b=this,s=document.getElementById('update-status');b.disabled=true;let total=0,round=0,d={hasMore:true};try{while(d.hasMore&&round<10){s.textContent='Catching up new rows… '+total.toLocaleString()+' processed';const r=await fetch('/__k4stats-v3/update?maxRows=5000',{method:'POST',credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error(await r.text());d=await r.json();total+=Number(d.scanned||0);round+=1;s.textContent='Current through '+(d.lastEventTs||'unknown')+' · '+total.toLocaleString()+' rows processed';if(!d.scanned)break;}if(d.hasMore){s.textContent+=' · more rows remain; click again to continue';b.disabled=false;}else{s.textContent+=' · caught up; reloading…';location.reload();}}catch(e){s.innerHTML='<span class="error">Update failed: '+esc(e.message||e)+'</span>';b.disabled=false;}});
  document.getElementById('load-diagnostics').addEventListener('click',async function(){const b=this,s=document.getElementById('diagnostic-status'),t=document.getElementById('diagnostics');b.disabled=true;s.textContent='Loading…';try{const r=await fetch('/__k4stats-v3/diagnostics?window=${encodeURIComponent(window.key)}',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw new Error(await r.text());t.innerHTML=await r.text();s.textContent='Loaded just now';}catch(e){s.textContent='';t.innerHTML='<p class="error">Could not load diagnostics: '+esc(e.message||e)+'</p>';b.disabled=false;}});
  </script></main></body></html>`;
}
