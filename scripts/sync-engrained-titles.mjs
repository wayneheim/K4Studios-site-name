// scripts/sync-engrained-titles.mjs
// One-time sync: updates seriesRegistry.json titles from Engrained-Series.mjs
// Run with: node scripts/sync-engrained-titles.mjs

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const ENGRAINED_PATH = path.join(ROOT, 'src/data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs');
const REGISTRY_PATH = path.join(ROOT, 'src/data/seriesRegistry.json');

async function main() {
  console.log('📖 Loading Engrained-Series.mjs...');
  const engrainedModule = await import('file://' + ENGRAINED_PATH.replace(/\\/g, '/'));
  const items = engrainedModule.engrainedData || engrainedModule.galleryData || [];
  console.log(`   Found ${items.length} items`);

  console.log('📖 Loading seriesRegistry.json...');
  const registryData = JSON.parse(await fs.readFile(REGISTRY_PATH, 'utf8'));

  // Build a map of imageId -> title from Engrained
  const engrainedTitles = {};
  for (const item of items) {
    if (item.id && item.title) {
      engrainedTitles[item.id] = item.title;
    }
  }
  console.log(`   Found ${Object.keys(engrainedTitles).length} items with titles`);

  let updatedCount = 0;
  let mismatchCount = 0;

  // Update series registry
  for (const [seriesId, series] of Object.entries(registryData.series || {})) {
    const imageId = series.primaryImageId;
    if (!imageId) continue;

    const mjsTitle = engrainedTitles[imageId];
    if (!mjsTitle) continue;

    // Check if titles differ
    if (series.title !== mjsTitle) {
      console.log(`\n🔄 ${imageId}:`);
      console.log(`   Registry: "${series.title || '(empty)'}"`);
      console.log(`   MJS file: "${mjsTitle}"`);
      
      series.title = mjsTitle;
      mismatchCount++;
    }

    // Also update occurrences
    for (const occ of series.occurrences || []) {
      if (occ.imageId === imageId && occ.title !== mjsTitle) {
        occ.title = mjsTitle;
        updatedCount++;
      }
    }
  }

  if (mismatchCount > 0) {
    // Update metadata
    registryData._meta = registryData._meta || {};
    registryData._meta.lastUpdated = new Date().toISOString();
    registryData._meta.lastSyncFrom = 'Engrained-Series.mjs';

    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registryData, null, 2), 'utf8');
    console.log(`\n✅ Updated ${mismatchCount} series titles + ${updatedCount} occurrences`);
  } else {
    console.log('\n✅ All titles already in sync!');
  }
}

main().catch(console.error);
