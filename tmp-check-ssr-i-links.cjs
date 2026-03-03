(async()=>{
  const ua='Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';
  const xml=await (await fetch('https://www.k4studios.com/sitemap.xml')).text();
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m=>m[1].trim());
  const galleries=[...new Set(urls.filter(u=>/\/Galleries\//.test(u) && !/\/i-[A-Za-z0-9-]+\/?$/.test(u)))].slice(0,10);
  const results=[];
  for(const u of galleries){
    const r=await fetch(u,{headers:{'User-Agent':ua,'Accept':'text/html,*/*'},redirect:'follow'});
    const h=await r.text();
    const iHref=(h.match(/href=["'][^"']*\/i-[A-Za-z0-9-]+\/?["']/gi)||[]).length;
    const iAny=(h.match(/\/i-[A-Za-z0-9-]+\b/gi)||[]).length;
    results.push({url:u,status:r.status,html_bytes:Buffer.byteLength(h,'utf8'),href_i_links:iHref,any_i_tokens:iAny});
  }
  console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1);});
