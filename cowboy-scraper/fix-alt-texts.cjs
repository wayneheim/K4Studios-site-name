const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node fix-alt-texts.cjs <file-path>');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

fs.readFile(absolutePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    process.exit(1);
  }

  try {
    // Parse the module export
    const moduleContent = data.replace('export const galleryData = ', '').replace(/;?\s*$/, '');
    const galleryData = eval('(' + moduleContent + ')');

    // Fix alt texts
    galleryData.forEach(item => {
      if (item.alt !== item.title) {
        item.alt = item.title;
      }
    });

    // Write back
    const newContent = `export const galleryData = ${JSON.stringify(galleryData, null, 2)};`;

    fs.writeFile(absolutePath, newContent, 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        process.exit(1);
      }
      console.log(`Fixed alt texts in ${filePath}`);
    });
  } catch (e) {
    console.error('Error parsing or processing file:', e);
    process.exit(1);
  }
});