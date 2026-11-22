import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../../src/utils/analytics.ts', import.meta.url), 'utf8');
const layout = await readFile(new URL('../../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
const bridge = layout.match(/<!-- Session \+ visitor cookie bridge:[\s\S]*?<script is:inline>([\s\S]*?)<\/script>/)?.[1];
assert.ok(bridge, 'Identity bridge must execute inline before deferred analytics modules');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function browser({ visitorId, bridgeFirst = false, blocked = false } = {}) {
  let clock = Date.parse('2026-11-19T15:00:00Z');
  class BrowserDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
  }
  const cookies = new Map(visitorId ? [['k4_vid', { value: visitorId, expires: Infinity }]] : []);
  const storage = () => {
    const values = new Map();
    return {
      getItem(key) { if (blocked) throw new Error('Storage blocked'); return values.get(key) ?? null; },
      setItem(key, value) { if (blocked) throw new Error('Storage blocked'); values.set(key, String(value)); },
      removeItem(key) { if (blocked) throw new Error('Storage blocked'); values.delete(key); }
    };
  };
  const localStorage = storage(), sessionStorage = storage(), payloads = [];
  const location = new URL('https://www.k4studios.com/Blog/visitor-status-test');
  const document = { referrer: '', visibilityState: 'visible',
    documentElement: { scrollHeight: 2000, clientHeight: 1000, scrollTop: 0 },
    addEventListener() {}, removeEventListener() {} };
  Object.defineProperty(document, 'cookie', {
    get() { return blocked ? '' : [...cookies].filter(([, value]) => value.expires > clock).map(([key, value]) => `${key}=${value.value}`).join('; '); },
    set(value) {
      if (blocked) return;
      const [pair] = value.split(';');
      const [key, entry] = pair.split('=');
      const maxAge = value.match(/Max-Age=(\d+)/i)?.[1];
      cookies.set(key, { value: entry, expires: maxAge ? clock + Number(maxAge) * 1000 : Infinity });
    }
  });
  const window = { location, history: { pushState() {}, replaceState() {} },
    addEventListener() {}, removeEventListener() {}, scrollY: 0 };
  let context;
  const load = () => {
    context = vm.createContext({ exports: {}, window, document, location, history: window.history,
      localStorage, sessionStorage, Date: BrowserDate, URL, URLSearchParams, crypto: globalThis.crypto,
      performance: { getEntriesByType: () => [] }, console, Blob, queueMicrotask, setTimeout() {},
      navigator: { sendBeacon(_url, body) { payloads.push(body); return true; } },
      fetch: async (_url, options) => { payloads.push(options.body); return { status: 204, ok: true }; },
      Image: class {} });
    if (bridgeFirst) vm.runInContext(bridge, context);
    // Importing the actual collector initializes lifecycle context and identity,
    // before trackPageView is called. This triggered the original false return.
    vm.runInContext(code, context);
    if (!bridgeFirst) vm.runInContext(bridge, context);
  };
  load();
  return {
    advance(ms) { clock += ms; }, reload: load,
    async pageView() {
      context.exports.trackPageView();
      const sent = await Promise.all(payloads.splice(0).map(async body => JSON.parse(typeof body === 'string' ? body : await body.text())));
      const views = sent.filter(row => row.event === 'page_view');
      assert.equal(views.length, 1, 'Classification must reuse the existing page-view event');
      return views[0];
    }
  };
}

for (const bridgeFirst of [false, true]) {
  const client = browser({ bridgeFirst });
  const first = await client.pageView();
  assert.equal(first.visitor_status, 'new', `Fresh visitor, bridgeFirst=${bridgeFirst}`);
  client.advance(6000);
  const sameSession = await client.pageView();
  assert.equal(sameSession.visitor_status, 'new');
  assert.equal(sameSession.session_id, first.session_id);
  client.reload();
  const reload = await client.pageView();
  assert.equal(reload.visitor_status, 'new', 'A reload within the first session stays new');
  assert.equal(reload.visitor_id, first.visitor_id);
  assert.equal(reload.session_id, first.session_id);
  client.advance(31 * 60 * 1000);
  const returning = await client.pageView();
  assert.equal(returning.visitor_status, 'returning', 'An actual later session is returning');
  assert.equal(returning.visitor_id, first.visitor_id);
  assert.notEqual(returning.session_id, first.session_id);

  const existing = browser({ bridgeFirst, visitorId: 'previously-seen-browser' });
  assert.equal((await existing.pageView()).visitor_status, 'returning');

  const laterPage = browser({ bridgeFirst });
  await laterPage.pageView();
  laterPage.advance(31 * 60 * 1000);
  laterPage.reload();
  assert.equal((await laterPage.pageView()).visitor_status, 'returning', 'An expired session also rotates after a full reload');
}

const blocked = browser({ blocked: true });
const firstBlocked = await blocked.pageView();
assert.equal(firstBlocked.visitor_status, 'new', 'In-memory fallback preserves first-visit evidence');
blocked.advance(6000);
const repeatBlocked = await blocked.pageView();
assert.equal(repeatBlocked.visitor_status, 'new');
assert.equal(repeatBlocked.visitor_id, firstBlocked.visitor_id);
assert.equal(repeatBlocked.session_id, firstBlocked.session_id);
blocked.advance(31 * 60 * 1000);
assert.equal((await blocked.pageView()).visitor_status, 'returning');

console.log('Client visitor classification passed: both bootstrap orders, first-session reloads, later sessions, existing visitors, and blocked storage.');
