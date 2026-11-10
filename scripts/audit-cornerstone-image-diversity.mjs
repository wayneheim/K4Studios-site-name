import fs from 'node:fs';
import {parse} from 'parse5';
const root=process.env.K4_BUILD_OUT_DIR||'dist';
const base=process.argv[2];
const routes=[...fs.readFileSync('src/components/blog/WesternDefinitions.astro','utf8').matchAll(/href: "(\/Blog\/[^\"]+)"/g)].map(m=>m[1]);
const attr=(n,k)=>n?.attrs?.find(a=>a.name===k)?.value||'';
const all=(n,p)=>[...(p(n)?[n]:[]),...(n.childNodes||[]).flatMap(c=>all(c,p))];
const placements=[];
for(const route of routes){
 const html=base?await (await fetch(`${base}${route}/`)).text():fs.readFileSync(`${root}${route}/index.html`,'utf8');
 const doc=parse(html),main=all(doc,n=>n.tagName==='main')[0];
 for(const image of all(main,n=>n.tagName==='img')){
  let parent=image,role;
  while(parent&&parent!==main){const classes=attr(parent,'class').split(/\s+/);if(parent.tagName==='article')role='essay';if(classes.includes('hero-image-wrap'))role='hero';if(classes.includes('cornerstone-bridge'))role='bridge';parent=parent.parentNode;}
  const id=attr(image,'src').match(/\/img\/(i-[\w]+)\//)?.[1];
  if(role&&id)placements.push({route,role,id,alt:attr(image,'alt')});
 }
}
const grouped=placements.reduce((groups,item)=>{(groups[item.id]||=[]).push(item);return groups;},{});
const repeats=Object.entries(grouped).filter(([,items])=>items.length>1).map(([id,items])=>({id,items}));
fs.mkdirSync('tmp/cornerstone-audit',{recursive:true});
fs.writeFileSync('tmp/cornerstone-audit/image-diversity-results.json',JSON.stringify({base:base||root,placements:placements.length,uniqueImages:Object.keys(grouped).length,repeatedImages:repeats,images:placements},null,2));
fs.writeFileSync('tmp/cornerstone-audit/image-diversity-report.md',[
 '# Cornerstone editorial image reuse audit','',
 `Checked ${routes.length} pages: ${placements.length} placements, ${Object.keys(grouped).length} distinct artwork IDs, ${repeats.length} repeated IDs.`,
 '', 'Scope: hero, opening three-image card, and essay samples. Shared site-navigation thumbnails and SEO schema references are excluded.',
 '', ...routes.map(route=>`- ${route}: ${placements.filter(p=>p.route===route).length} editorial images`),
 '', ...repeats.map(item=>`FAIL ${item.id}: ${item.items.map(i=>i.route).join(', ')}`),
 ].join('\n')+'\n');
console.log(`${repeats.length?'FAIL':'PASS'}: ${placements.length} placements; ${Object.keys(grouped).length} distinct artwork IDs; ${repeats.length} repeats.`);
if(repeats.length)console.log(JSON.stringify(repeats));
process.exitCode=repeats.length?1:0;
