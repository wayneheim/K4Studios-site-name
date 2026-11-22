import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { build } from "esbuild";
import { calculateCheckoutQuote } from "../../src/lib/commerce/server/checkoutQuote.js";
import { evaluatePromotion, easternDate, promotionMatchesItem } from "../../src/lib/commerce/server/promotions.js";
import { listPromotions, savePromotion, resolvePromotion, reservePromotionUse, commitPromotionUse, releasePromotionUse } from "../src/promotionStore.js";
import { insertPendingOrder } from "../src/database.js";
import { buildPayPalBreakdown, buildPayPalLineItems } from "../src/paypalLineItems.js";
import { cancelOrder, deleteSandboxOrder } from "../src/admin.js";

const shippingConfig = { mode: "live", version: "test", productRatesCents: { "sketch-5x7-pearl":1100,"foundation-8x10-pearl":1100 }, engrainedBandsCents: {upTo24:11500,upTo36:11500,upTo50:15000} };
const taxConfig = { mode:"live",version:"test",defaultRule:{rateBasisPoints:675,taxShipping:true,label:"Test rate"} };
const destination = { countryCode:"US",stateCode:"OH" };
const at = new Date("2026-11-20T18:00:00Z");
const paper = (price=5000,quantity=1) => ({ productKey:"sketch-5x7-pearl",seriesKey:"sketch",catalogScope:"collection",fulfillment:"smugmug-manual",currency:"USD",unitPriceCents:price,lineTotalCents:price*quantity,quantity,imageId:"i-V6hWQms",imageTitle:"Test print",size:'5" x 7"',finish:"Pearl" });
const panel = { ...paper(200000),productKey:"engrained-i-panel",seriesKey:"engrained",fulfillment:"engrained",size:'20" x 30"' };
const offer = (overrides={}) => ({id:"test",name:"Test offer",enabled:true,discountType:"free_shipping",discountValue:0,startsOn:"2026-11-20",expiresOn:"2026-11-29",minimumCents:5000,scope:{},usedCount:0,customerUsedCount:0,version:"version-test",...overrides});
function context(items=[paper()], date=at) { const base=calculateCheckoutQuote({verifiedItems:items,destination,shippingConfig,taxConfig});return {items,destination,shippingConfig,taxConfig,shippingCents:base.shippingCents,at:date}; }
function database() {
  const sqlite=new DatabaseSync(":memory:");
  const directory=new URL("../migrations/",import.meta.url);
  for(const name of readdirSync(directory).filter(name=>name.endsWith(".sql")).sort())sqlite.exec(readFileSync(new URL(name,directory),"utf8"));
  return {sqlite,prepare(sql){return {values:[],bind(...values){this.values=values;return this;},async first(){return sqlite.prepare(sql).get(...this.values)||null;},async all(){return {results:sqlite.prepare(sql).all(...this.values)};},async run(){return {meta:sqlite.prepare(sql).run(...this.values)};}};},async batch(statements){sqlite.exec("BEGIN");try{const results=[];for(const stmt of statements)results.push(await stmt.run());sqlite.exec("COMMIT");return results;}catch(error){sqlite.exec("ROLLBACK");throw error;}}};
}
async function promotion(db, overrides={}) {
  const payload={name:"Test coupon",code:"THANKYOU",discountType:"free_shipping",discountValue:0,startsOn:"2026-01-01",expiresOn:"2026-12-31",minimumCents:0,scope:{},enabled:true,...overrides};
  const result=await savePromotion(db,"live",payload);return {...payload,id:result.id};
}
async function order(db,id,quote,email="buyer@example.test",mode="live") {
  const items=quote.items||[paper()];
  await insertPendingOrder(db,{order:{id,orderNumber:`K4-${id}`,mode,buyerName:"Test Buyer",buyerEmail:email},rawCart:items,verifiedItems:items,quote,shippingAddress:{addressLine1:"123 Test St",city:"Test",stateCode:"OH",postalCode:"44101"}});
  return db.prepare("SELECT * FROM orders WHERE id=?").bind(id).first();
}
function baseQuote(items=[paper()]) {return calculateCheckoutQuote({verifiedItems:items,destination,shippingConfig,taxConfig});}

