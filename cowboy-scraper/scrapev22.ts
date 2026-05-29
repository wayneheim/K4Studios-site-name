import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

/**
 * scrapev22 - Smart Multi-Page Scraper with Skip Detection
 * 
 * For each page:
 *   1. Quick scan for IDs
 *   2. If all IDs exist in output file → skip page
 *   3. If any new IDs → do XL/L/M/S resize dance for that page
 * 
 * Usage: npx tsx scrapev22.ts --out=path/to/output.mjs --slug=Galleries/Path/Here
 */

function getArg(name: string, def = ""): string {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).trim() : def;
}

const OUT_PATH = getArg("out", "data/test-output.mjs");
const PRIMARY_SLUG = getArg("slug", "").replace(/^\/+/, "");
const GHOST_ID = "i-k4studios";

type ImageRecord = {
  id: string;
  title: string;
  description: string;
  alt: string;
  src: string;
  srcXL: string;
  srcL: string;
  srcM: string;
  srcS: string;
  buyLink: string;
  keywords: string[];
  story: string;
  notes: string;
  rating: number;
  galleries: string[];
  visibility: string;
  sortOrder: number;
  first_seen?: string;
};

const SIZE_CONFIGS = [
  { name: "XL", field: "srcXL", width: 1400, height: 1000 },
  { name: "L",  field: "srcL",  width: 849,  height: 700 },
  { name: "M",  field: "srcM",  width: 629,  height: 500 },
  { name: "S",  field: "srcS",  width: 399,  height: 350 },
];

function normalizeSmugMugSizeUrls(seedUrl: string): Pick<ImageRecord, "src" | "srcXL" | "srcL" | "srcM" | "srcS"> | null {
  const match = seedUrl.match(
    /^(https:\/\/photos\.smugmug\.com.+?\/i-[^/]+\/\d+\/)(?:[^/]+\/)?([A-Za-z0-9]+)\/(.+)-([A-Za-z0-9]+)\.(jpg|jpeg|png|webp)$/i
  );

  if (!match) {
    return null;
  }

  const [, prefix, , fileStem, , extension] = match;
  const build = (sizeCode: "XL" | "L" | "M" | "S") => `${prefix}${sizeCode}/${fileStem}-${sizeCode}.${extension}`;

  return {
    src: build("XL"),
    srcXL: build("XL"),
    srcL: build("L"),
    srcM: build("M"),
    srcS: build("S"),
  };
}

// Load existing data from output file
function loadExistingData(filePath: string): Map<string, ImageRecord> {
  const map = new Map<string, ImageRecord>();
  if (!fs.existsSync(filePath)) return map;
  
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const match = content.match(/export\s+const\s+galleryData\s*=\s*(\[[\s\S]*\])\s*;?\s*$/);
    if (match) {
      const fn = new Function(`return ${match[1]}`);
      const data = fn() as ImageRecord[];
      for (const item of data) {
        if (item.id) map.set(item.id, item);
      }
    }
  } catch (e) {
    console.warn(`⚠️ Could not load existing data: ${(e as Error).message}`);
  }
  return map;
}

// Quick ID-only scrape (no metadata needed for skip check)
async function scrapeIdsOnly(page: puppeteer.Page): Promise<string[]> {
  return await page.evaluate(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    document.querySelectorAll('[data-imagekey]').forEach(el => {
      const key = el.getAttribute('data-imagekey');
      if (key) {
        const id = `i-${key}`;
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    });
    return ids;
  });
}

