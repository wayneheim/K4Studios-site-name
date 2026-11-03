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
    if (this.sql.includes('SELECT keyword, priority FROM serp_keywords')) {
      return {
        results: [
          { keyword: 'regular zero term', priority: 5 },
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
    return { results: [] };
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
  assert.match(html, /value="0"/);
  assert.match(html, />Alternative</);
  assert.match(html, />Move Down</);
  assert.match(html, />Move Up</);
  assert.match(html, /Saved today/);
  assert.match(html, /min="0" max="100"/);
  assert.match(html, /data-keyword="D&#39;day Ohio Photos"/);
  assert.doesNotMatch(html, /decodeURIComponent\('D'day Ohio Photos'\)/);
  assert.match(html, /this\.closest\('\.kw-card'\)\.dataset\.keyword/);
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