test("thresholds use qualifying merchandise and Eastern expiration includes the whole last date",()=>{
  assert.equal(evaluatePromotion(offer(),context([paper(4999)])),null);
  assert.equal(evaluatePromotion(offer(),context()).shippingDiscountCents,1100);
  assert.equal(easternDate(new Date("2026-11-21T04:59:59Z")),"2026-11-20");
  const lastDay=offer({expiresOn:"2026-11-20"});
  assert.ok(evaluatePromotion(lastDay,context(undefined,new Date("2026-11-21T04:59:59Z"))));
  assert.equal(evaluatePromotion(lastDay,context(undefined,new Date("2026-11-21T05:00:00Z"))),null);
  assert.equal(easternDate(new Date("2026-07-21T03:59:59Z")),"2026-07-20");
  assert.equal(evaluatePromotion(offer({startsOn:"2026-11-21"}),context()),null);
});

test("mixed carts retain excluded shipping, including full Engrained panel shipping",()=>{
  const scoped=offer({scope:{seriesKeys:["sketch"]}});
  const applied=evaluatePromotion(scoped,context([paper(),panel]));
  assert.equal(applied.shippingDiscountCents,1100);
  const quote=calculateCheckoutQuote({verifiedItems:[paper(),panel],destination,shippingConfig,taxConfig,promotion:applied});
  assert.equal(quote.shippingCents,11500);
  assert.equal(evaluatePromotion(scoped,context([paper(4999),panel])),null,"Excluded panel value cannot meet the paper-print minimum");
  assert.equal(evaluatePromotion(offer({scope:{catalogScope:"expedition"}}),context()),null);
});

test("catalog offers save, reload, and discount only the requested catalog groups in mixed carts",async()=>{
  const db=database();
  try {
    const chronicle={...paper(110000),productKey:"chronicle-16x20-cotton-rag",seriesKey:"chronicle",fulfillment:"k4-manual"};
    const legend={...paper(380000),productKey:"legend-30x40-cotton-rag",seriesKey:"legend",fulfillment:"k4-manual"};
    const expedition={...paper(),catalogScope:"expedition",productKey:"expedition-fiddlers-green-2026-sketch-5x7-pearl",shippingRateKey:"sketch-5x7-pearl"};
    const items=[paper(),chronicle,legend,panel,expedition];
    const config={...shippingConfig,productRatesCents:{...shippingConfig.productRatesCents,[chronicle.productKey]:3500,[legend.productKey]:3500}};
    const mixed={items,destination,shippingConfig:config,shippingCents:calculateCheckoutQuote({verifiedItems:items,destination,shippingConfig:config,taxConfig}).shippingCents,at};
    for (const [catalogScope,indexes] of [["",[0,1,2,3,4]],["limited_editions",[1,2]],["engrained",[3]],["expedition",[4]],["excluding_engrained",[0,1,2,4]],["collection",[0,1,2,3]]]) {
      const rule=await promotion(db,{code:"",scope:{catalogScope},discountType:"percent_off",discountValue:1000});
      const saved=(await listPromotions(db,"live")).promotions.find(p=>p.id===rule.id);
      assert.equal(saved.scope.catalogScope,catalogScope);
      assert.deepEqual(items.map((item,index)=>promotionMatchesItem(saved,item)?index:null).filter(i=>i!==null),indexes);
      const discount=evaluatePromotion(saved,mixed);
      assert.equal(discount.merchandiseDiscountCents,Math.round(indexes.reduce((sum,i)=>sum+items[i].lineTotalCents,0)*0.1));
    }
    assert.equal(promotionMatchesItem(offer({scope:{catalogScope:"limited_editions",seriesKeys:["legend"]}}),chronicle),false);
    assert.equal(promotionMatchesItem(offer({scope:{catalogScope:"limited_editions",seriesKeys:["legend"]}}),legend),true);
    assert.equal(promotionMatchesItem(offer({scope:{catalogScope:"engrained",productKeys:[legend.productKey]}}),panel),false);
    assert.equal(promotionMatchesItem(offer({scope:{catalogScope:"unknown"}}),paper()),false);
    await assert.rejects(promotion(db,{scope:{catalogScope:"unknown"}}),/catalog scope/);
    const nonEngrained=offer({scope:{catalogScope:"excluding_engrained"}});
    assert.equal(evaluatePromotion(nonEngrained,mixed).shippingDiscountCents,mixed.shippingCents-11500);
    assert.equal(evaluatePromotion({...nonEngrained,minimumCents:10000},context([paper(4999),panel])),null,"Engrained value cannot meet an offer's qualifying minimum");
  } finally {db.sqlite.close();}
});

