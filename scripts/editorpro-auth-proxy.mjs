// Local-only authentication gateway for the named EditorPro development tunnel.
import http from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { COMMERCE_ORIGIN, loadCommerceCredential } from './editorpro-commerce-credential.mjs';

const COOKIE = 'k4_editor_session';
const SESSION_MS = 8 * 60 * 60 * 1000;
const digest = (text) => createHash('sha256').update(text).digest();
const escapeHtml = (text) => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const safeReturn = (value) => value?.startsWith('/') && !value.startsWith('//') && !/[\\\x00-\x20\x7f]/.test(value) ? value : '/admin/GalleryEditor';

export function createEditorGateway({ password, hostname, upstream = 'http://127.0.0.1:8888', commerceToken = null, commerceOrigin = COMMERCE_ORIGIN }) {
  if (!password || password.length < 20) throw new Error('EDITORPRO_PASSWORD must contain at least 20 characters');
  if (!hostname || !/^[a-z0-9.-]+$/.test(hostname)) throw new Error('Invalid EditorPro hostname');
  const target = new URL(upstream);
  if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(target.hostname)) throw new Error('EditorPro upstream must be local HTTP');
  const commerce = new URL(commerceOrigin);
  if (commerce.origin !== COMMERCE_ORIGIN && !(commerce.protocol === 'http:' && ['localhost','127.0.0.1'].includes(commerce.hostname))) throw new Error('Invalid commerce service origin');
  const passwordDigest = digest(password);
  const sessions = new Map();
  const failures = new Map();
  const validOrigin = (req) => {
    if (!req.headers.origin) return true;
    try { return new URL(req.headers.origin).host === req.headers.host; } catch { return false; }
  };
  const sessionId = (req) => (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const authenticated = (req) => {
    const id = sessionId(req), expires = sessions.get(id);
    if (expires > Date.now()) return true;
    if (id) sessions.delete(id);
    return false;
  };
  const headersFor = (req) => {
    const headers = { ...req.headers };
    headers.cookie = (headers.cookie || '').split(';').filter((part) => !part.trim().startsWith(`${COOKIE}=`)).join(';');
    return headers;
  };
  const reply = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8', ...headers });
    res.end(body);
  };
  const server = http.createServer(async (req, res) => {
    const requestHost = (req.headers.host || '').split(':')[0];
    if (![hostname, 'localhost', '127.0.0.1'].includes(requestHost)) return reply(res, 421, 'Unknown host');
    const url = new URL(req.url, `https://${hostname}`);
    if (url.pathname === '/robots.txt' && ['GET', 'HEAD'].includes(req.method)) {
      return reply(res, 200, req.method === 'HEAD' ? '' : 'User-agent: *\nAllow: /\n');
    }
    if (url.pathname === '/_editorpro/login' && req.method === 'GET') {
      const next = escapeHtml(safeReturn(url.searchParams.get('next')));
      return reply(res, 200, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>EditorPro sign in</title><style>body{font:18px system-ui;max-width:24rem;margin:12vh auto;padding:1rem}input,button{font:inherit;padding:.6rem;box-sizing:border-box;width:100%;margin:.5rem 0}</style><h1>EditorPro</h1><form method="post" action="/_editorpro/login"><label>Password<input name="password" type="password" autocomplete="current-password" required autofocus></label><input type="hidden" name="next" value="${next}"><button>Sign in</button></form></html>`, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'", 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' });
    }
    if (url.pathname === '/_editorpro/login' && req.method === 'POST') {
      if (!validOrigin(req)) return reply(res, 403, 'Invalid origin');
      if (!(req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) return reply(res, 415, 'Expected a form');
      const address = req.headers['cf-connecting-ip'] || req.socket.remoteAddress;
      const previous = failures.get(address);
      if (previous?.expires > Date.now() && previous.count >= 5) return reply(res, 429, 'Too many attempts; try again in 15 minutes', { 'Retry-After': '900' });
      let body = '';
      try {
        for await (const chunk of req) {
          body += chunk.toString();
          if (body.length > 4096) return reply(res, 413, 'Form too large');
        }
      } catch { return reply(res, 400, 'Invalid request'); }
      const form = new URLSearchParams(body);
      if (!timingSafeEqual(digest(form.get('password') || ''), passwordDigest)) {
        const count = previous?.expires > Date.now() ? previous.count + 1 : 1;
        if (failures.size >= 1000) {
          for (const [key, entry] of failures) if (entry.expires <= Date.now()) failures.delete(key);
          if (failures.size >= 1000) failures.delete(failures.keys().next().value);
        }
        failures.set(address, { count, expires: Date.now() + 15 * 60 * 1000 });
        return reply(res, 401, 'Incorrect password');
      }
      failures.delete(address);
      for (const [id, expires] of sessions) if (expires <= Date.now()) sessions.delete(id);
      if (sessions.size >= 500) sessions.delete(sessions.keys().next().value);
      const id = randomBytes(32).toString('base64url');
      sessions.set(id, Date.now() + SESSION_MS);
      return reply(res, 303, '', { Location: safeReturn(form.get('next')), 'Set-Cookie': `${COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MS / 1000}` });
    }
    if (!authenticated(req)) {
      if (url.pathname.startsWith('/_editorpro/')) return reply(res, 401, JSON.stringify({error:'Your EditorPro session has expired. Sign in to EditorPro and retry.'}), {'Content-Type':'application/json'});
      if (!['GET', 'HEAD'].includes(req.method) || url.pathname.startsWith('/.netlify/')) return reply(res, 401, 'Authentication required');
      return reply(res, 302, '', { Location: `/_editorpro/login?next=${encodeURIComponent(req.url)}` });
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !validOrigin(req)) return reply(res, 403, 'Invalid origin');
    if (url.pathname === '/_editorpro/session' && req.method === 'GET') {
      return reply(res, 200, JSON.stringify({authenticated:true,commerce:!!commerceToken,mode:'live'}), {'Content-Type':'application/json'});
    }
    if (url.pathname.startsWith('/_editorpro/commerce/')) {
      if (!validOrigin(req) || req.headers['sec-fetch-site'] === 'cross-site') return reply(res,403,JSON.stringify({error:'Invalid origin'}),{'Content-Type':'application/json'});
      const path = url.pathname.slice('/_editorpro/commerce'.length);
      const reads = /^\/admin\/(report|orders|promotions|order-summary|order-tracker)$/;
      const writes = /^\/admin\/(promotions|ohio-tax-rate|shipping-rates|expedition-prices|nexus-adjustments|nexus-rules\/[A-Z]{2}|orders\/[A-Za-z0-9-]+\/(fulfillment|cancel|delete|processed|shipped))$/;
      const deletes = /^\/admin\/orders\/[A-Za-z0-9-]+$/;
      if (!(req.method === 'GET' && reads.test(path)) && !(req.method === 'POST' && writes.test(path)) && !(req.method === 'DELETE' && deletes.test(path))) return reply(res,404,JSON.stringify({error:'Unknown commerce action'}),{'Content-Type':'application/json'});
      if (!commerceToken) return reply(res,503,JSON.stringify({error:'Commerce access is not configured on the EditorPro gateway.'}),{'Content-Type':'application/json'});
      try {
        let body='';
        if (req.method !== 'GET') {
          for await (const chunk of req) {
            body+=chunk.toString();
            if (Buffer.byteLength(body)>1024*1024) return reply(res,413,JSON.stringify({error:'Request too large'}),{'Content-Type':'application/json'});
          }
          if (body) JSON.parse(body);
        }
        const response=await fetch(new URL(path+url.search,commerce.origin),{
          method:req.method,redirect:'manual',signal:AbortSignal.timeout(20000),
          headers:{authorization:`Bearer ${commerceToken}`,'content-type':'application/json'},
          ...(req.method !== 'GET' && body ? {body}:{}),
        });
        return reply(res,response.status,await response.text(),{'Content-Type':'application/json; charset=utf-8'});
      } catch(error) {
        return reply(res,error instanceof SyntaxError?400:502,JSON.stringify({error:error instanceof SyntaxError?'Invalid JSON request.':'The live commerce service is unavailable. Please retry.'}),{'Content-Type':'application/json'});
      }
    }
    const proxy = http.request({ hostname: target.hostname, port: target.port, path: req.url, method: req.method, headers: headersFor(req) }, (response) => {
      res.writeHead(response.statusCode, { ...response.headers, 'cache-control': 'no-store' });
      response.pipe(res);
    });
    proxy.on('error', () => { if (!res.headersSent) reply(res, 502, 'Netlify Dev is unavailable'); else res.destroy(); });
    req.on('aborted', () => proxy.destroy());
    res.on('close', () => proxy.destroy());
    req.pipe(proxy);
  });
  server.on('upgrade', (req, socket, head) => {
    if ((req.headers.host || '').split(':')[0] !== hostname || !authenticated(req) || !validOrigin(req)) return socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    const proxy = http.request({ hostname: target.hostname, port: target.port, path: req.url, method: 'GET', headers: headersFor(req) });
    proxy.on('upgrade', (response, peer, peerHead) => {
      socket.write(`HTTP/1.1 ${response.statusCode} Switching Protocols\r\n${Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`).join('\r\n')}\r\n\r\n`);
      if (peerHead.length) socket.write(peerHead);
      if (head.length) peer.write(head);
      socket.on('error', () => peer.destroy());
      peer.on('error', () => socket.destroy());
      socket.on('close', () => peer.destroy());
      peer.on('close', () => socket.destroy());
      socket.pipe(peer).pipe(socket);
    });
    proxy.on('response', (response) => { response.resume(); socket.end(`HTTP/1.1 ${response.statusCode} Error\r\nConnection: close\r\n\r\n`); });
    proxy.on('error', () => socket.destroy());
    proxy.end();
  });
  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  dotenv.config({ path: '.env.local', quiet: true });
  const port = Number(process.env.EDITORPRO_AUTH_PORT || 8890);
  const hostname = process.env.EDITORPRO_PUBLIC_HOST || 'editorpro-dev.k4studios.com';
  const server = createEditorGateway({ password: process.env.EDITORPRO_PASSWORD, hostname, commerceToken: loadCommerceCredential() });
  server.listen(port, '127.0.0.1', () => console.log(`EditorPro password gateway: 127.0.0.1:${port} -> 127.0.0.1:8888 (${hostname})`));
}
