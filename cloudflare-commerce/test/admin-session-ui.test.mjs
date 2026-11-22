import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { groupAdminOrders } from '../../src/lib/commerce/adminOrders.js';

const bundled = await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import CommerceAdmin from './src/components/commerce/CommerceAdminPage.jsx';createRoot(document.getElementById('app')).render(React.createElement(CommerceAdmin));`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',tsconfigRaw:{compilerOptions:{}},logLevel:'silent'});
const code=bundled.outputFiles[0].text;

test('order groups preserve separate paid purchases and payment history while separating unpaid attempts and cancellations',()=>{
  const orders=[
    {id:'paid-1',buyerName:'Same customer',paymentStatus:'paid'},
    {id:'paid-2',buyerName:'Same customer',paidAt:'2026-11-20T12:00:00Z'},
    {id:'refund',financialStatus:'refunded'},
    {id:'dispute',financialStatus:'disputed'},
    {id:'capture',paypalCaptureId:'CAPTURE-TEST'},
    {id:'attempt',paymentStatus:'pending_approval',financialStatus:'pending'},
    {id:'failed',paymentStatus:'payment_creation_failed'},
    {id:'canceled',paymentStatus:'canceled',paidAt:'2026-11-20T12:00:00Z'},
  ];
  const groups=groupAdminOrders(orders);
  assert.deepEqual(groups.completed.map(o=>o.id),['paid-1','paid-2','refund','dispute','capture']);
  assert.deepEqual(groups.unfinished.map(o=>o.id),['attempt','failed']);
  assert.deepEqual(groups.canceled.map(o=>o.id),['canceled']);
});

test('paid orders stay visible while unpaid attempts and canceled orders start collapsed and cancellation moves an attempt into history',async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();page.setDefaultTimeout(5000);
    const base={buyerName:'Test Customer',buyerEmail:'buyer@example.test',totalCents:16850,items:[],shippingAddress:{},fulfillmentStatus:'unfulfilled',createdAt:'2026-11-20T12:00:00Z'};
    let orders=[{...base,id:'paid',orderNumber:'K4-PAID',paymentStatus:'paid',financialStatus:'paid',paidAt:base.createdAt},{...base,id:'attempt',orderNumber:'K4-ATTEMPT',paymentStatus:'pending_approval',financialStatus:'pending'},{...base,id:'canceled',orderNumber:'K4-CANCELED',paymentStatus:'canceled',financialStatus:'canceled',fulfillmentStatus:'canceled'}];
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
      const req=route.request(),path=new URL(req.url()).pathname;
      if(path==='/admin/commerce')return route.fulfill({contentType:'text/html',body:'<!doctype html><div id="app"></div>'});
      if(path==='/_editorpro/session')return route.fulfill({json:{authenticated:true,commerce:true,mode:'live'}});
      if(path.endsWith('/report'))return route.fulfill({json:{mode:'live',year:2026,rows:[],totals:{reportableSalesCents:16850,directSalesCents:16850,adjustedSalesCents:0,directOrders:1,adjustedTransactions:0,taxCollectedCents:0}}});
      if(path.endsWith('/orders/attempt/cancel')&&req.method()==='POST'){orders=orders.map(o=>o.id==='attempt'?{...o,paymentStatus:'canceled',financialStatus:'canceled',fulfillmentStatus:'canceled'}:o);return route.fulfill({json:{canceled:true,restoredEditionUnits:0}});}
      if(path.endsWith('/orders'))return route.fulfill({json:{orders}});
      if(path.endsWith('/promotions'))return route.fulfill({json:{promotions:[],products:[]}});
      return route.abort();
    });
    await page.goto('https://editorpro-dev.k4studios.com/admin/commerce');await page.addScriptTag({content:code});
    const paid=page.locator('[data-order-id="paid"]'),unfinished=page.locator('[data-order-group="unfinished"]'),canceled=page.locator('[data-order-group="canceled"]');
    await paid.waitFor();assert.equal(await paid.isVisible(),true);
    assert.equal(await unfinished.getAttribute('open'),null);assert.equal(await canceled.getAttribute('open'),null);
    assert.equal(await page.locator('[data-order-id="attempt"]').isVisible(),false);assert.equal(await page.locator('[data-order-id="canceled"]').isVisible(),false);
    assert.equal(await page.getByText('1 order',{exact:true}).count(),1);
    assert.equal(await page.getByRole('button',{name:'Delete test order'}).count(),0);
    await unfinished.locator('summary').click();
    assert.equal(await unfinished.getByRole('button',{name:'Save fulfillment'}).count(),0);
    assert.match(await unfinished.innerText(),/excluded from sales totals/);
    page.once('dialog',dialog=>dialog.accept());await unfinished.getByRole('button',{name:'Cancel order',exact:true}).click();
    await page.getByText('Canceled orders (2)',{exact:true}).waitFor();
    assert.equal(await page.locator('[data-order-group="unfinished"]').count(),0);
    assert.equal(await canceled.getAttribute('open'),null);
    await canceled.locator('summary').click();assert.equal(await canceled.locator('article').count(),2);
    assert.equal(await paid.isVisible(),true);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});

test('Commerce Admin loads live settings through the existing EditorPro session with no second password',async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const context=await browser.newContext();
    await context.addCookies([{name:'k4_editor_session',value:'fake-local-test-session',domain:'editorpro-dev.k4studios.com',path:'/',secure:true,httpOnly:true,sameSite:'Lax'}]);
    const page=await context.newPage();page.setDefaultTimeout(5000);const calls=[],errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.pathname==='/admin/commerce')return route.fulfill({contentType:'text/html',body:'<!doctype html><div id="app"></div>'});
      if(url.pathname==='/_editorpro/session')return route.fulfill({json:{authenticated:true,commerce:true,mode:'live'}});
      const headers=await request.allHeaders();calls.push({path:url.pathname,authorization:headers.authorization,cookie:headers.cookie});
      assert.ok(url.pathname.startsWith('/_editorpro/commerce/admin/'));
      if(url.pathname.endsWith('/report'))return route.fulfill({json:{mode:'live',year:2026,rows:[],totals:{reportableSalesCents:0,directSalesCents:0,adjustedSalesCents:0,directOrders:0,adjustedTransactions:0,taxCollectedCents:0}}});
      if(url.pathname.endsWith('/orders'))return route.fulfill({json:{orders:[]}});
      if(url.pathname.endsWith('/promotions'))return route.fulfill({json:{promotions:[],products:[]}});
      return route.abort();
    });
    await page.goto('https://editorpro-dev.k4studios.com/admin/commerce');await page.addScriptTag({content:code});
    await page.getByRole('heading',{name:'Coupons & shipping offers',exact:true}).waitFor();
    assert.equal(await page.locator('input[type=password]').count(),0);
    assert.equal(await page.getByRole('heading',{name:'Commerce Administration',exact:true}).count(),1);
    assert.ok(calls.some(call=>call.path.endsWith('/report')));assert.ok(calls.some(call=>call.path.endsWith('/orders')));assert.ok(calls.some(call=>call.path.endsWith('/promotions')));
    assert.ok(calls.every(call=>!call.authorization&&call.cookie?.includes('k4_editor_session=fake-local-test-session')));
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});

test('the public admin page opens the tunnel instead of requesting a second password or fetching private data',async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();page.setDefaultTimeout(5000);let privateCalls=0;
    await page.route('**/*',async route=>{
      const path=new URL(route.request().url()).pathname;
      if(path==='/admin/commerce')return route.fulfill({contentType:'text/html',body:'<!doctype html><div id="app"></div>'});
      if(path==='/_editorpro/session')return route.fulfill({status:404,json:{error:'Not a gateway'}});
      privateCalls++;return route.abort();
    });
    await page.goto('https://public.test/admin/commerce');await page.addScriptTag({content:code});
    const link=page.getByRole('link',{name:'Open Commerce Admin through EditorPro',exact:true});await link.waitFor();
    assert.equal(await link.getAttribute('href'),'https://editorpro-dev.k4studios.com/admin/commerce');
    assert.equal(await page.locator('input[type=password]').count(),0);assert.equal(privateCalls,0);
  } finally {await browser.close();}
});