test("percentage and fixed coupons discount only eligible products and PayPal totals balance to the cent",()=>{
  const items=[paper(3333,3),panel];
  for(const rule of [offer({discountType:"percent_off",discountValue:1550,scope:{seriesKeys:["sketch"]}}),offer({discountType:"amount_off",discountValue:1500,scope:{productKeys:["sketch-5x7-pearl"]}})]){
    const applied=evaluatePromotion(rule,context(items));
    const quote=calculateCheckoutQuote({verifiedItems:items,destination,shippingConfig,taxConfig,promotion:applied});
    assert.equal(quote.merchandiseSubtotalCents,209999);
    assert.equal(quote.merchandiseDiscountCents,rule.discountType==="percent_off"?1550:1500);
    assert.equal(quote.tax.taxableCents,quote.merchandiseCents+quote.shippingCents);
    const breakdown=buildPayPalBreakdown(quote);
    assert.equal(Math.round(Number(breakdown.item_total.value)*100)-Math.round(Number(breakdown.discount.value)*100)+quote.shippingCents+quote.taxCents,quote.totalCents);
    const lines=buildPayPalLineItems(items,quote.taxCents);
    assert.equal(lines.reduce((n,row)=>n+Math.round(Number(row.unit_amount.value)*100)*Number(row.quantity),0),quote.merchandiseSubtotalCents);
    assert.equal(lines.reduce((n,row)=>n+Math.round(Number(row.tax.value)*100)*Number(row.quantity),0),quote.taxCents);
  }
});

test("automatic offers choose one best offer; explicit coupon is normalized and never stacks",async()=>{
  const db=database();try{
    await promotion(db,{code:"",name:"Free shipping"});
    await promotion(db,{code:"",name:"20 percent",discountType:"percent_off",discountValue:2000});
    await promotion(db,{code:"SAVE5",discountType:"amount_off",discountValue:500});
    assert.equal((await resolvePromotion(db,"live","","test@example.test",context())).name,"Free shipping");
    const coupon=await resolvePromotion(db,"live"," save5 ","test@example.test",context());
    assert.equal(coupon.code,"SAVE5");assert.equal(coupon.merchandiseDiscountCents,500);assert.equal(coupon.shippingDiscountCents,0);
    await assert.rejects(resolvePromotion(db,"sandbox","SAVE5","test@example.test",context()),/coupon/);
    await assert.rejects(resolvePromotion(db,"live","BADCODE","test@example.test",context()),/coupon/);
  }finally{db.sqlite.close();}
});

test("one-use coupons reserve atomically at payment, commit once, and do not get restored by refunds",async()=>{
  const db=database();try{
    await promotion(db,{maxUses:1});
    const promo=await resolvePromotion(db,"live","THANKYOU","buyer@example.test",context());
    const quote={...baseQuote(),promotion:promo};
    const a=await order(db,"a",quote),b=await order(db,"b",quote,"second@example.test");
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) n FROM promotion_uses").get().n,0,"Quotes and abandoned order creation consume nothing");
    await reservePromotionUse(db,a,quote);
    await assert.rejects(reservePromotionUse(db,b,quote),/no longer available/);
    assert.ok(await resolvePromotion(db,"live","THANKYOU",a.buyer_email,context(),a.id),"Own reservation is not counted twice");
    await reservePromotionUse(db,a,quote);
    await commitPromotionUse(db,a.id);await commitPromotionUse(db,a.id);await releasePromotionUse(db,a.id);
    assert.equal(db.sqlite.prepare("SELECT status FROM promotion_uses").get().status,"redeemed");
    await assert.rejects(resolvePromotion(db,"live","THANKYOU",b.buyer_email,context()),/coupon/);
    const admin=await listPromotions(db,"live");assert.equal(admin.promotions[0].redeemedCount,1);assert.equal(admin.promotions[0].reservedCount,0);
  }finally{db.sqlite.close();}
});

test("best automatic offer compares the actual taxed total and a zero-payable offer cannot block checkout",async()=>{
  const db=database();try{
    await promotion(db,{code:"",name:"Free shipping"});
    await promotion(db,{code:"",name:"Print savings",discountType:"amount_off",discountValue:1050});
    const c={...context(),taxConfig:{...taxConfig,defaultRule:{...taxConfig.defaultRule,taxShipping:false}}};
    assert.equal((await resolvePromotion(db,"live","","buyer@example.test",c)).name,"Print savings");
    const noShipping={...context(),shippingCents:0};
    await promotion(db,{code:"",name:"Too large",discountType:"amount_off",discountValue:10000000});
    assert.notEqual((await resolvePromotion(db,"live","","buyer@example.test",noShipping)).name,"Too large");
  }finally{db.sqlite.close();}
});

