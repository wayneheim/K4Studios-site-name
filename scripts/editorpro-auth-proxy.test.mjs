import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createEditorGateway } from './editorpro-auth-proxy.mjs';
import { protectCommerceCredential } from './editorpro-commerce-credential.mjs';

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

test('one EditorPro session authorizes only fixed commerce routes and never exposes its service credential', async () => {
  const serviceToken = 'local-service-test-only';
  const calls = [];
  const commerce = http.createServer(async (req,res) => {
    let body='';for await (const chunk of req)body+=chunk;
    calls.push({path:req.url,authorization:req.headers.authorization,cookie:req.headers.cookie,origin:req.headers.origin,body});
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({mode:'live',promotions:[],saved:true}));
  });
  commerce.listen(0,'127.0.0.1');await once(commerce,'listening');
  const gateway = createEditorGateway({password,hostname,commerceToken:serviceToken,commerceOrigin:`http://127.0.0.1:${commerce.address().port}`});
  gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  const request=(path,{method='GET',headers={},body=''}={})=>new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port:gateway.address().port,path,method,headers:{host:hostname,...headers}},res=>{
      let text='';res.on('data',data=>text+=data);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:text}));
    });req.on('error',reject);req.end(body);
  });
  try {
    assert.equal((await request('/_editorpro/session')).status,401);
    assert.equal((await request('/_editorpro/commerce/admin/report',{headers:{'x-editorpro-authenticated':'true',authorization:'Bearer forged'}})).status,401);
    assert.equal(calls.length,0);
    const login=await request('/_editorpro/login',{method:'POST',headers:{origin:`https://${hostname}`,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password,next:'/admin/commerce'}).toString()});
    assert.equal(login.status,303);assert.equal(login.headers.location,'/admin/commerce');
    const cookie=login.headers['set-cookie'][0].split(';')[0];
    const session=await request('/_editorpro/session',{headers:{cookie}});
    assert.deepEqual(JSON.parse(session.body),{authenticated:true,commerce:true,mode:'live'});
    assert.equal(session.body.includes(serviceToken),false);
    const report=await request('/_editorpro/commerce/admin/report?year=2026',{headers:{cookie:cookie+'; unrelated=browser-only',authorization:'Bearer forged'}});
    assert.equal(report.status,200);assert.equal(report.body.includes(serviceToken),false);
    assert.equal(calls[0].path,'/admin/report?year=2026');assert.equal(calls[0].authorization,`Bearer ${serviceToken}`);assert.equal(calls[0].cookie,undefined);assert.equal(calls[0].origin,undefined);
    const save=await request('/_editorpro/commerce/admin/promotions',{method:'POST',headers:{cookie,origin:`https://${hostname}`,'content-type':'application/json'},body:JSON.stringify({name:'Draft only',enabled:false})});
    assert.equal(save.status,200);assert.equal(JSON.parse(calls[1].body).enabled,false);
    assert.equal((await request('/_editorpro/commerce/admin/promotions',{method:'POST',headers:{cookie,origin:'https://unrelated.example'},body:'{}'})).status,403);
    assert.equal((await request('/_editorpro/commerce/admin/report',{headers:{cookie,'sec-fetch-site':'cross-site'}})).status,403);
    assert.equal((await request('/_editorpro/commerce/orders/test/capture',{method:'POST',headers:{cookie},body:'{}'})).status,404);
    assert.equal((await request('/_editorpro/commerce/admin/anything',{headers:{cookie}})).status,404);
    assert.equal((await request('/_editorpro/commerce/admin/promotions',{method:'POST',headers:{cookie},body:'not-json'})).status,400);
    assert.equal(calls.length,2);
  } finally {gateway.closeAllConnections();commerce.closeAllConnections();gateway.close();commerce.close();}
});

test('a tunnel without its commerce credential fails closed',async()=>{
  const gateway=createEditorGateway({password,hostname});gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
  try {
    const url=`http://127.0.0.1:${gateway.address().port}`;
    const login=await fetch(url+'/_editorpro/login',{method:'POST',redirect:'manual',headers:{origin:url,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password})});
    assert.equal(login.status,303);
    const cookie=login.headers.get('set-cookie').split(';')[0];
    const response=await fetch(url+'/_editorpro/commerce/admin/report',{headers:{cookie}});
    assert.equal(response.status,503);
  } finally {gateway.closeAllConnections();gateway.close();}
});

test('local commerce credential is protected by Windows DPAPI',{skip:process.platform!=='win32'},()=>{
  const token='test-credential-not-a-real-service-secret';
  const protectedValue=protectCommerceCredential(token);
  assert.equal(protectedValue.includes(token),false);
  assert.equal(protectCommerceCredential(protectedValue,true),token);
});
