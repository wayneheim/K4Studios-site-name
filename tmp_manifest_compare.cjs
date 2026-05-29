const ids=['i-xxr9Tnb','i-ssCjgX8','i-kWVzc6g','i-qjLp9Lf','i-hM8SXCd','i-6rWdVVk'];
(async()=>{
  const remote=await fetch('https://k4studios.netlify.app/image-manifest.json').then(r=>r.json());
  const local=require('./dist/image-manifest.json');
  for(const id of ids){
    const r=remote[id]||null;
    const l=local[id]||null;
    console.log('---',id,'remote?',!!r,'local?',!!l);
    if(r){console.log('remote m',r.m||'');console.log('remote s',r.s||'');}
    if(l){console.log('local m',l.m||'');console.log('local s',l.s||'');}
  }
})();