test("per-email limits normalize addresses, hold pending payments, and release confirmed failed payments",async()=>{
  const db=database();try{
    await promotion(db,{maxUsesPerEmail:1});
    const p=await resolvePromotion(db,"live","THANKYOU","Buyer@Example.test",context());
    const q={...baseQuote(),promotion:p},a=await order(db,"a",q," Buyer@Example.test "),b=await order(db,"b",q,"buyer@example.test");
    await reservePromotionUse(db,a,q);
    await assert.rejects(reservePromotionUse(db,b,q),/no longer available/);
    assert.ok(await resolvePromotion(db,"live","THANKYOU","other@example.test",context()));
    await releasePromotionUse(db,a.id);await reservePromotionUse(db,b,q);await commitPromotionUse(db,b.id);
    await assert.rejects(resolvePromotion(db,"live","THANKYOU","BUYER@example.test",context()),/coupon/);
    await assert.rejects(savePromotion(db,"live",{...await promotion(db,{code:"LIMIT2"}),maxUses:0}),/Invalid/);
  }finally{db.sqlite.close();}
});

test("disabled, expired, changed, and other-environment promotions cannot reserve a payment use",async()=>{
  const db=database();try{
    const rule=await promotion(db,{maxUses:1});const promo=await resolvePromotion(db,"live","THANKYOU","buyer@example.test",context());
    const q={...baseQuote(),promotion:promo},a=await order(db,"a",q),b=await order(db,"b",q,"b@example.test","sandbox");
    await assert.rejects(reservePromotionUse(db,b,q),/no longer available/);
    await savePromotion(db,"live",{...rule,enabled:false});
    await assert.rejects(reservePromotionUse(db,a,q),/no longer available/);
    await assert.rejects(resolvePromotion(db,"live","THANKYOU",a.buyer_email,context()),/coupon/);
    await savePromotion(db,"live",{...rule,expiresOn:"2026-11-19"});
    await assert.rejects(resolvePromotion(db,"live","THANKYOU",a.buyer_email,context()),/coupon/);
  }finally{db.sqlite.close();}
});

test("a merchant cannot lower limits below already redeemed or reserved uses",async()=>{
  const db=database();try{
    const rule=await promotion(db);const promo=await resolvePromotion(db,"live","THANKYOU","buyer@example.test",context());
    for(const id of ["a","b"]){const q={...baseQuote(),promotion:promo};await reservePromotionUse(db,await order(db,id,q),q);await commitPromotionUse(db,id);}
    await assert.rejects(savePromotion(db,"live",{...rule,maxUses:1}),/below existing/);
    await assert.rejects(savePromotion(db,"live",{...rule,maxUsesPerEmail:1}),/below existing/);
  }finally{db.sqlite.close();}
});

test("malformed product restrictions cannot silently broaden a promotion to all products",async()=>{
  const db=database();try{
    for(const scope of [[],"sketch",{seriesKeys:"sketch"},{productKeys:null}])await assert.rejects(promotion(db,{scope}),/restrictions/);
    assert.equal((await listPromotions(db,"live")).promotions.length,0);
  }finally{db.sqlite.close();}
});

test("canceling unpaid orders releases a held use and sandbox deletion removes dependent usage records",async()=>{
  const db=database();try{
    const rule=await promotion(db);const promo=await resolvePromotion(db,"live","THANKYOU","buyer@example.test",context());
    const q={...baseQuote(),promotion:promo},a=await order(db,"a",q);
    await reservePromotionUse(db,a,q);await cancelOrder(db,a.id,"live");
    assert.equal(db.sqlite.prepare("SELECT status FROM promotion_uses").get().status,"released");
    const sandbox=await savePromotion(db,"sandbox",{...rule,id:undefined,code:"TEST"});
    const snapshot=(await listPromotions(db,"sandbox")).promotions.find(p=>p.id===sandbox.id);
    const sq={...baseQuote(),promotion:{id:snapshot.id,configVersion:snapshot.version}};
    const s=await order(db,"s",sq,"buyer@example.test","sandbox");await reservePromotionUse(db,s,sq);await deleteSandboxOrder(db,s.id,"sandbox");
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) n FROM promotion_uses WHERE order_id='s'").get().n,0);
  }finally{db.sqlite.close();}
});

