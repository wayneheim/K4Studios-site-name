export function renderOpenOrdersButton() {
  return `<style>
  .open-orders{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border:1px solid #737373;border-radius:7px;background:#3b3b3b;color:#eee;text-decoration:none;font:600 14px/1.45 system-ui;white-space:nowrap}
  .open-orders[data-state="pending"]{background:#a92228;border-color:#f07176;color:#fff}
  .open-orders[data-state="error"]{border-color:#c6a15d;color:#edcb8d}
  .open-orders:focus-visible{outline:2px solid #d8b46a;outline-offset:3px}
  </style><a class="open-orders" id="open-orders" href="/__k4stats/orders" target="_blank" rel="noopener" data-state="loading" aria-busy="true">Open Orders <span data-order-count aria-live="polite">…</span></a>
  <script data-k4-orders>(()=>{
    const button=document.getElementById('open-orders'),count=button.querySelector('[data-order-count]');
    let loading=false;
    async function refresh(){
      if(loading||document.hidden)return;loading=true;
      try{
        const response=await fetch('/__k4stats/orders/summary',{credentials:'same-origin',cache:'no-store'});
        if(!response.ok)throw new Error('unavailable');
        const data=await response.json(),pending=Number(data.pendingCount);
        if(!Number.isInteger(pending)||pending<0)throw new Error('invalid count');
        button.dataset.state=pending?'pending':'empty';count.textContent=pending?'('+pending+')':'';
        button.title=pending+' paid order'+(pending===1?'':'s')+' awaiting processing';
      }catch{button.dataset.state='error';count.textContent='(?)';button.title='Order status unavailable. Open the tracker to retry.';}
      finally{loading=false;button.setAttribute('aria-busy','false');}
    }
    refresh();setInterval(refresh,60000);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    if('BroadcastChannel' in window){const channel=new BroadcastChannel('k4-orders');channel.onmessage=refresh;}
  })();</script>`;
}

