const fs = require('fs');

// Read the file
const content = fs.readFileSync('src/data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs', 'utf8');

// Split into items - need to be more careful with the split
const items = content.split(/(?<=\},\s*\n)\s*(?=\{)/);

console.log(`Found ${items.length} items total`);

// Process and update each item
const updatedItems = items.map((item, index) => {
  const idMatch = item.match(/"id":\s*"([^"]+)"/);
  if (!idMatch || idMatch[1] === 'i-k4studios') return item; // Skip welcome item

  // Check if already has pricing fields
  if (item.includes('"editionSize"')) return item;

  // Find the sortOrder line and add pricing fields after it
  const sortOrderMatch = item.match(/"sortOrder":\s*\d+/);
  if (!sortOrderMatch) return item;

  const updatedItem = item.replace(
    /("sortOrder":\s*\d+)\s*$/m,
    '$1,\n    "editionSize": 50,\n    "imageSize": "20\\" × 25\\"",\n    "price": "$675"'
  );

  return updatedItem;
});

// Join back and write
const updatedContent = updatedItems.join('');
fs.writeFileSync('src/data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs', updatedContent);

console.log('Added placeholder pricing fields to all gallery items!');