test("the actual quote/create/capture API preserves coupon totals and blocks a second paid use",async()=>{
  const db=database(),oldFetch=globalThis.fetch;
  const pending=[];let captures=0,sequence=0,approvalReads=0;const units=new Map();
  let releaseApprovals;
  const approvalsReady = new Promise((resolve)=>{ releaseApprovals=resolve; });
  try{
    await promotion(db,{discountType:"percent_off",discountValue:1000,maxUses:1});
    const bundled=await build({entryPoints:[fileURLToPath(new URL("../src/index.js",import.meta.url))],absWorkingDir:process.cwd(),tsconfigRaw:{compilerOptions:{}},bundle:true,platform:"node",format:"cjs",write:false,logLevel:"silent"});
    const module={exports:{}};
    vm.runInNewContext(bundled.outputFiles[0].text,{module,exports:module.exports,crypto,URL,Request,Response,Headers,TextEncoder,btoa,atob,fetch:(...args)=>globalThis.fetch(...args),console:{error(){},warn(){}}},{filename:"isolated-commerce.cjs"});
    const worker=module.exports.default;
    globalThis.fetch=async(url,options={})=>{
      const path=new URL(url).pathname;
      if(path.endsWith("/oauth2/token"))return Response.json({access_token:"local-test"});
      if(path==="/v2/checkout/orders"){
        const input=JSON.parse(options.body),id=`paypal-${++sequence}`;units.set(id,input.purchase_units);
        assert.equal(input.purchase_units[0].amount.breakdown.item_total.value,"10.00");assert.equal(input.purchase_units[0].amount.breakdown.discount.value,"1.00");
        return Response.json({id,status:"CREATED"});
      }
      const id=path.split("/")[4];
      if(path.endsWith("/capture")){captures++;return Response.json({purchase_units:[{payments:{captures:[{id:`capture-${id}`,status:"COMPLETED",amount:{currency_code:"USD",value:units.get(id)[0].amount.value}}]}}]});}
      if(units.has(id)){
        if(id==='paypal-1'){if(++approvalReads===2)releaseApprovals();await approvalsReady;}
        return Response.json({id,status:"APPROVED",purchase_units:units.get(id)});
      }
      throw new Error("Unexpected external request in isolated checkout test");
    };
    const env={DB:db,PAYPAL_ENV:"live",CHECKOUT_ENABLED:"true",LIVE_CONFIGURATION_APPROVED:"true",PAYPAL_CLIENT_ID:"local-client",PAYPAL_CLIENT_SECRET:"local-secret",LIVE_TAX_RULES_JSON:JSON.stringify({mode:"live",version:"test",defaultRule:{rateBasisPoints:0,taxShipping:false,label:"Test"},jurisdictions:{}})};
    const payload={items:[{productKey:"expedition-fiddlers-green-2026-sketch-5x7-pearl",imageId:"i-V6hWQms",imageTitle:"Image 87",quantity:1}],couponCode:" thankyou ",buyer:{name:"Test Buyer",email:"buyer@example.test",phone:"2165550100"},shippingAddress:{addressLine1:"123 Test St",city:"Test",stateCode:"CA",postalCode:"90210",countryCode:"US"}};
    const call=async(path,body={})=>{const response=await worker.fetch(new Request(`https://commerce.test${path}`,{method:"POST",body:JSON.stringify(body),headers:{"content-type":"application/json"}}),env,{waitUntil(p){pending.push(p);}});return {status:response.status,body:await response.json()};};
    const preview=await call("/quote",payload);assert.equal(preview.status,200,JSON.stringify(preview.body));assert.equal(preview.body.merchandiseCents,900);
    const a=await call("/orders",payload),b=await call("/orders",payload);assert.equal(a.status,201,JSON.stringify(a.body));assert.equal(b.status,201);
    const duplicateCallbacks=await Promise.all([call(`/orders/${a.body.orderId}/capture`),call(`/orders/${a.body.orderId}/capture`)]);
    assert.deepEqual(duplicateCallbacks.map(result=>result.status).sort(),[200,409]);
    const paid=duplicateCallbacks.find(result=>result.status===200);assert.equal(paid.body.status,"COMPLETED");
    assert.equal((await call(`/orders/${a.body.orderId}/capture`)).body.alreadyCaptured,true);
    assert.equal((await call(`/orders/${b.body.orderId}/capture`)).status,400);assert.equal(captures,1);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) n FROM promotion_uses WHERE status='redeemed'").get().n,1);
    const saved=JSON.parse(db.sqlite.prepare("SELECT quote_json FROM orders WHERE status='paid'").get().quote_json);assert.equal(saved.promotion.code,"THANKYOU");assert.equal(saved.merchandiseDiscountCents,100);
    await Promise.all(pending);
  }finally{await Promise.allSettled(pending);globalThis.fetch=oldFetch;db.sqlite.close();}
});
