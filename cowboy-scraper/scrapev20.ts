import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

/**
 * scrapev20 - Gallery Grid Page Scraper
 * 
 * Scrapes from the gallery grid page (not lightbox) which has all data visible:
 * - data-imagekey on each tile = image ID
 * - Title, description, keywords all visible per tile
 * - Resize viewport to get different image size URLs
 * 
 * Usage: npx tsx scrapev20.ts --out=path/to/output.mjs --slug=Galleries/Path/Here
 * 
 * Open browser with: chrome --remote-debugging-port=9222
 * Navigate to gallery page, then run scraper
 */

function getArg(name: string, def = ""): string {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).trim() : def;
}
function getArgs(name: string): string[] {
  return process.argv
    .filter(a => a.startsWith(`--${name}=`))
    .map(a => a.slice(name.length + 3).trim())
    .filter(Boolean);
}

const OUT_PATH = getArg("out", "data/data.mjs");
const PRIMARY_SLUG = getArg("slug", "").replace(/^\/+/, "");
const EXTRA_SLUGS = getArgs("add").map(s => s.replace(/^\/+/, ""));
const GHOST_ID = "i-k4studios";

type Visibility = "show" | "ghost" | "normal";
type ImageRecord = {
  id: string;
  title: string;
  description: string;
  alt: string;
  src: string;
  buyLink: string;
  keywords: string[];
  story: string;
  notes: string;
  rating: number;
  galleries: string[];
  visibility: Visibility;
  sortOrder: number;
  srcXL?: string;
  srcL?: string;
  srcM?: string;
  srcS?: string;
  srcOriginal?: string;
  first_seen?: string;
};

function uniq<T>(arr: T[] = []): T[] {
  return Array.from(new Set(arr.filter(Boolean)));
}

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

const SIZE_BREAKPOINTS = [
  { name: "srcXL", width: 2200, height: 1800 },
  { name: "srcL", width: 1200, height: 900 },
  { name: "srcM", width: 800, height: 600 },
  { name: "srcS", width: 400, height: 300 },
];

