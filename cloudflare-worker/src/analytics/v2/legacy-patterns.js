function withNoCache(headersInit = {}) {
  const headers = new Headers(headersInit);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('Vary', 'Authorization');
  return headers;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function detectBotLike(ua) {
  const text = String(ua || '').toLowerCase();
  if (!text) return false;
  return /(bot|spider|crawler|bingpreview|headless|curl|wget|python-requests|httpclient)/i.test(text);
}

const EASTERN_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function getEasternDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return EASTERN_DATE_FORMATTER.format(date);
}

// Keep this aligned with netlify/functions/smart-404.cjs LEGACY_RECOVERY_PREFIXES.
const RUNTIME_ALLOWED_BYPASSES = [
  '/photography-galleries/painterly-photography',
  '/photography-galleries/traditional-photos'
];

function normalizePatternPrefix(pathValue) {
  const path = String(pathValue || '').trim();
  if (!path.startsWith('/')) return '/';

  const noImageTail = path.replace(/\/i-[A-Za-z0-9_-]+(?:\/[A-Z])?\/?$/i, '');
  const segments = noImageTail.split('/').filter(Boolean);
  if (segments.length < 2) return noImageTail.toLowerCase() || '/';

  if (segments[0].toLowerCase() === 'photography-galleries') {
    return `/${segments[0]}/${segments[1]}`.toLowerCase();
  }

  if (segments[0].toLowerCase() === 'galleries') {
    return `/${segments[0]}/${segments[1]}`.toLowerCase();
  }

  return `/${segments[0]}/${segments[1]}`.toLowerCase();
}

function classifyOutcome(eventType) {
  const t = String(eventType || '').toLowerCase();
  if (t === 'smart404_image_relocated' || t === 'smart404_legacy_gallery_canonicalized' || t === '301') return 'recovered';
  if (t === 'smart404_locked' || t === 'smart404_blocked_suspicious') return 'blocked';
  return 'notfound';
}

async function ensureOverridesTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS legacy_pattern_overrides (
      pattern_prefix TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('use', 'block', 'promoted', 'suppressed')),
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // If this table already exists with an older strict CHECK, rebuild once
  // so new statuses (use/block) can be stored.
  const schema = await env.DB.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = 'legacy_pattern_overrides'
    LIMIT 1
  `).first();

  const sql = String(schema?.sql || '').toLowerCase();
  const needsRebuild = sql.includes("check(status in ('promoted', 'suppressed'))");
  if (!needsRebuild) return;

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS legacy_pattern_overrides_new (
      pattern_prefix TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK(status IN ('use', 'block', 'promoted', 'suppressed')),
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    INSERT INTO legacy_pattern_overrides_new (pattern_prefix, status, note, created_at, updated_at)
    SELECT
      pattern_prefix,
      CASE
        WHEN status = 'promoted' THEN 'use'
        WHEN status = 'suppressed' THEN 'block'
        ELSE status
      END,
      note,
      created_at,
      updated_at
    FROM legacy_pattern_overrides
  `).run();

  await env.DB.prepare(`DROP TABLE legacy_pattern_overrides`).run();
  await env.DB.prepare(`ALTER TABLE legacy_pattern_overrides_new RENAME TO legacy_pattern_overrides`).run();
}

async function getOverridesMap(env) {
  await ensureOverridesTable(env);
  const result = await env.DB.prepare(`
    SELECT pattern_prefix, status, note, updated_at
    FROM legacy_pattern_overrides
    ORDER BY updated_at DESC
  `).all();
  const rows = result?.results || [];
  return new Map(rows.map((row) => {
    const raw = String(row?.status || '').toLowerCase();
    const normalizedStatus = raw === 'promoted' ? 'use' : raw === 'suppressed' ? 'block' : raw;
    return [String(row.pattern_prefix || '').toLowerCase(), { ...row, status: normalizedStatus }];
  }));
}

