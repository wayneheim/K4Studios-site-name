import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs',
  './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs'
];

for (const file of files) {
  const input = readFileSync(file, 'utf8');
  let changed = 0;

  const output = input.replace(/("alt"\s*:\s*")([^"]*)(",)/g, (full, p1, alt, p3) => {
    const cleaned = alt
      .replace(/\s+by Wayne Heim\.?/gi, '')
      .replace(/\s*\s*Wayne Heim/gi, '')
      .replace(/\s*copyright\s*Wayne Heim/gi, '')
      .replace(/\s+\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.])/g, '$1')
      .trim();

    if (cleaned !== alt) changed += 1;
    return `${p1}${cleaned}${p3}`;
  });

  writeFileSync(file, output);
  console.log(`${file}: updated alt lines = ${changed}`);
}
