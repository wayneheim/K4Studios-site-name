import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../k4-image-proxy.js';

const AUTH = `Basic ${Buffer.from('k4admin:k4analytics2024').toString('base64')}`;

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  async all() {
    if (this.sql.includes('SELECT keyword, priority') && this.sql.includes('FROM serp_keywords')) {
      return {
        results: [
          { keyword: 'regular zero term', priority: 5 },
          { keyword: 'American Western Art', priority: 6 },
          { keyword: 'Art of the West', priority: 6 },
          { keyword: "D'day Ohio Photos", priority: 5 },
          { keyword: 'alternative term', priority: 0 }
        ]
      };
    }
    if (this.sql.includes('SELECT keyword, engine, our_rank FROM serp_results')) {
      return {
        results: [
          { keyword: 'regular zero term', engine: 'google', our_rank: 0 }
        ]
      };
    }
    if (this.sql.includes('SELECT sr1.* FROM serp_results')) {
      return {
        results: [
          { keyword: 'regular zero term', engine: 'google', checked_at: '2026-10-31', our_rank: 12 },
          { keyword: 'regular zero term', engine: 'google_ai', checked_at: '2026-10-31', our_rank: 0 },
          { keyword: 'regular zero term', engine: 'bing', checked_at: '2026-10-31', our_rank: 8 },
          { keyword: 'American Western Art', engine: 'google', checked_at: '2026-10-31', our_rank: 22 },
          { keyword: 'American Western Art', engine: 'google_ai', checked_at: '2026-10-31', our_rank: 14 },
          { keyword: 'American Western Art', engine: 'bing', checked_at: '2026-10-31', our_rank: 19 }
        ]
      };
    }
    if (this.sql.includes('ROW_NUMBER() OVER')) {
      return {
        results: [
          { keyword: 'regular zero term', engine: 'google', our_rank: 18 },
          { keyword: 'regular zero term', engine: 'google_ai', our_rank: 5 },
          { keyword: 'regular zero term', engine: 'bing', our_rank: 11 },
          { keyword: 'American Western Art', engine: 'google', our_rank: 14 },
          { keyword: 'American Western Art', engine: 'google_ai', our_rank: 18 },
          { keyword: 'American Western Art', engine: 'bing', our_rank: 10 }
        ]
      };
    }
    if (this.sql.includes("WHERE engine IN ('google', 'google_ai', 'bing')")) {
      return {
        results: [
          { keyword: 'regular zero term', engine: 'google', checked_at: '2026-10-31', our_rank: 12 },
          { keyword: 'regular zero term', engine: 'google_ai', checked_at: '2026-10-31', our_rank: 0 },
          { keyword: 'regular zero term', engine: 'bing', checked_at: '2026-10-31', our_rank: 8 }
        ]
      };
    }
    return { results: [] };
  }

  async first() {
    return { count: 0 };
  }

  async run() {
    this.db.runs.push({ sql: this.sql, args: this.args });
    return { success: true };
  }
}

class MockDB {
  constructor() {
    this.runs = [];
    this.batches = [];
  }

  prepare(sql) {
    return new MockStatement(this, sql);
  }

  async batch(statements) {
    this.batches.push(statements.map((statement) => ({
      sql: statement.sql,
      args: statement.args
    })));
    return statements.map(() => ({ success: true }));
  }
}

function request(path, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', AUTH);
  return new Request(`https://example.com${path}`, { ...init, headers });
}

function env(db) {
  return { DB: db };
}