// Extract all image data from gallery grid at current viewport size
async function scrapeGalleryGrid(page: puppeteer.Page): Promise<Map<string, Partial<ImageRecord>>> {
  const items = await page.evaluate(() => {
    const results: Array<{
      id: string;
      title: string;
      description: string;
      alt: string;
      keywords: string[];
      imgSrc: string;
      imgSize: string;
    }> = [];

    // Find all image tiles - try multiple selectors
    const tiles = document.querySelectorAll('[data-imagekey], .sm-tile-content, .sm-gallery-image-model');
    
    tiles.forEach(tile => {
      // Get image key from data attribute or parent
      let imageKey = tile.getAttribute('data-imagekey');
      if (!imageKey) {
        const keyEl = tile.querySelector('[data-imagekey]');
        imageKey = keyEl?.getAttribute('data-imagekey') || '';
      }
      if (!imageKey) return;

      const id = `i-${imageKey}`;

      // Get title - try multiple selectors
      const titleEl = tile.closest('.sm-tile')?.querySelector('.sm-tile-title, .sm-tile-info h3, .sm-gallery-title') ||
                      tile.querySelector('.sm-tile-title');
      const title = titleEl?.textContent?.trim() || '';

      // Get description/caption
      const descEl = tile.closest('.sm-tile')?.querySelector('.sm-tile-caption, .sm-tile-description, .sm-tile-info p') ||
                     tile.querySelector('.sm-tile-caption');
      const description = descEl?.textContent?.trim() || '';

      // Get keywords - they're usually links in a keywords container
      const kwContainer = tile.closest('.sm-tile')?.querySelector('.sm-tile-keywords') ||
                          tile.querySelector('.sm-tile-keywords');
      const keywords: string[] = [];
      if (kwContainer) {
        kwContainer.querySelectorAll('a').forEach(a => {
          const kw = a.textContent?.trim();
          if (kw) keywords.push(kw);
        });
      }

      // Get image src - from img tag or background-image
      let imgSrc = '';
      let imgSize = '';
      
      const img = tile.querySelector('img') as HTMLImageElement | null;
      if (img?.src && img.src.includes('smugmug.com')) {
        imgSrc = img.src;
      }
      
      // Check background-image
      if (!imgSrc) {
        const bgEl = tile.querySelector('[style*="background-image"]') as HTMLElement | null;
        if (bgEl) {
          const match = bgEl.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
          if (match && match[1].includes('smugmug.com')) {
            imgSrc = match[1];
          }
        }
      }

      // Determine size from URL
      if (imgSrc) {
        if (imgSrc.includes('/XL/') || imgSrc.includes('-XL.')) imgSize = 'srcXL';
        else if (imgSrc.includes('/L/') || imgSrc.includes('-L.')) imgSize = 'srcL';
        else if (imgSrc.includes('/M/') || imgSrc.includes('-M.')) imgSize = 'srcM';
        else if (imgSrc.includes('/S/') || imgSrc.includes('-S.')) imgSize = 'srcS';
        else if (imgSrc.includes('/X2/') || imgSrc.includes('-X2.')) imgSize = 'srcX2';
        else if (imgSrc.includes('/X3/') || imgSrc.includes('-X3.')) imgSize = 'srcX3';
      }

      // Get alt text from img
      const alt = img?.alt || title || '';

      results.push({
        id,
        title,
        description,
        alt,
        keywords,
        imgSrc,
        imgSize,
      });
    });

    return results;
  });

  // Convert to Map keyed by ID
  const map = new Map<string, Partial<ImageRecord>>();
  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, {
        id: item.id,
        title: item.title,
        description: item.description,
        alt: item.alt,
        keywords: item.keywords,
      });
    }
    
    // Add image URL for this size
    const record = map.get(item.id)!;
    if (item.imgSrc && item.imgSize) {
      (record as any)[item.imgSize] = item.imgSrc;
      // Also set as src if it's the best we have
      if (!record.src || item.imgSize === 'srcXL') {
        record.src = item.imgSrc;
      }
    }
    
    // Merge keywords
    if (item.keywords.length > 0) {
      record.keywords = uniq([...(record.keywords || []), ...item.keywords]);
    }
  }

  return map;
}