// Full scrape with metadata
async function scrapeCurrentDOM(page: puppeteer.Page): Promise<Map<string, { id: string; title: string; description: string; alt: string; keywords: string[]; imgSrc: string }>> {
  const items = await page.evaluate(() => {
    const results: Array<{
      id: string;
      title: string;
      description: string;
      alt: string;
      keywords: string[];
      imgSrc: string;
    }> = [];
    
    const seenIds = new Set<string>();
    const keyEls = document.querySelectorAll('[data-imagekey]');
    
    keyEls.forEach(el => {
      const imageKey = el.getAttribute('data-imagekey');
      if (!imageKey) return;
      
      const id = `i-${imageKey}`;
      if (seenIds.has(id)) return;
      seenIds.add(id);
      
      const tile = el.closest('.sm-tile') || el.closest('li') || el.closest('[class*="tile"]');
      
      let imgSrc = '';
      let alt = '';
      
      const img = tile?.querySelector('img.sm-image') as HTMLImageElement | null;
      if (img?.src && img.src.includes('smugmug.com')) {
        imgSrc = img.src;
        alt = img.alt || '';
      }
      
      if (!imgSrc) {
        const anyImg = tile?.querySelector('img[src*="smugmug.com"]') as HTMLImageElement | null;
        if (anyImg) {
          imgSrc = anyImg.src;
          alt = anyImg.alt || '';
        }
      }
      
      const titleEl = tile?.querySelector('.sm-tile-title, p[data-name="Title"]');
      const title = titleEl?.textContent?.trim() || alt || '';
      
      const captionEl = tile?.querySelector('.sm-tile-caption, p[data-name="CaptionRaw"]');
      const description = captionEl?.textContent?.trim() || '';
      
      const keywords: string[] = [];
      const kwEls = tile?.querySelectorAll('.sm-tile-keywords a, [class*="keyword"] a');
      kwEls?.forEach(kw => {
        const t = kw.textContent?.trim();
        if (t) keywords.push(t);
      });

      results.push({ id, title, description, alt: alt || title, keywords, imgSrc });
    });

    return results;
  });

  const map = new Map<string, { id: string; title: string; description: string; alt: string; keywords: string[]; imgSrc: string }>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return map;
}

// Get total page count from pagination
async function getPageCount(page: puppeteer.Page): Promise<number> {
  return await page.evaluate(() => {
    const buttons = document.querySelectorAll('.sm-pagination button[data-value]');
    let max = 1;
    buttons.forEach(btn => {
      const val = parseInt(btn.getAttribute('data-value') || '1', 10);
      if (val > max) max = val;
    });
    return max;
  });
}

// Click to a specific page number
async function goToPage(page: puppeteer.Page, pageNum: number): Promise<void> {
  await page.evaluate((num) => {
    const btn = document.querySelector(`.sm-pagination button[data-value="${num}"]`) as HTMLButtonElement;
    if (btn) btn.click();
  }, pageNum);
  await new Promise(r => setTimeout(r, 1500));
}