export function renderOrderTracker() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>K4 Order Tracker</title><style>
  :root{color-scheme:dark;--bg:#11130f;--panel:#1b1f18;--line:#3b4235;--text:#f2f0e8;--muted:#a8ad9f;--gold:#d8b46a}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,sans-serif}main{max-width:1060px;margin:auto;padding:28px 18px 60px}header{display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap}h1{margin:0;color:var(--gold);font-size:28px}h2{margin:30px 0 12px;font-size:19px}h3{font-size:15px;margin:0 0 9px}p{margin:6px 0}a{color:#b9d6bf}button,.back{border:1px solid #68755e;border-radius:6px;background:#2b3426;color:var(--text);padding:9px 13px;font:inherit;text-decoration:none;cursor:pointer}button:disabled{opacity:.55;cursor:default}.muted,.image-id{color:var(--muted)}.image-id{font-size:13px;user-select:text}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.notice{min-height:24px;margin-top:18px}.error{color:#ffb7b7}.order{margin-bottom:10px;border:1px solid #85504d;border-radius:8px;background:#261c19;overflow:hidden}.order.history{background:#1b1e1a;border-color:var(--line)}.order.processed{background:#202620;border-color:#425343}.order>summary{display:flex;align-items:center;gap:12px;padding:15px;cursor:pointer;list-style:none}.order>summary::-webkit-details-marker{display:none}.order>summary:before{content:'+';flex:none;font:24px/1 monospace;color:var(--gold);width:18px}.order[open]>summary:before{content:'−'}.order-heading{flex:1;min-width:0}.order-number{font-weight:700}.order-meta{font-size:13px;color:var(--muted);overflow-wrap:anywhere}.order-total{font-weight:700;white-space:nowrap}.badge{display:inline-block;border-radius:4px;padding:3px 8px;margin-top:5px;font-size:12px;background:#4b2423;color:#ffd4cd}.processed .badge{background:#334235;color:#bed6bd}.history .badge{background:#333;color:#ccc}.order-body{padding:18px;border-top:1px solid var(--line)}.order-columns{display:grid;grid-template-columns:1.6fr 1fr;gap:26px}.item{padding:11px 0;border-bottom:1px solid var(--line)}.item:first-child{padding-top:0}.item p{font-size:14px}.item a{display:inline-block;margin-top:6px}.totals{margin-top:14px;display:grid;grid-template-columns:1fr auto;gap:5px 18px;font-size:14px}.totals strong{border-top:1px solid var(--line);padding-top:6px}.address{white-space:pre-line;overflow-wrap:anywhere}.actions{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}.actions button{background:#6b322b;border-color:#bd7d6d;font-weight:700}.actions p{max-width:580px;font-size:13px;color:var(--muted)}.empty{padding:20px;border:1px dashed var(--line);border-radius:8px;color:var(--muted)}.more{margin:8px 0 16px}.more[hidden]{display:none}button:focus-visible,summary:focus-visible,a:focus-visible{outline:2px solid var(--gold);outline-offset:3px}@media(max-width:650px){.order-columns{grid-template-columns:1fr}.order>summary{flex-wrap:wrap}.order-heading{flex-basis:65%}.order-total{margin-left:30px}}
  .shipping-tools{margin-top:18px;padding-top:18px;border-top:1px solid var(--line)}.shipping-row{display:flex;align-items:end;gap:12px;flex-wrap:wrap}.shipping-field{display:flex;flex-direction:column;gap:6px;font-size:13px}.shipping-field.tracking-number{flex:1;min-width:170px}.shipping-tools input,.shipping-tools select{width:100%;min-height:40px;padding:8px 10px;border:1px solid #68755e;border-radius:5px;background:#12170f;color:var(--text);font:14px system-ui}.shipping-tools input:disabled,.shipping-tools select:disabled{opacity:.5}.shipping-tools input:focus-visible,.shipping-tools select:focus-visible{outline:2px solid var(--gold);outline-offset:2px}.shipping-tools>p{margin-top:10px;font-size:13px;color:var(--muted)}
  </style></head><body><main>
  <header><div><h1>K4 Order Tracker</h1><p class="muted" id="tracker-subtitle">Checking orders…</p></div><div class="toolbar"><a class="back" href="/__k4stats">K4 Stats</a><button type="button" id="refresh-orders">Refresh orders</button></div></header>
  <p class="notice" id="notice" role="status" aria-live="polite"></p>
  <h2>Awaiting processing <span id="pending-count"></span></h2><div id="pending-orders"><p class="empty">Loading orders…</p></div><button class="more" type="button" id="more-pending" hidden>Load more waiting orders</button>
  <h2>Order history</h2><p class="muted">Processed orders and orders requiring other follow-up. Expand an order to view its details.</p><div id="history-orders"></div><button class="more" type="button" id="more-history" hidden>Load older orders</button>
  </main><script>
  (()=>{
    const notice=document.getElementById('notice'),refreshButton=document.getElementById('refresh-orders');
    const cursors={pending:null,history:null};let busy=false;
    const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(cents||0)/100);
    const date=value=>value?new Date(value).toLocaleString('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'})+' ET':'';
    function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;}
    async function request(path,options={}){
      const response=await fetch('/__k4stats/orders'+path,{...options,credentials:'same-origin',cache:'no-store'});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Order service unavailable.');return data;
    }
    function fulfillmentUrl(item){
      if(item.fulfillment!=='smugmug-manual')return '';
      try{const url=new URL(item.fulfillmentUrl);if(url.protocol!=='https:'||url.hostname!=='wayne-heim.smugmug.com'||url.username||url.password)return '';
        const match=url.pathname.match(/\\/(i-[A-Za-z0-9]+)\\/(?:A|buy)\\/?$/);
        if(!match||match[1]!==String(item.imageId||'').replace(/-sketch$/i,''))return '';
        url.pathname=url.pathname.replace(/\\/(?:A|buy)\\/?$/,'/buy');url.hash='';return url.href;
      }catch{return '';}
    }
    function shippingForm(order,processed){
      const form=element('form','shipping-tools');form.append(element('h3','', 'Optional shipping email'));
      const row=element('div','shipping-row'),carrierLabel=element('label','shipping-field','Carrier'),carrier=element('select');
      carrier.name='trackingCarrier';carrier.setAttribute('aria-label','Shipping carrier');
      for(const name of ['FedEx','UPS','USPS','DHL','SmugMug']){const option=element('option','',name);option.value=name;carrier.append(option);}
      carrier.value=order.trackingCarrier||'FedEx';if(!carrier.value)carrier.value='FedEx';
      carrierLabel.append(carrier);
      const numberLabel=element('label','shipping-field tracking-number','Tracking number'),number=element('input');
      number.name='trackingNumber';number.type='text';number.maxLength=120;number.required=true;number.autocomplete='off';number.value=order.trackingNumber||'';
      numberLabel.append(number);
      const queued=Boolean(order.shipmentEmailStatus),button=element('button','',queued?(order.shipmentEmailStatus==='sent'?'Tracking emailed':'Shipping email queued'):'Email tracking number');button.type='submit';
      carrier.disabled=number.disabled=!processed||queued;
      const updateButton=()=>{button.disabled=!processed||queued||!number.value.trim();};number.addEventListener('input',updateButton);updateButton();
      row.append(carrierLabel,numberLabel,button);form.append(row);
      form.append(element('p','',!processed?'Mark this order processed first. Tracking is optional and can be added here when it ships.':queued?'Shipping email: '+({sent:'sent',pending:'queued',retry:'queued for retry'}[order.shipmentEmailStatus]||order.shipmentEmailStatus)+'. The saved tracking details are shown above.':'For orders where you choose to provide tracking. Sends the customer a shipped email and saves this order as shipped.'));
      form.addEventListener('submit',event=>{event.preventDefault();if(!queued&&processed&&form.reportValidity())sendTracking(order,carrier.value,number.value,button);});
      return form;
    }
    function renderOrder(order,view){
      const processed=Boolean(order.processedAt)||['processing','shipped','fulfilled'].includes(order.fulfillmentStatus);
      const details=element('details','order'+(view==='history'?' history':'')+(processed?' processed':''));
      details.dataset.orderId=order.id;
      const summary=element('summary'),heading=element('div','order-heading');
      heading.append(element('div','order-number',order.orderNumber),element('div','order-meta',order.buyerName+' · '+date(order.paidAt||order.createdAt)));
      let status=processed?'Processed':view==='pending'?'Awaiting processing':order.fulfillmentStatus.replaceAll('_',' ');
      if(processed&&order.fulfillmentStatus!=='processing')status+=' · '+order.fulfillmentStatus.replaceAll('_',' ');
      if(order.financialStatus!=='paid')status+=' · '+order.financialStatus.replaceAll('_',' ');
      heading.append(element('span','badge',status));summary.append(heading,element('div','order-total',money(order.totalCents)));details.append(summary);
      const body=element('div','order-body'),columns=element('div','order-columns'),items=element('div');items.append(element('h3','', 'Items ordered'));
      for(const item of order.items||[]){const row=element('div','item');row.append(element('strong','',item.imageTitle),element('div','image-id',item.imageId),element('p','',item.quantity+' × '+item.seriesLabel+' · '+item.size+' · '+item.finish),element('p','muted',money(item.lineTotalCents)));
        const href=fulfillmentUrl(item);if(href){const link=element('a','', 'Order on SmugMug');link.href=href;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}items.append(row);}
      const totals=element('div','totals'),amounts=[['Prints',order.merchandiseSubtotalCents??order.merchandiseCents]];
      if(order.merchandiseDiscountCents)amounts.push(['Print discount',-order.merchandiseDiscountCents]);
      amounts.push(['Shipping',order.shippingCents],['Tax',order.taxCents],['Total',order.totalCents]);
      for(const [label,value] of amounts){const tag=label==='Total'?'strong':'span';totals.append(element(tag,'',label),element(tag,'',money(value)));}items.append(totals);
      if(order.promotion)items.append(element('p','muted','Promotion: '+order.promotion.name+(order.promotion.code?' ('+order.promotion.code+')':'')+(order.shippingDiscountCents?' · shipping savings '+money(order.shippingDiscountCents):'')));
      const contact=element('div');contact.append(element('h3','', 'Customer'),element('p','',order.buyerName),element('p','address',order.buyerEmail),element('p','',order.buyerPhone||''),element('h3','', 'Ship to'));
      const address=order.shippingAddress||{};contact.append(element('p','address',[address.addressLine1,address.addressLine2,[address.city,address.stateCode,address.postalCode].filter(Boolean).join(' '),'United States'].filter(Boolean).join('\\n')));
      if(order.processedAt)contact.append(element('p','muted','Processed '+date(order.processedAt)));
      if(order.processingEmailStatus)contact.append(element('p','muted','Production email: '+({sent:'sent',pending:'queued',retry:'queued for retry'}[order.processingEmailStatus]||order.processingEmailStatus)));
      if(order.trackingNumber)contact.append(element('p','muted',order.trackingCarrier+': '+order.trackingNumber));
      columns.append(items,contact);body.append(columns);
      if(view==='pending'){
        const actions=element('div','actions'),button=element('button','', 'Mark processed');button.type='button';
        actions.append(button,element('p','', 'Use after reviewing this order and placing production. This sends the customer a thank-you confirming their prints have been ordered.'));
        button.addEventListener('click',()=>processOrder(order,button));body.append(actions);
      }
      if(order.paymentStatus==='paid'&&order.financialStatus==='paid'&&['unfulfilled','processing','shipped','fulfilled'].includes(order.fulfillmentStatus))body.append(shippingForm(order,processed));
      details.append(body);return details;
    }
    async function loadList(view,append=false,expandedIds=new Set()){
      const params=new URLSearchParams({view});if(append&&cursors[view])params.set('cursor',JSON.stringify(cursors[view]));
      const data=await request('/data?'+params),list=document.getElementById(view+'-orders');
      if(!append)list.replaceChildren();
      for(const order of data.orders){const details=renderOrder(order,view);details.open=expandedIds.has(order.id);list.append(details);}
      if(!list.children.length)list.append(element('p','empty',view==='pending'?'No paid orders are waiting to be processed.':'No historical orders yet.'));
      cursors[view]=data.nextCursor;document.getElementById('more-'+view).hidden=!data.nextCursor;
    }
    async function refresh(){
      if(busy)return;busy=true;refreshButton.disabled=true;
      try{
        const expandedIds=new Set(Array.from(document.querySelectorAll('details.order[open]'),details=>details.dataset.orderId));
        const [summary]=await Promise.all([request('/summary'),loadList('pending',false,expandedIds),loadList('history',false,expandedIds)]);
        document.getElementById('pending-count').textContent='('+summary.pendingCount+')';
        document.getElementById('tracker-subtitle').textContent=(summary.mode==='live'?'Live orders':'Sandbox test orders')+' · '+summary.pendingCount+' awaiting processing';
        return true;
      }catch(error){notice.className='notice error';notice.textContent=error.message+' Use Refresh orders to retry.';return false;}
      finally{busy=false;refreshButton.disabled=false;}
    }
    async function processOrder(order,button){
      if(busy)return;busy=true;button.disabled=true;notice.className='notice';notice.textContent='Saving '+order.orderNumber+'…';
      try{
        const result=await request('/'+encodeURIComponent(order.id)+'/processed',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
        notice.textContent=result.alreadyProcessed?order.orderNumber+' was already processed.':order.orderNumber+' marked processed. Customer production email queued.';
        if('BroadcastChannel' in window){const channel=new BroadcastChannel('k4-orders');channel.postMessage({updated:true});channel.close();}
        busy=false;await refresh();
      }catch(error){notice.className='notice error';notice.textContent=error.message+' Refresh orders before retrying.';}
      finally{busy=false;button.disabled=false;}
    }
    async function sendTracking(order,trackingCarrier,trackingNumber,button){
      if(busy)return;busy=true;button.disabled=true;notice.className='notice';notice.textContent='Saving shipment for '+order.orderNumber+'…';
      try{
        const result=await request('/'+encodeURIComponent(order.id)+'/shipped',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({trackingCarrier,trackingNumber})});
        notice.textContent=result.alreadyQueued?'A shipping email is already queued or sent for '+order.orderNumber+'.':order.orderNumber+' marked shipped. Customer tracking email queued.';
        busy=false;await refresh();
      }catch(error){notice.className='notice error';notice.textContent=error.message+' Refresh orders before retrying.';}
      finally{busy=false;button.disabled=false;}
    }
    refreshButton.addEventListener('click',async()=>{notice.className='notice';notice.textContent='Refreshing…';if(await refresh())notice.textContent='Orders updated.';});
    for(const view of ['pending','history'])document.getElementById('more-'+view).addEventListener('click',async function(){if(busy)return;busy=true;this.disabled=true;try{await loadList(view,true);}catch(error){notice.className='notice error';notice.textContent=error.message;}finally{busy=false;this.disabled=false;}});
    refresh();
  })();
  </script></body></html>`;
}
