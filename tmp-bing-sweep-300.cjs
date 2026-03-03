(async()=>{
  const ua='Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)';
  const xml=await (await fetch('https://www.k4studios.com/sitemap.xml',{headers:{'User-Agent':ua}})).text();
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(m=>m[1].trim());
  const dedup=[...new Set(urls)].filter(u=>/^https?:\/\//i.test(u));
  const shuffled=[...dedup].sort(()=>Math.random()-0.5).slice(0,300);
  const status={};
  const xr={};
  const suspicious=[];
  for(const u of shuffled){
    try{
      const r=await fetch(u,{headers:{'User-Agent':ua,'Accept':'text/html,*/*','Cache-Control':'no-cache'},redirect:'follow'});
      status[r.status]=(status[r.status]||0)+1;
      const x=(r.headers.get('x-robots-tag')||'').toLowerCase().trim();
      if(x){
        xr[x]=(xr[x]||0)+1;
        if(/noindex|nofollow/.test(x)) suspicious.push({url:u,final_url:r.url,status:r.status,x_robots_tag:x});
      }
      if(r.status>=400) suspicious.push({url:u,final_url:r.url,status:r.status,x_robots_tag:x||null});
    }catch(e){
      status.fetch_error=(status.fetch_error||0)+1;
      suspicious.push({url:u,final_url:null,status:'fetch_error',x_robots_tag:null});
    }
  }
  console.log(JSON.stringify({sample:shuffled.length,status_counts:status,x_robots_counts:xr,suspicious_count:suspicious.length,suspicious:suspicious.slice(0,20)},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
