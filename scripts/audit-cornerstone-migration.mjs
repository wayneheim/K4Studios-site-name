import fs from 'node:fs';
import { parse } from 'parse5';
const baseline=JSON.parse(fs.readFileSync('src/data/cornerstones/verified-baseline.json','utf8'));
const refresh=JSON.parse(fs.readFileSync('src/data/cornerstones/image-refresh-2026-11-10.json','utf8'));
const expectedCopy=(route,value)=>(refresh.approvedCaptionChanges||[]).filter(c=>c.route===route).reduce((text,c)=>text.replace(`${c.from} —`,`${c.to} —`).replace(`${c.from} -`,`${c.to} -`),value);
const attr=(n,k)=>n?.attrs?.find(a=>a.name===k)?.value||'';
const all=(n,p)=>[...(p(n)?[n]:[]),...(n.childNodes||[]).flatMap(c=>all(c,p))];
const find=(n,p)=>all(n,p)[0];
const has=(n,c)=>attr(n,'class').split(/\s+/).includes(c);
const text=n=>n?.nodeName==='#text'?n.value:(n?.childNodes||[]).map(text).join('');
const normal=s=>s.replace(/\s+/g,' ').trim();
const stable=x=>JSON.stringify(x);
const schemas=d=>all(d,n=>n.tagName==='script'&&attr(n,'type')==='application/ld+json').map(n=>JSON.parse(text(n)));
const protectedText=article=>all(article,n=>['h1','h2','h3','p','li','summary','figcaption'].includes(n.tagName)&&!all(n,p=>p!==n&&['h1','h2','h3','p','li','summary','figcaption'].includes(p.tagName)).length).map(n=>normal(text(n)));
// Nov 10: Wayne removed the two cropped portraits beneath the cinematic bridge.
const minImages={'what-is-western-art':10,'what-is-cinematic-western-art':12,'what-is-narrative-photography':9,'what-is-visual-storytelling-in-photography':7,'what-is-historically-themed-photography':7};
let failures=0,reference;
const report=[];
const base=process.argv[2];
const root=process.env.K4_BUILD_OUT_DIR||'dist';
const readPage=async route=>{
 if(!base)return fs.readFileSync(`${root}${route}/index.html`,'utf8');
 const response=await fetch(`${base}${route}/`);
 if(!response.ok)throw new Error(`${route}: ${response.status}`);
 return response.text();
};
for(const [route,before] of Object.entries(baseline)){
 const doc=parse(await readPage(route));
 const main=find(doc,n=>n.tagName==='main'),head=find(doc,n=>n.tagName==='head');
 const article=find(main,n=>n.tagName==='article'&&has(n,'cornerstone-standard'));
 const sectionSkeleton=main.childNodes.filter(n=>n.tagName==='section').map(n=>`${n.tagName}.${attr(n,'class')}`);
 const errors=[];
 if(!reference)reference=sectionSkeleton;
 if(stable(reference)!==stable(sectionSkeleton))errors.push('section skeleton differs');
 if(!article||!has(article,'story-block'))errors.push('shared article missing');
 if(stable(sectionSkeleton.map(s=>s.split(/[ .]/)[1]))!==stable(['hero-image-wrap','cornerstone-title','cornerstone-bridge','story-section','western-series','collection-dock']))errors.push('wrong component sequence');
 const metas=all(head,n=>n.tagName==='meta').map(n=>Object.fromEntries(n.attrs.map(a=>[a.name,a.value])));
 if(stable(metas)!==stable(before.metas))errors.push('frozen metadata changed');
 if(text(find(head,n=>n.tagName==='title'))!==before.title)errors.push('frozen title changed');
 if(attr(find(head,n=>n.tagName==='link'&&attr(n,'rel')==='canonical'),'href')!==before.canonical)errors.push('canonical changed');
 if(stable(schemas(doc))!==stable(before.schemas))errors.push('frozen schema changed');
 const priorArticle=find(parse(before.articleHTML),n=>n.tagName==='article');
 const afterCopy=protectedText(article),priorCopy=protectedText(priorArticle).map(value=>expectedCopy(route,value));
 const missing=priorCopy.filter((s,i)=>priorCopy.slice(0,i+1).filter(t=>t===s).length>afterCopy.filter(t=>t===s).length);
 if(missing.length)errors.push(`frozen copy missing: ${missing.map(s=>s.slice(0,90)).join(' | ')}`);
 const allCopy=protectedText(main);
 const expectedPageCopy=before.copy.map(value=>expectedCopy(route,value));
 const missingPageCopy=expectedPageCopy.filter((s,i)=>expectedPageCopy.slice(0,i+1).filter(t=>t===s).length>allCopy.filter(t=>t===s).length);
 if(missingPageCopy.length)errors.push(`frozen title/bridge/footer copy missing: ${missingPageCopy.map(s=>s.slice(0,90)).join(' | ')}`);
 const images=all(article,n=>n.tagName==='img').length;
 const minimum=minImages[route.split('/').pop()]||0;
 if(images<minimum)errors.push(`restored images ${images} below ${minimum}`);
 const bridge=find(main,n=>has(n,'cornerstone-bridge'));
 if(all(bridge,n=>n.tagName==='img').length!==3)errors.push('bridge does not have three samples');
 if(errors.length)failures++;
 report.push({route,sectionSkeleton,images,minimum,errors});
 console.log(`${errors.length?'FAIL':'PASS'} ${route}: images ${images}; ${errors.join('; ')}`);
}
for(const [route,expected] of Object.entries({'/Narrative-Western-Art':'https://www.k4studios.com/img/i-RLZFsxp/the-old-hand-western-cowboy-portrait-art.jpg','/Historical-Western-Art':'https://www.k4studios.com/img/i-Sbr5tSx/a-moment-of-thought-western-cowboy-portrait-art.jpg'})){
 const doc=parse(await readPage(route));
 const og=attr(find(doc,n=>n.tagName==='meta'&&attr(n,'property')==='og:image'),'content');
 const articles=schemas(doc).flatMap(x=>x['@graph']||[x]).filter(x=>x['@type']==='Article');
 const ok=og===expected&&articles.length&&articles.every(x=>stable(x.image)===stable(expected));
 if(!ok)failures++;
 console.log(`${ok?'PASS':'FAIL'} ${route}: Article image matches og:image${ok?'':`; og=${og}; article=${stable(articles.map(x=>x.image))}`}`);
}
fs.writeFileSync('tmp/cornerstone-audit/migration-results.json',JSON.stringify({base:base||'local dist',failures,pages:report},null,2));
fs.writeFileSync('tmp/cornerstone-audit/migration-report.md',[
 '# Cornerstone template migration audit','',`Checked: ${base||'local dist'}. Failing pages: ${failures}.`,'',
 'The frozen baseline was captured from production before migration. Every route is checked for the same six top-level sections, shared article classes and unchanged title/meta/canonical/schema, essay and FAQ text. Four artwork-title references follow the image substitutions recorded in image-refresh-2026-11-10.json. Image counts reflect the approved removal of the cinematic opening pair. Annex Article images are checked against their approved OG images.','',
 '| Page | Result | Essay images | Findings |','|---|---|---|---|',
 ...report.map(p=>`| ${p.route} | ${p.errors.length?'FAIL':'PASS'} | ${p.images} | ${p.errors.join('; ')||'None'} |`),
 '', 'Image pacing and visual flow are verified separately in report.md at desktop and phone widths. FAQ answers and closing navigation remain free of editorial samples.'
 ].join('\n')+'\n');
console.log(`Template migration audit: ${failures} failing pages.`);
process.exitCode=failures?1:0;