async function getPatternCandidates(env, days) {
  const n = Math.max(1, Math.min(Number(days || 7), 30));
  const todayEtKey = getEasternDateKey(new Date());
  const result = await env.DB.prepare(`
    SELECT
      event_type,
      target_id,
      ua,
      ts
    FROM raw_events
    WHERE source = 'edge'
      AND ts > datetime('now', '-${n} days')
      AND target_id LIKE '/%'
      AND (
        target_id LIKE '/Photography-Galleries/%'
        OR target_id LIKE '/Galleries/%'
      )
      AND (
        event_type IN (
          'smart404_image_relocated',
          'smart404_legacy_gallery_canonicalized',
          'smart404_locked',
          'smart404_invalid_gallery_path',
          'smart404_invalid_id_format',
          'smart404_no_image_id',
          'smart404_notfound',
          'smart404_blocked_suspicious',
          '301',
          '404',
          '410'
        )
      )
    ORDER BY ts DESC
    LIMIT 8000
  `).all();

  const rows = result?.results || [];
  const buckets = new Map();

  for (const row of rows) {
    const prefix = normalizePatternPrefix(row.target_id);
    if (!prefix || prefix === '/') continue;
    const key = prefix;
    const item = buckets.get(key) || {
      pattern_prefix: prefix,
      total_hits: 0,
      today_hits: 0,
      recovered_hits: 0,
      blocked_hits: 0,
      notfound_hits: 0,
      bot_like_hits: 0,
      unique_paths: new Set(),
      last_seen: null,
      sample_path: null
    };

    item.total_hits += 1;
  if (getEasternDateKey(row.ts) === todayEtKey) item.today_hits += 1;
    const outcome = classifyOutcome(row.event_type);
    if (outcome === 'recovered') item.recovered_hits += 1;
    else if (outcome === 'blocked') item.blocked_hits += 1;
    else item.notfound_hits += 1;

    if (detectBotLike(row.ua)) item.bot_like_hits += 1;
    if (row.target_id) {
      item.unique_paths.add(String(row.target_id));
      if (!item.sample_path) item.sample_path = String(row.target_id);
    }
    if (!item.last_seen || String(row.ts || '') > item.last_seen) item.last_seen = String(row.ts || '');
    buckets.set(key, item);
  }

  const candidates = Array.from(buckets.values()).map((item) => ({
    pattern_prefix: item.pattern_prefix,
    total_hits: item.total_hits,
    today_hits: item.today_hits,
    recovered_hits: item.recovered_hits,
    blocked_hits: item.blocked_hits,
    notfound_hits: item.notfound_hits,
    bot_like_hits: item.bot_like_hits,
    unique_paths: item.unique_paths.size,
    sample_path: item.sample_path,
    last_seen: item.last_seen,
    recovery_rate: item.total_hits > 0 ? Math.round((item.recovered_hits / item.total_hits) * 100) : 0,
    bot_share: item.total_hits > 0 ? Math.round((item.bot_like_hits / item.total_hits) * 100) : 0
  }));

  // Always include runtime allow-list prefixes, even when not hit in the window.
  const existing = new Set(candidates.map((c) => String(c.pattern_prefix || '').toLowerCase()));
  for (const prefix of RUNTIME_ALLOWED_BYPASSES) {
    const normalized = String(prefix || '').toLowerCase();
    if (existing.has(normalized)) continue;
    candidates.push({
      pattern_prefix: normalized,
      total_hits: 0,
      today_hits: 0,
      recovered_hits: 0,
      blocked_hits: 0,
      notfound_hits: 0,
      bot_like_hits: 0,
      unique_paths: 0,
      sample_path: '(no hits in selected window)',
      last_seen: '',
      recovery_rate: 0,
      bot_share: 0
    });
  }

  candidates.sort((a, b) => {
    if (b.total_hits !== a.total_hits) return b.total_hits - a.total_hits;
    return String(a.pattern_prefix).localeCompare(String(b.pattern_prefix));
  });

  return { days: n, candidates };
}

