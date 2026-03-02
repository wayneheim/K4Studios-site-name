import { readFileSync, writeFileSync } from 'node:fs';

const files = [
  './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.mjs',
  './src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White.mjs'
];

for (const file of files) {
  const input = readFileSync(file, 'utf8');
  const lines = input.split(/\r?\n/);
  let changed = 0;

  const outputLines = lines.map((line) => {
    if (!line.includes('"alt":')) return line;

    const updated = line
      .replace(/\s+by Wayne Heim\.?/gi, '')
      .replace(/\s*\s*Wayne Heim/gi, '')
      .replace(/\s*copyright\s*Wayne Heim/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.])/g, '$1')
      .replace(/\s*[,.]/g, '')
      .replace(/\."\s*,?$/, '.",');

    if (updated !== line) changed += 1;
    return updated;
  });

  writeFileSync(file, outputLines.join('\n'));
  console.log(`${file}: updated alt lines = ${changed}`);
}