/* =========================== Main =========================== */
async function main() {
  console.log("🌐 scrapev20 - Gallery Grid Page Scraper");
  console.log("=========================================\n");

  if (!PRIMARY_SLUG) {
    console.warn(
      `⚠️  No --slug provided. Strongly recommended for correct tagging.\n   Example: --slug="Galleries/Fine-Art-Photography/Transportation/Boats"`
    );
  }

  const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
  const pages = await browser.pages();
  
  // Find a SmugMug gallery page (not lightbox - no /i-XXXXX in URL)
  let page = pages[pages.length - 1];
  for (const p of pages) {
    const url = p.url();
    if (url.includes("smugmug.com") && !url.match(/\/i-[a-zA-Z0-9]+/)) {
      page = p;
      console.log(`🎯 Found SmugMug gallery page: ${url.slice(0, 80)}...`);
      break;
    }
  }

  const pageUrl = await page.url();
  console.log(`📍 Page URL: ${pageUrl}\n`);

  // Build base URL for buy links (remove trailing slash, add /i-{key}/A)
  const baseUrl = pageUrl.replace(/\/+$/, '');

  let results: ImageRecord[] = [];
  const imageData = new Map<string, Partial<ImageRecord>>();

  try {
    // Scrape at each viewport size to capture different image URLs
    for (const bp of SIZE_BREAKPOINTS) {
      console.log(`📐 Resizing to ${bp.name} (${bp.width}x${bp.height})...`);
      await page.setViewport({ width: bp.width, height: bp.height });
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      await wait(300); // Wait for images to reload

      // Scroll to load lazy images
      await page.evaluate(async () => {
        const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
        for (let i = 0; i < document.body.scrollHeight; i += 500) {
          window.scrollTo(0, i);
          await delay(100);
        }
        window.scrollTo(0, 0);
      });
      await wait(200);

      const gridData = await scrapeGalleryGrid(page);
      console.log(`   Found ${gridData.size} images`);

      // Merge into main data
      for (const [id, data] of gridData) {
        if (!imageData.has(id)) {
          imageData.set(id, { id });
        }
        const existing = imageData.get(id)!;
        
        // Merge all fields
        if (data.title && !existing.title) existing.title = data.title;
        if (data.description && !existing.description) existing.description = data.description;
        if (data.alt && !existing.alt) existing.alt = data.alt;
        if (data.keywords?.length) existing.keywords = uniq([...(existing.keywords || []), ...data.keywords]);
        
        // Merge size URLs
        for (const size of ['src', 'srcXL', 'srcL', 'srcM', 'srcS', 'srcX2', 'srcX3']) {
          if ((data as any)[size] && !(existing as any)[size]) {
            (existing as any)[size] = (data as any)[size];
          }
        }
      }
    }

    console.log(`\n✨ Total unique images found: ${imageData.size}\n`);

    // Convert to array and build final records
    let sortOrder = 0;
    for (const [id, data] of imageData) {
      const buyLink = `${baseUrl}/${id}/A`;
      
      const record: ImageRecord = {
        id: data.id || id,
        title: data.title || '',
        description: data.description || '',
        alt: data.alt || data.title || '',
        src: data.src || data.srcXL || data.srcL || data.srcM || data.srcS || '',
        srcXL: data.srcXL || '',
        srcL: data.srcL || '',
        srcM: data.srcM || '',
        srcS: data.srcS || '',
        srcOriginal: '',
        buyLink,
        keywords: data.keywords || [],
        story: data.description || '',
        notes: '',
        rating: 0,
        galleries: uniq([PRIMARY_SLUG, ...EXTRA_SLUGS].filter(Boolean)),
        visibility: 'show',
        sortOrder: sortOrder++,
        first_seen: new Date().toISOString().slice(0, 10),
      };

      results.push(record);
      console.log(`  [${sortOrder}] ${id} | ${record.title.slice(0, 40) || '(no title)'} | kw:${record.keywords.length}`);
    }

  } catch (err: any) {
    console.error(`❌ Error scraping:`, err?.message || err);
  }

  // Insert ghost intro image at the start
  const ghostEntry: ImageRecord = {
    id: GHOST_ID,
    title: "Welcome K4 Studios",
    description: "Explore the grit, grace, and story behind each image.",
    alt: "Welcome to the K4 Studios Gallery",
    src: "/images/gallery-intro-placeholder.jpg",
    buyLink: "",
    keywords: [],
    story: "",
    notes: "",
    rating: 0,
    galleries: [PRIMARY_SLUG || "Other/Photo-Shoots/boats"],
    visibility: "ghost",
    sortOrder: -1,
    srcXL: "",
    srcL: "",
    srcM: "",
    srcS: "",
    srcOriginal: "",
  };
  results.unshift(ghostEntry);

  // Write output
  const outputPath = path.join(OUT_PATH);
  mkdirpSync(path.dirname(outputPath));
  fs.writeFileSync(outputPath, `export const galleryData = ${JSON.stringify(results, null, 2)};\n`);
  console.log(`\n🟢 Saved ${results.length} entries → ${outputPath}`);

  // Summary
  const withSrc = results.filter(r => r.src && r.src !== '/images/gallery-intro-placeholder.jpg').length;
  const withKw = results.filter(r => r.keywords.length > 0).length;
  const withTitle = results.filter(r => r.title && r.id !== GHOST_ID).length;
  console.log(`📊 Summary: ${withSrc} with images, ${withTitle} with titles, ${withKw} with keywords`);

  try {
    await browser.disconnect();
  } catch {
    console.warn("Browser disconnect (ignored).");
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