function renderLegacyPatternPage({ days, candidates, overrides, authHeader }) {
  const runtimeAllowed = new Set(RUNTIME_ALLOWED_BYPASSES.map((p) => String(p || '').toLowerCase()));
  const todayTotalHits = candidates.reduce((sum, row) => sum + Number(row?.today_hits || 0), 0);
  const windowTotalHits = candidates.reduce((sum, row) => sum + Number(row?.total_hits || 0), 0);
  const rowsHtml = candidates.map((row) => {
    const override = overrides.get(String(row.pattern_prefix || '').toLowerCase()) || null;
    const isRuntimeAllowed = runtimeAllowed.has(String(row.pattern_prefix || '').toLowerCase());
    const status = override?.status || (isRuntimeAllowed ? 'use' : 'candidate');
    const note = override?.note || '';
    const statusClass = status === 'use' ? 'status-use' : status === 'block' ? 'status-block' : 'status-candidate';
    const statusLabel = status === 'use' ? 'Use' : status === 'block' ? 'Block' : 'Candidate';
    const runtimeBadge = isRuntimeAllowed ? '<span class="runtime-allow-pill">Runtime Allowed</span>' : '';

    return `
      <tr>
        <td><code>${escapeHtml(row.pattern_prefix)}</code> ${runtimeBadge}</td>
        <td>${row.today_hits}</td>
        <td>${row.total_hits}</td>
        <td>${row.recovered_hits}</td>
        <td>${row.notfound_hits}</td>
        <td>${row.blocked_hits}</td>
        <td>${row.recovery_rate}%</td>
        <td>${row.bot_share}%</td>
        <td>${row.unique_paths}</td>
        <td title="${escapeHtml(row.sample_path || '')}">${escapeHtml(row.sample_path || '')}</td>
        <td>${escapeHtml(row.last_seen || '')}</td>
        <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
        <td>
          <div class="actions">
            <button type="button" onclick="updatePattern('${escapeHtml(row.pattern_prefix)}', 'use')">Use</button>
            <button type="button" class="warn" onclick="updatePattern('${escapeHtml(row.pattern_prefix)}', 'block')">Block</button>
            <button type="button" class="ghost" onclick="updatePattern('${escapeHtml(row.pattern_prefix)}', 'reset')">Reset</button>
          </div>
          <div class="note-wrap">
            <input id="note-${escapeHtml(row.pattern_prefix).replace(/[^a-zA-Z0-9_-]/g, '_')}" value="${escapeHtml(note)}" placeholder="optional note">
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>K4 Legacy Pattern Lab</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #111827; color: #e5e7eb; margin: 0; padding: 18px; }
    .container { max-width: 1700px; margin: 0 auto; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    .subtle { color: #9ca3af; margin: 0 0 14px; }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .toolbar a { color: #93c5fd; text-decoration: none; padding: 6px 10px; border-radius: 8px; background: #1f2937; }
    .toolbar a.active { background: #374151; color: #fff; }
    .toolbar a:hover { background: #374151; }
    .summary { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .summary-pill { background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; padding: 6px 10px; font-size: 13px; }
    .summary-pill strong { color: #86efac; }
    table { width: 100%; border-collapse: collapse; background: #0f172a; border: 1px solid #1f2937; }
    th, td { border-bottom: 1px solid #1f2937; padding: 8px; text-align: left; vertical-align: top; font-size: 13px; }
    th { color: #cbd5e1; background: #111827; position: sticky; top: 0; }
    code { color: #fcd34d; }
    .status-pill { border-radius: 999px; padding: 2px 10px; font-size: 12px; }
    .status-candidate { background: #1f2937; color: #cbd5e1; }
    .status-use { background: #064e3b; color: #a7f3d0; }
    .status-block { background: #7f1d1d; color: #fecaca; }
    .runtime-allow-pill { margin-left: 8px; border-radius: 999px; padding: 2px 8px; font-size: 11px; background: #14532d; color: #bbf7d0; }
    .actions { display: flex; gap: 6px; margin-bottom: 6px; }
    button { background: #1d4ed8; color: #fff; border: 0; border-radius: 6px; padding: 4px 9px; cursor: pointer; }
    button.warn { background: #b91c1c; }
    button.ghost { background: #374151; }
    input { width: 220px; background: #111827; color: #e5e7eb; border: 1px solid #374151; border-radius: 6px; padding: 4px 8px; }
    .empty { padding: 18px; background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Legacy Pattern Lab</h1>
    <p class="subtle">Daily pattern candidates from smart-404/edge activity. Runtime allow-list prefixes are always shown in green, even with zero hits in the selected window. Use means "eligible for recovery workflow"; Block means ignore as noise.</p>

    <div class="toolbar">
      <a href="/__k4stats-v2">Back to V2 Dashboard</a>
      <a class="${days === 1 ? 'active' : ''}" href="/__k4stats-v2/legacy-patterns?days=1">1d</a>
      <a class="${days === 3 ? 'active' : ''}" href="/__k4stats-v2/legacy-patterns?days=3">3d</a>
      <a class="${days === 7 ? 'active' : ''}" href="/__k4stats-v2/legacy-patterns?days=7">7d</a>
      <a class="${days === 14 ? 'active' : ''}" href="/__k4stats-v2/legacy-patterns?days=14">14d</a>
      <a class="${days === 30 ? 'active' : ''}" href="/__k4stats-v2/legacy-patterns?days=30">30d</a>
    </div>

    <div class="summary">
      <div class="summary-pill">Today (ET) Hits: <strong>${todayTotalHits}</strong></div>
      <div class="summary-pill">Window Hits (${days}d): <strong>${windowTotalHits}</strong></div>
    </div>

    ${candidates.length ? `
      <table>
        <thead>
          <tr>
            <th>Pattern Prefix</th>
            <th>Today (ET)</th>
            <th>Hits</th>
            <th>Recovered</th>
            <th>Not Found</th>
            <th>Blocked</th>
            <th>Recovery %</th>
            <th>Bot %</th>
            <th>Unique Paths</th>
            <th>Sample Path</th>
            <th>Last Seen</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    ` : '<div class="empty">No candidate data in this window yet.</div>'}

    <p class="subtle" style="margin-top:12px;">Generated ${new Date().toISOString()}</p>
  </div>

  <script>
    const _k4auth = ${JSON.stringify(authHeader || '')};

    function getNote(prefix) {
      const id = 'note-' + String(prefix).replace(/[^a-zA-Z0-9_-]/g, '_');
      const input = document.getElementById(id);
      return input ? input.value : '';
    }

    async function updatePattern(prefix, status) {
      try {
        const response = await fetch('/__k4stats-v2/legacy-patterns/override', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': _k4auth
          },
          body: JSON.stringify({ pattern_prefix: prefix, status, note: getNote(prefix) })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data && data.error ? data.error : 'Update failed');
        }
        window.location.reload();
      } catch (err) {
        alert('Update failed: ' + (err && err.message ? err.message : String(err)));
      }
    }
  </script>
</body>
</html>`;
}

export async function handleLegacyPatternPageRequest(request, env) {
  try {
    const url = new URL(request.url);
    const days = Math.max(1, Math.min(Number(url.searchParams.get('days') || 7), 30));
    const authHeader = request.headers.get('Authorization') || '';
    const [{ candidates }, overrides] = await Promise.all([
      getPatternCandidates(env, days),
      getOverridesMap(env)
    ]);

    return new Response(renderLegacyPatternPage({ days, candidates, overrides, authHeader }), {
      status: 200,
      headers: withNoCache({ 'Content-Type': 'text/html; charset=utf-8' })
    });
  } catch (error) {
    return new Response(`Legacy pattern page error: ${error?.message || String(error)}`, {
      status: 500,
      headers: withNoCache({ 'Content-Type': 'text/plain; charset=utf-8' })
    });
  }
}

export async function handleLegacyPatternOverrideRequest(request, env) {
  try {
    await ensureOverridesTable(env);
    const body = await request.json();
    const patternPrefix = String(body?.pattern_prefix || '').trim().toLowerCase();
    const status = String(body?.status || '').trim().toLowerCase();
    const note = String(body?.note || '').trim();

    if (!patternPrefix.startsWith('/')) {
      return new Response(JSON.stringify({ error: 'pattern_prefix must start with /' }), {
        status: 400,
        headers: withNoCache({ 'Content-Type': 'application/json; charset=utf-8' })
      });
    }

    if (status === 'reset') {
      await env.DB.prepare(`DELETE FROM legacy_pattern_overrides WHERE pattern_prefix = ?`).bind(patternPrefix).run();
      return new Response(JSON.stringify({ ok: true, action: 'reset', pattern_prefix: patternPrefix }), {
        status: 200,
        headers: withNoCache({ 'Content-Type': 'application/json; charset=utf-8' })
      });
    }

    const normalizedStatus = status === 'promoted'
      ? 'use'
      : status === 'suppressed'
      ? 'block'
      : status;

    if (normalizedStatus !== 'use' && normalizedStatus !== 'block') {
      return new Response(JSON.stringify({ error: 'status must be use, block, or reset' }), {
        status: 400,
        headers: withNoCache({ 'Content-Type': 'application/json; charset=utf-8' })
      });
    }

    await env.DB.prepare(`
      INSERT INTO legacy_pattern_overrides (pattern_prefix, status, note, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(pattern_prefix) DO UPDATE SET
        status = excluded.status,
        note = excluded.note,
        updated_at = datetime('now')
    `).bind(patternPrefix, normalizedStatus, note || null).run();

    return new Response(JSON.stringify({ ok: true, pattern_prefix: patternPrefix, status: normalizedStatus }), {
      status: 200,
      headers: withNoCache({ 'Content-Type': 'application/json; charset=utf-8' })
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: withNoCache({ 'Content-Type': 'application/json; charset=utf-8' })
    });
  }
}