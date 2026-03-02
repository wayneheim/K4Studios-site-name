import { readFileSync } from 'node:fs';
const file = './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs';
const txt = readFileSync(file,'utf8');
const entries = [...txt.matchAll(/"id"\s*:\s*"([^"]+)"[\s\S]*?"title"\s*:\s*"([^"]+)"[\s\S]*?"description"\s*:\s*"([\s\S]*?)",\r?\n\s*"alt"/g)]
  .map(m => ({ id: m[1], title: m[2], desc: m[3] }));

const hasCommercial = (s) => /collector|wall art|fine art print|archival print|prints|museum quality|buy|purchase/i.test(s);
const isIntro = (s) => /^Explore the grit, grace, and story behind each image\.?$/i.test(s.trim());

const targets = entries.filter(e => !isIntro(e.desc) && !hasCommercial(e.desc)).slice(0, 12);
console.log('candidateCount', targets.length);
for (const t of targets) {
  console.log(`${t.id} | ${t.title}`);
}
