import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

/**
 * scrapev21 - Simple Gallery Grid Scraper
 * 
 * MINIMAL VERSION - Just grab what's visible on the page right now.
 * No viewport resizing, no complexity. One pass, one src per image.
 * 
 * Usage: npx tsx scrapev21.ts --out=path/to/output.mjs --slug=Galleries/Path/Here
 * 
 * 1. Open Chrome: chrome --remote-debugging-port=9222
 * 2. Navigate to SmugMug gallery page (NOT lightbox)
 * 3. Scroll down to load all lazy images
 * 4. Run this scraper
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

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

async function main() {
  console.log("🌐 scrapev21 - Simple Gallery Grid Scraper");
  console.log("==========================================\n");

  if (!PRIMARY_SLUG) {
    console.warn(
      `⚠️  No --slug provided. Strongly recommended for correct tagging.`
    );
  }

  const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
  const pages = await browser.pages();
  
  // Find a SmugMug gallery page
  let page = pages[pages.length - 1];
  for (const p of pages) {
    const url = p.url();
    if (url.includes("smugmug.com") && !url.match(/\/i-[a-zA-Z0-9]+$/)) {
      page = p;
      console.log(`🎯 Found gallery page: ${url}`);
      break;
    }
  }

  const pageUrl = await page.url();
  console.log(`📍 Page URL: ${pageUrl}\n`);
  const baseUrl = pageUrl.replace(/\/+$/, '');

  // Step 1: Scroll to load all lazy images
  console.log("📜 Scrolling to load all images...");
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    const scrollHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    for (let i = 0; i < scrollHeight; i += 400) {
      window.scrollTo(0, i);
      await delay(80);
    }
    window.scrollTo(0, 0);
  });
  await wait(500);

  // Step 2: Scrape everything visible
  console.log("🔍 Scraping page data...\n");
  
  const rawData = await page.evaluate(() => {
    const results: Array<{
      id: string;
      title: string;
      description: string;
      alt: string;
      keywords: string[];
      imgSrc: string;
    }> = [];

    // Debug: Log what we find
    const allImages = document.querySelectorAll('img');
    console.log(`[DEBUG] Total img tags: ${allImages.length}`);
    
    const imageKeys = document.querySelectorAll('[data-imagekey]');
    console.log(`[DEBUG] Elements with data-imagekey: ${imageKeys.length}`);

    // Strategy 1: Find all elements with data-imagekey
    document.querySelectorAll('[data-imagekey]').forEach(el => {
      const imageKey = el.getAttribute('data-imagekey');
      if (!imageKey) return;
      
      const id = `i-${imageKey}`;
      
      // Look for the containing tile
      const tile = el.closest('.sm-tile') || el.closest('[class*="tile"]') || el.parentElement;
      
      // Title - search in and around the tile
      let title = '';
      const titleSelectors = ['.sm-tile-title', '.sm-tile-content h3', 'h3', '.title'];
      for (const sel of titleSelectors) {
        const found = tile?.querySelector(sel);
        if (found?.textContent?.trim()) {
          title = found.textContent.trim();
          break;
        }
      }
      
      // Description
      let description = '';
      const descSelectors = ['.sm-tile-caption', '.sm-tile-description', '.caption', 'p'];
      for (const sel of descSelectors) {
        const found = tile?.querySelector(sel);
        if (found?.textContent?.trim() && found.textContent.trim().length < 500) {
          description = found.textContent.trim();
          break;
        }
      }
      
      // Keywords
      const keywords: string[] = [];
      const kwContainer = tile?.querySelector('.sm-tile-keywords, .keywords, [class*="keyword"]');
      if (kwContainer) {
        kwContainer.querySelectorAll('a, span').forEach(kw => {
          const text = kw.textContent?.trim();
          if (text && text.length < 50) keywords.push(text);
        });
      }
      
      // Image source - look in and around the element
      let imgSrc = '';
      
      // Direct img inside
      const img = (el.querySelector('img') || el.closest('.sm-tile')?.querySelector('img')) as HTMLImageElement | null;
      if (img?.src && img.src.includes('smugmug.com')) {
        imgSrc = img.src;
      }
      
      // Background image
      if (!imgSrc) {
        const styleEl = el.querySelector('[style*="background"]') || el;
        const style = (styleEl as HTMLElement).style?.backgroundImage || '';
        const match = style.match(/url\(["']?([^"']+)["']?\)/);
        if (match && match[1].includes('smugmug.com')) {
          imgSrc = match[1];
        }
      }
      
      const alt = img?.alt || title;

      results.push({ id, title, description, alt, keywords, imgSrc });
    });

    // Strategy 2: If nothing found with data-imagekey, try to find by URL pattern
    if (results.length === 0) {
      console.log("[DEBUG] No data-imagekey found, trying URL pattern...");
      
      document.querySelectorAll('a[href*="/i-"]').forEach(link => {
        const href = link.getAttribute('href') || '';
        const match = href.match(/\/(i-[a-zA-Z0-9]+)/);
        if (!match) return;
        
        const id = match[1];
        const img = link.querySelector('img') as HTMLImageElement | null;
        
        results.push({
          id,
          title: img?.alt || '',
          description: '',
          alt: img?.alt || '',
          keywords: [],
          imgSrc: img?.src || '',
        });
      });
    }

    return results;
  });

  console.log(`📊 Found ${rawData.length} images on page`);
  
  if (rawData.length === 0) {
    console.log("❌ No images found! Check if the page is a SmugMug gallery.");
    console.log("   The page should have elements with data-imagekey or links containing /i-XXX");
    process.exit(1);
  }

  // Log first few for debugging
  console.log("\n📋 First 3 records:");
  rawData.slice(0, 3).forEach((r, i) => {
    console.log(`  [${i + 1}] ID: ${r.id}`);
    console.log(`      Title: "${r.title.slice(0, 50)}"`);
    console.log(`      Keywords: [${r.keywords.slice(0, 3).join(', ')}]`);
    console.log(`      Src: ${r.imgSrc.slice(0, 80)}...`);
  });

  // Build final records
  const galleries = PRIMARY_SLUG ? [PRIMARY_SLUG] : [];
  
  const records: ImageRecord[] = rawData.map((item, idx) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    alt: item.alt || item.title,
    src: item.imgSrc,
    buyLink: `${baseUrl}/${item.id}/A`,
    keywords: item.keywords,
    story: "",
    notes: "",
    rating: 0,
    galleries,
    visibility: "normal" as const,
    sortOrder: idx,
  }));

  // Add ghost record at front
  const ghost: ImageRecord = {
    id: GHOST_ID,
    title: "K4 Studios",
    description: "",
    alt: "K4 Studios",
    src: "",
    buyLink: "",
    keywords: [],
    story: "",
    notes: "",
    rating: 0,
    galleries,
    visibility: "ghost",
    sortOrder: -1,
  };

  const final = [ghost, ...records];

  // Write output
  const outDir = path.dirname(OUT_PATH);
  if (outDir && !fs.existsSync(outDir)) {
    mkdirpSync(outDir);
  }

  const content = `export const galleryData = ${JSON.stringify(final, null, 2)};\n`;
  fs.writeFileSync(OUT_PATH, content, "utf8");

  console.log(`\n✅ Wrote ${final.length} records (1 ghost + ${records.length} images) to:`);
  console.log(`   ${OUT_PATH}`);
}

main().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
