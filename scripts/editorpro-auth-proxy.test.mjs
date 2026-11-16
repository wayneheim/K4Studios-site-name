import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createEditorGateway } from './editorpro-auth-proxy.mjs';

const hostname = 'editorpro-dev.k4studios.com';
const password = 'test-password-only-not-a-real-credential';

test('EditorPro gateway protects pages, APIs, source and WebSockets', async () => {
  const connections = new Set();
  const track = (server) => server.on('connection', (socket) => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });
  const origin = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ path: req.url, method: req.method, host: req.headers.host, cookie: req.headers.cookie }));
  });
  origin.on('upgrade', (req, socket) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');
    socket.on('data', (data) => socket.write(data));
  });
  track(origin);
  origin.listen(0, '127.0.0.1');
  await once(origin, 'listening');
  const gateway = createEditorGateway({ password, hostname, upstream: `http://127.0.0.1:${origin.address().port}` });
  track(gateway);
  gateway.listen(0, '127.0.0.1');
  await once(gateway, 'listening');
  const port = gateway.address().port;
  const request = (path, { method = 'GET', headers = {}, body = '' } = {}) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: { Host: hostname, ...headers } }, (res) => {
      let result = '';
      res.on('data', (data) => result += data);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: result }));
    });
    req.on('error', reject);
    req.end(body);
  });
  const login = (value, next = '/admin/GalleryEditor', origin = `https://${hostname}`) => request('/_editorpro/login', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password: value, next }).toString(),
  });
  let socket;
  try {
    assert.equal((await request('/robots.txt')).body, 'User-agent: *\nAllow: /\n');
    assert.equal((await request('/_editorpro/login')).status, 200);
    for (const path of ['/admin/GalleryEditor', '/src/components/GalleryEditorPro.jsx', '/@vite/client']) {
      const r = await request(path);
      assert.equal(r.status, 302);
      assert.match(r.headers.location, /^\/_editorpro\/login\?/);
    }
    assert.equal((await request('/.netlify/functions/seriesRegistry')).status, 401);
    assert.equal((await request('/.netlify/functions/updateGalleryItem', { method: 'POST' })).status, 401);
    assert.equal((await request('/', { headers: { Host: 'unrelated.example' } })).status, 421);
    assert.equal((await login('wrong')).status, 401);
    assert.equal((await login(password, '/', 'https://unrelated.example')).status, 403);
    const signedIn = await login(password, '//unrelated.example');
    assert.equal(signedIn.status, 303);
    assert.equal(signedIn.headers.location, '/admin/GalleryEditor');
    const cookieHeader = signedIn.headers['set-cookie'][0];
    assert.match(cookieHeader, /HttpOnly; Secure; SameSite=Lax/);
    const cookie = cookieHeader.split(';')[0];
    const authenticated = await request('/.netlify/functions/seriesRegistry', { headers: { Cookie: cookie } });
    assert.equal(authenticated.status, 200);
    assert.equal(authenticated.headers['cache-control'], 'no-store');
    assert.equal(JSON.parse(authenticated.body).host, hostname);
    assert.equal(JSON.parse(authenticated.body).cookie, '');
    const rejectedWrite = await request('/.netlify/functions/updateGalleryItem', {
      method: 'POST', headers: { Cookie: cookie, Origin: 'https://unrelated.example' },
    });
    assert.equal(rejectedWrite.status, 403);
    const websocket = (auth) => new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port, path: '/', headers: {
        Host: hostname, Origin: `https://${hostname}`, Connection: 'Upgrade', Upgrade: 'websocket', ...(auth && { Cookie: auth }),
      } });
      req.on('response', (res) => { res.resume(); resolve({ status: res.statusCode }); });
      req.on('upgrade', (res, peer) => resolve({ status: res.statusCode, socket: peer }));
      req.on('error', reject);
      req.end();
    });
    assert.equal((await websocket()).status, 401);
    const upgraded = await websocket(cookie);
    socket = upgraded.socket;
    assert.equal(upgraded.status, 101);
    const echo = once(socket, 'data');
    socket.write('gateway-probe');
    assert.equal((await echo)[0].toString(), 'gateway-probe');
    socket.destroy();
    for (let i = 0; i < 5; i++) assert.equal((await login('wrong')).status, 401);
    assert.equal((await login('wrong')).status, 429);
  } finally {
    socket?.destroy();
    for (const connection of connections) connection.destroy();
    gateway.closeAllConnections();
    origin.closeAllConnections();
    gateway.close();
    origin.close();
  }
});
