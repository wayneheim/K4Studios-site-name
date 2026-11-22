import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "playwright";

async function bundle(contents, define = {}) {
  const result = await build({ stdin:{contents,resolveDir:process.cwd(),loader:"jsx"},bundle:true,write:false,format:"iife",platform:"browser",jsx:"automatic",tsconfigRaw:{compilerOptions:{}},define,logLevel:"silent" });
  return result.outputFiles[0].text;
}

const editorFixture = `import React from 'react';import {createRoot} from 'react-dom/client';import PromotionSettings from './src/components/commerce/PromotionSettings.jsx';
let promotions=[];
const products=[
  {productKey:'sketch-5x7-pearl',catalogScope:'collection',seriesKey:'sketch',label:'Sketch 5 x 7'},
  {productKey:'chronicle-16x20-cotton-rag',catalogScope:'collection',seriesKey:'chronicle',label:'Chronicle 16 x 20'},
  {productKey:'legend-30x40-cotton-rag',catalogScope:'collection',seriesKey:'legend',label:'Legend 30 x 40'},
  {productKey:'engrained-i-test',catalogScope:'collection',seriesKey:'engrained',label:'Engrained panel'},
  {productKey:'expedition-test-sketch-5x7-pearl',catalogScope:'expedition',seriesKey:'sketch',label:'Expedition 5 x 7'}
];
const request=async(path,options)=>{if(options?.method==='POST'){const payload=JSON.parse(options.body);window.savedPromotion=payload;promotions=[{...payload,id:'local-test',redeemedCount:0,reservedCount:0}];return {id:'local-test'};}return {promotions,products};};
createRoot(document.getElementById('app')).render(React.createElement(PromotionSettings,{mode:'sandbox',request}));`;

test("promotion editor supports dates, one-use limits, restrictions, and disabling without live API calls",async()=>{
  const code = await bundle(editorFixture);
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.setContent('<!doctype html><div id="app"></div>');await page.addScriptTag({content:code});
    await page.getByText("No promotions configured.").waitFor();
    assert.equal(await page.getByLabel("Enable this promotion within its dates and limits").isChecked(),false);
    await page.getByLabel("Offer name",{exact:true}).fill("Free shipping over $50");
    await page.getByLabel("Coupon code (blank = automatic)",{exact:true}).fill("TEN-DAYS");
    await page.getByLabel("Minimum qualifying prints ($)",{exact:true}).fill("50");
    await page.getByLabel("Starts on (Eastern)",{exact:true}).fill("2026-11-20");
    await page.getByRole("button",{name:"Set a 10-day offer"}).click();
    assert.equal(await page.getByLabel("Expires at end of date (Eastern)",{exact:true}).inputValue(),"2026-11-29");
    await page.getByRole("button",{name:"One use total"}).click();
    await page.getByLabel("Uses per customer email (blank = unlimited)",{exact:true}).fill("1");
    await page.getByLabel("Catalog",{exact:true}).selectOption("limited_editions");
    await page.getByLabel("Qualifying products",{exact:true}).selectOption("series");await page.getByLabel("chronicle",{exact:true}).check();
    assert.equal(await page.getByLabel("sketch",{exact:true}).count(),0);
    await page.getByLabel("Enable this promotion within its dates and limits").check();
    await page.getByRole("button",{name:"Save promotion",exact:true}).click();
    await page.getByRole("status").filter({hasText:"Promotion saved."}).waitFor();
    const saved=await page.evaluate(()=>window.savedPromotion);
    assert.equal(saved.minimumCents,5000);assert.equal(saved.maxUses,"1");assert.equal(saved.maxUsesPerEmail,"1");assert.equal(saved.startsOn,"2026-11-20");assert.equal(saved.expiresOn,"2026-11-29");assert.deepEqual(saved.scope,{catalogScope:"limited_editions",seriesKeys:["chronicle"],productKeys:[]});
    await page.getByRole("button",{name:"Edit / disable"}).click();
    assert.equal(await page.getByLabel("Coupon code (blank = automatic)",{exact:true}).inputValue(),"TEN-DAYS");
    await page.getByLabel("Enable this promotion within its dates and limits").uncheck();await page.getByRole("button",{name:"Save promotion",exact:true}).click();
    await page.getByRole("status").filter({hasText:"saved disabled"}).waitFor();
    assert.equal(await page.evaluate(()=>window.savedPromotion.enabled),false);assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});