test('launch pad keeps zero visible and renders Alternative move controls', async () => {
  const db = new MockDB();
  const response = await worker.fetch(request('/__k4serp?op=launch'), env(db), {
    waitUntil() {}
  });
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');
  assert.match(html, /value="0"/);
  assert.match(html, />Alternative</);
  assert.match(html, />Move Down</);
  assert.match(html, />Move Up</);
  assert.match(html, /Saved today/);
  assert.match(html, /min="0" max="100"/);
  assert.match(html, /data-keyword="D&#39;day Ohio Photos"/);
  assert.doesNotMatch(html, /decodeURIComponent\('D'day Ohio Photos'\)/);
  assert.match(html, /this\.closest\('\.kw-card'\)\.dataset\.keyword/);
  assert.ok(html.indexOf('Doorway Page Names') < html.indexOf('Alternative'));
  assert.ok(html.indexOf('alternative term') > html.indexOf('<strong>Alternative</strong>'));
  assert.ok(html.indexOf('American Western Art') < html.indexOf('Art of the West'));
});

test('zero ranks are written atomically for every supplied engine', async () => {
  const db = new MockDB();
  const response = await worker.fetch(request('/__k4serp?op=log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword: 'regular zero term',
      google: 0,
      google_ai: 0,
      bing: 0
    })
  }), env(db), { waitUntil() {} });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(db.batches.length, 1);
  assert.deepEqual(
    db.batches[0].map((statement) => [statement.args[1], statement.args[3]]),
    [['google', 0], ['google_ai', 0], ['bing', 0]]
  );
});

test('keyword move action maps Alternative to priority zero and Move Up to default', async () => {
  const db = new MockDB();
  for (const [group, expectedPriority] of [['alternative', 0], ['regular', 5]]) {
    const response = await worker.fetch(request('/__k4serp?op=keyword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move', keyword: 'regular zero term', group })
    }), env(db), { waitUntil() {} });
    assert.equal(response.status, 200);
    assert.equal(db.runs.at(-1).args[0], expectedPriority);
  }
});

test('dashboard defaults to full history, uses latest ranks, sorts sections, and renders one global G/A/B trend switch', async () => {
  const db = new MockDB();
  const response = await worker.fetch(request('/__k4serp'), env(db), {
    waitUntil() {}
  });
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');
  assert.match(html, />Full History</);
  assert.match(html, /Trends: Full history/);
  assert.doesNotMatch(html, /Fetch 10 Google Ranks|function fetchNow\(|Contacting DataForSEO/);
  assert.match(html, /regular zero term/);
  assert.match(html, /12 <span class="delta up"[^>]*>▲6<\/span>/);
  assert.match(html, /<td class="rank-cell\s*">0 <\/td>/);
  assert.match(html, /8 <span class="delta up"[^>]*>▲3<\/span>/);
  assert.match(html, /22 <span class="delta down"[^>]*>▼8<\/span>/);
  assert.match(html, /14 <span class="delta up"[^>]*>▲4<\/span>/);
  assert.match(html, /19 <span class="delta down"[^>]*>▼9<\/span>/);
  assert.match(html, /data-engine="google"[^>]*>G<\/button>/);
  assert.match(html, /data-engine="google_ai"[^>]*>A<\/button>/);
  assert.match(html, /data-engine="bing"[^>]*>B<\/button>/);
  assert.equal((html.match(/<button[^>]*class="trend-engine-btn[^>]*data-engine=/g) || []).length, 3);
  assert.match(html, /<th class="trend-heading">[\s\S]*id="trendEngineSwitch"[\s\S]*<span class="trend-heading-label">Trend/);
  assert.match(html, /data-engine="google"\] \{ color:#60a5fa/);
  assert.match(html, /data-engine="google_ai"\] \{ color:#34d399/);
  assert.match(html, /data-engine="bing"\] \{ color:#c084fc/);
  assert.match(html, /bing: '#c084fc'/);
  assert.match(html, /function updateAllMiniTrends\(engine\)/);
  assert.match(html, /querySelectorAll\('\.trend-cell-row'\)\.forEach\(\(row\) => updateMiniTrend\(row, engine\)\)/);
  assert.match(html, /<circle cx="35"/);
  assert.ok(html.indexOf('Doorway Page Names') < html.indexOf('Alternative'));
  assert.ok(html.indexOf('alternative term') > html.indexOf('<strong>Alternative</strong>'));
  assert.ok(html.indexOf('American Western Art') < html.indexOf('Art of the West'));
});