async function main() {
  console.log("🌐 scrapev22 - Smart Multi-Page Scraper");
  console.log("========================================\n");

  // Load existing data for skip detection
  const existingData = loadExistingData(OUT_PATH);
  console.log(`📂 Existing records: ${existingData.size}`);
  
  const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
  const pages = await browser.pages();
  
  let page = pages[pages.length - 1];
  for (const p of pages) {
    if (p.url().includes("smugmug.com")) {
      page = p;
      break;
    }
  }

  const pageUrl = await page.url();
  console.log(`📍 Page: ${pageUrl}\n`);
  const baseUrl = pageUrl.replace(/\/+$/, '').replace(/\/i-[a-zA-Z0-9]+.*$/, '');

  // Store NEW data only (existing stays untouched)
  const newData = new Map<string, Partial<ImageRecord>>();

  // Check for pagination
  const totalPages = await getPageCount(page);
  console.log(`📄 Found ${totalPages} page(s)\n`);

  let pagesSkipped = 0;
  let pagesScraped = 0;

  // Loop through each page
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (totalPages > 1 && pageNum > 1) {
      await goToPage(page, pageNum);
    }
    
    // Quick ID scan
    const pageIds = await scrapeIdsOnly(page);
    const newIds = pageIds.filter(id => !existingData.has(id) && !newData.has(id));
    
    console.log(`📄 Page ${pageNum}: ${pageIds.length} images, ${newIds.length} new`);
    
    if (newIds.length === 0) {
      console.log(`   ⏭️  Skipping (all exist)`);
      pagesSkipped++;
      continue;
    }
    
    pagesScraped++;
    console.log(`   🔄 Scraping new images...`);
    
    // Do the size dance for this page
    for (const config of SIZE_CONFIGS) {
      console.log(`   📐 ${config.name}: ${config.width}x${config.height}`);
      await page.setViewport({ width: config.width, height: config.height });
      
      await page.evaluate(() => {
        window.dispatchEvent(new Event('resize'));
        window.scrollTo(0, 1);
        window.scrollTo(0, 0);
      });
      
      await new Promise(r => setTimeout(r, 1500));
      
      const sizeData = await scrapeCurrentDOM(page);
      
      // Only add NEW images
      for (const [id, item] of sizeData) {
        if (existingData.has(id)) continue; // Skip existing
        
        if (!newData.has(id)) {
          newData.set(id, {
            id: item.id,
            title: item.title,
            description: item.description,
            alt: item.alt,
            keywords: item.keywords,
          });
        }
        
        const record = newData.get(id)!;
        const normalizedUrls = normalizeSmugMugSizeUrls(item.imgSrc);

        if (normalizedUrls) {
          record.src = normalizedUrls.src;
          record.srcXL = normalizedUrls.srcXL;
          record.srcL = normalizedUrls.srcL;
          record.srcM = normalizedUrls.srcM;
          record.srcS = normalizedUrls.srcS;
        } else {
          (record as any)[config.field] = item.imgSrc;
          
          if (config.name === "XL") {
            record.src = item.imgSrc;
          }
        }
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Pages skipped: ${pagesSkipped}`);
  console.log(`   Pages scraped: ${pagesScraped}`);
  console.log(`   New images: ${newData.size}`);
  console.log(`   Existing images: ${existingData.size}`);

  if (newData.size === 0) {
    console.log(`\n✅ No new images found. File unchanged.`);
    // Reset viewport and exit
    await page.setViewport({ width: 1920, height: 1080 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    process.exit(0);
  }

  // Build final records - existing + new
  const galleries = PRIMARY_SLUG ? [PRIMARY_SLUG] : [];
  const today = new Date().toISOString().slice(0, 10);
  
  // Start with existing records (preserve everything)
  const allRecords: ImageRecord[] = [];
  for (const [id, record] of existingData) {
    allRecords.push(record);
  }
  
  // Find max sortOrder
  let maxSortOrder = Math.max(-1, ...allRecords.map(r => r.sortOrder ?? 0));
  
  // Add new records
  for (const [id, data] of newData) {
    maxSortOrder++;
    allRecords.push({
      id: data.id!,
      title: data.title || "",
      description: data.description || "",
      alt: data.alt || data.title || "",
      src: data.src || data.srcXL || data.srcL || "",
      srcXL: data.srcXL || "",
      srcL: data.srcL || "",
      srcM: data.srcM || "",
      srcS: data.srcS || "",
      buyLink: `${baseUrl}/${id}/A`,
      keywords: data.keywords || [],
      story: "",
      notes: "",
      rating: 0,
      galleries,
      visibility: "normal",
      sortOrder: maxSortOrder,
      first_seen: today,
    });
  }

  // Ensure ghost record exists
  if (!allRecords.some(r => r.id === GHOST_ID)) {
    allRecords.unshift({
      id: GHOST_ID,
      title: "K4 Studios",
      description: "",
      alt: "K4 Studios",
      src: "",
      srcXL: "",
      srcL: "",
      srcM: "",
      srcS: "",
      buyLink: "",
      keywords: [],
      story: "",
      notes: "",
      rating: 0,
      galleries,
      visibility: "ghost",
      sortOrder: -1,
    });
  }

  // Sort by sortOrder
  allRecords.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // Write output
  const outDir = path.dirname(OUT_PATH);
  if (outDir && !fs.existsSync(outDir)) {
    mkdirpSync(outDir);
  }

  const content = `export const galleryData = ${JSON.stringify(allRecords, null, 2)};\n`;
  fs.writeFileSync(OUT_PATH, content, "utf8");

  console.log(`\n✅ Wrote ${allRecords.length} records (${newData.size} new) to: ${OUT_PATH}`);
  
  // Reset viewport
  console.log("📐 Resetting viewport...");
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