test("catalog choices filter qualifying products and survive saving and editing",async()=>{
  const code=await bundle(editorFixture),browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();page.setDefaultTimeout(5000);
    await page.setContent('<!doctype html><div id="app"></div>');await page.addScriptTag({content:code});
    await page.getByText("No promotions configured.").waitFor();
    assert.deepEqual(await page.getByLabel("Catalog",{exact:true}).locator('option').allTextContents(),["All catalogs","Limited editions only (Chronicle + Legend)","Engrained only","Expeditions only","All except Engrained"]);
    for(const [catalog,labels] of [["limited_editions",["Chronicle 16 x 20","Legend 30 x 40"]],["engrained",["Engrained panel"]],["expedition",["Expedition 5 x 7"]],["excluding_engrained",["Sketch 5 x 7","Chronicle 16 x 20","Legend 30 x 40","Expedition 5 x 7"]],["",["Sketch 5 x 7","Chronicle 16 x 20","Legend 30 x 40","Engrained panel","Expedition 5 x 7"]]]) {
      await page.getByLabel("Offer name",{exact:true}).fill(`Catalog test ${catalog||'all'}`);
      await page.getByLabel("Catalog",{exact:true}).selectOption(catalog);
      await page.getByLabel("Qualifying products",{exact:true}).selectOption("products");
      assert.deepEqual(await page.locator('fieldset label').allTextContents(),labels);
      assert.equal(await page.locator('fieldset input:checked').count(),0,"Changing catalogs clears previous product selections");
      await page.getByLabel(labels[0],{exact:true}).check();
      await page.getByRole("button",{name:"Save promotion",exact:true}).click();
      await page.waitForFunction(value=>window.savedPromotion?.scope.catalogScope===value,catalog);
      assert.equal(await page.evaluate(()=>window.savedPromotion.scope.productKeys.length),1);
      await page.getByRole("button",{name:"Edit / disable"}).click();
      assert.equal(await page.getByLabel("Catalog",{exact:true}).inputValue(),catalog);
      assert.equal(await page.getByLabel(labels[0],{exact:true}).isChecked(),true);
    }
  } finally {await browser.close();}
});

test("checkout sends the coupon, shows savings, and removes payment controls when a fresh quote fails",async()=>{
  const code=await bundle(`import React from 'react';import {createRoot} from 'react-dom/client';import Checkout from './src/components/commerce/PayPalSandboxCheckout.jsx';const cart={updatedAt:'test',items:[{productKey:'sketch-5x7-pearl',imageId:'i-V6hWQms',imageTitle:'Test print',quantity:2}]};window.paypal={createInstance:async()=>({findEligibleMethods:async()=>({isEligible:key=>key==='paypal'}),createPayPalOneTimePaymentSession:()=>({start:async()=>{}})})};createRoot(document.getElementById('app')).render(React.createElement(Checkout,{cart,onQuote:quote=>{window.lastQuote=quote;}}));`,{"import.meta.env.PUBLIC_K4_COMMERCE_API_BASE":'"https://commerce.test"'});
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();page.setDefaultTimeout(5000);let payload,fail=false;
    await page.route("**/*",async route=>{
      const url=new URL(route.request().url());
      if(url.host==="ui.test")return route.fulfill({contentType:"text/html",body:'<!doctype html><div id="app"></div>'});
      if(url.host!=="commerce.test")return route.abort();
      if(url.pathname==="/config")return route.fulfill({json:{mode:"live",configured:true,clientId:"local-test",sdkUrl:"https://sdk.test/mock.js"}});
      if(url.pathname==="/quote"){
        payload=route.request().postDataJSON();
        if(fail)return route.fulfill({status:400,json:{error:"That coupon has expired."}});
        return route.fulfill({json:{merchandiseSubtotalCents:5000,merchandiseCents:4500,merchandiseDiscountCents:500,shippingCents:1100,shippingDiscountCents:0,taxCents:0,totalCents:5600,tax:{ratePercent:0},promotion:{name:"Ten percent",code:"TEN"}}});
      }
      return route.abort();
    });
    await page.goto("https://ui.test/");await page.addScriptTag({content:code});
    await page.getByRole("button",{name:"Continue to Secure Checkout"}).click();
    for(const [placeholder,value] of [["Full name","Test Buyer"],["Email","buyer@example.test"],["Phone number","2165550100"],["Street address","123 Test St"],["City","Test"],["ZIP","44101"]])await page.getByPlaceholder(placeholder,{exact:true}).fill(value);
    await page.getByLabel("Coupon code (optional)",{exact:true}).fill("TEN");
    await page.getByRole("button",{name:"Calculate Shipping & Tax"}).click();
    await page.locator("paypal-button").waitFor({state:"attached"});
    assert.equal(payload.couponCode,"TEN");assert.match(await page.locator("section").innerText(),/Ten percent \(TEN\)/);assert.match(await page.locator("section").innerText(),/\$56\.00/);
    fail=true;await page.getByRole("button",{name:"Calculate Shipping & Tax"}).click();
    await page.getByText("That coupon has expired.",{exact:true}).waitFor();
    assert.equal(await page.locator("paypal-button").count(),0);assert.equal(await page.evaluate(()=>window.lastQuote),null);
  }finally{await browser.close();}
});
