import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

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
  buyLink?: string;
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
  first_seen?: string; // ISO date YYYY-MM-DD, write-once, never mutated
};
function uniq<T>(arr: T[] = []): T[] {
  return Array.from(new Set(arr.filter(Boolean)));
}
function toTitleCase(s: string): string {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}
function humanizeSlug(slug: string): string {
  if (!slug) return "Collection";
  const parts = slug.split("/").filter(Boolean);
  const leaf = parts[parts.length - 1] || "";
  if (/black-?white|bw/i.test(leaf)) return "Black & White";
  return toTitleCase(leaf.replace(/\d{4}-\d{2}-\d{2}/, "").trim());
}
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}
function safeParseURL(u: string): URL | null {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

function buildDefaultFields(
  id: string,
  pageUrl: string,
  gallerySlugFromCli: string
): { title: string; description: string; alt: string; story: string; keywords: string[] } {
  const urlObj = safeParseURL(pageUrl);
  const urlPath = urlObj?.pathname ?? "";
  const urlLeaf = urlPath.split("/").filter(Boolean).pop() || "";
  let fromUrlTitle = toTitleCase(
    urlLeaf.replace(/i-[A-Za-z0-9]+/, "").replace(/[-_]+/g, " ").trim()
  );
  if (!fromUrlTitle || fromUrlTitle === "A") {
    fromUrlTitle = "Untitled";
  }
  const topic = humanizeSlug(gallerySlugFromCli || PRIMARY_SLUG || urlPath);

  const titleVariants = [
    `Untitled — ${topic}`,
    `${topic} Study`,
    `Field Notes — ${topic}`,
    `From The ${topic} Collection`,
  ];
  const pickedTitle = fromUrlTitle || pick(titleVariants, id);

  const descVariants = [
    `Wayne Heim photograph from the ${topic} collection. New image! Notes and full details to be added.`,
    `From the Wayne Heim ${topic} series. New image! More info coming soon.`,
    `Wayne Heim Photography: A selection from ${topic}. Full description coming soon.`,
    `Fine Art Photography by Wayne Heim from the ${topic} collection. New Work! — More info coming soon.`,
  ];
  const pickedDesc = pick(descVariants, id + "desc");

  const storyVariants = [
    `Enjoy a new image from Wayne Heim's ${topic} collection. Full story on image to follow.`,
    `New photo by Wayne Heim from the ${topic} series. Full image story to follow soon.`,
    `New fine art photography by Wayne Heim – ${topic}. Check back soon for complete story on this image.`,
  ];
  const pickedStory = pick(storyVariants, id + "story");

  const kw = uniq(
    [
      ...topic.split(/\s+/).map(t => t.toLowerCase()),
      "fine art",
      "photography",
      "painterly photography",
    ].filter(Boolean)
  );
  const altVariants = [
    `New fine art photograph © Wayne Heim`,
    `Wayne Heim – Fine Art Photography`,
    `Photographic artwork © Wayne Heim`,
    `Fine art image by Wayne Heim`,
  ];
  const pickedAlt = pick(altVariants, id + "alt");

  return {
    title: pickedTitle,
    description: pickedDesc,
    alt: pickedAlt,
    story: pickedStory,
    keywords: kw,
  };
}

function smartSplitTitleAndDescription(titleRaw: string): { title: string; description: string } {
  const splitPhrases = [
    "Painterly photography",
    "Fine art photography",
    "Embrace the spirit",
    "Each piece of his",
    "Bring the essence",
    "© Wayne Heim",
  ];
  for (const phrase of splitPhrases) {
    const idx = titleRaw.indexOf(phrase);
    if (idx > 0) {
      return {
        title: titleRaw.slice(0, idx).trim(),
        description: titleRaw.slice(idx).trim(),
      };
    }
  }
  return { title: titleRaw.trim(), description: "" };
}

// Global cache for preloaded image URLs - keyed by image ID
// This gets populated on every image visit, capturing 2-3 images ahead
const preloadCache: Record<string, Record<string, string>> = {};

// Scrape ALL preload links and add to cache (captures current + next 2-3 images)
async function captureAllPreloadLinks(page: puppeteer.Page): Promise<number> {
  const allLinks = await page.evaluate(() => {
    const results: Array<{ id: string; size: string; url: string }> = [];
    const links = document.querySelectorAll('link[rel="preload"][as="image"]');
    
    links.forEach(link => {
      const href = link.getAttribute("href");
      if (!href || !href.includes('.jpg')) return;
      
      // Extract image ID from URL (e.g., /i-HxX9C2Z/)
      const idMatch = href.match(/\/i-([a-zA-Z0-9]+)\//);
      if (!idMatch) return;
      
      const imageId = `i-${idMatch[1]}`;
      let size = "";
      
      // Determine size from URL
      if (href.includes('/XL/') || href.includes('-XL.jpg')) size = "srcXL";
      else if (href.includes('/L/') || href.includes('-L.jpg')) size = "srcL";
      else if (href.includes('/M/') || href.includes('-M.jpg')) size = "srcM";
      else if (href.includes('/S/') || href.includes('-S.jpg')) size = "srcS";
      else if (href.includes('/Original/')) size = "srcOriginal";
      
      if (size) {
        results.push({ id: imageId, size, url: href });
      }
    });
    
    return results;
  });
  
  // Add to cache, don't overwrite existing
  let newEntries = 0;
  for (const { id, size, url } of allLinks) {
    if (!preloadCache[id]) {
      preloadCache[id] = {};
    }
    if (!preloadCache[id][size]) {
      preloadCache[id][size] = url;
      newEntries++;
    }
  }
  
  return newEntries;
}

// Get cached URLs for an image ID
function getCachedUrls(imageId: string): Record<string, string> {
  return preloadCache[imageId] || {};
}

// -- THIS IS THE scrapeDetails FUNCTION THAT WORKED FOR A SINGLE IMAGE AND RECORDED SIZES --
async function scrapeDetails(
  page: puppeteer.Page, 
  sortOrder: number, 
  currentImageId?: string,
  existingIds?: Set<string>
): Promise<ImageRecord> {
  const smartSplitFn = smartSplitTitleAndDescription.toString();

  // OPTIMIZATION: Skip resizing entirely for existing IDs (already in file)
  const skipResizing = existingIds?.has(currentImageId || "");
  if (skipResizing) {
    console.log(`  ⏭️ Skipping resize for existing ID ${currentImageId}`);
  }

  const SIZE_BREAKPOINTS = [
    { name: "srcXL", width: 2200, height: 1800 },
    { name: "srcL", width: 1200, height: 831 },
    { name: "srcM", width: 800, height: 600 },
    { name: "srcS", width: 400, height: 300 },
  ];

  // Check what sizes we already have cached for this image
  const cachedUrls = currentImageId ? getCachedUrls(currentImageId) : {};
  const haveSizes = {
    srcXL: !!cachedUrls.srcXL,
    srcL: !!cachedUrls.srcL,
    srcM: !!cachedUrls.srcM,
    srcS: !!cachedUrls.srcS,
  };
  
  // Only resize to sizes we DON'T have yet (and skip entirely for existing IDs)
  const sizesNeeded = skipResizing 
    ? [] 
    : SIZE_BREAKPOINTS.filter(bp => !haveSizes[bp.name as keyof typeof haveSizes]);
  
  if (!skipResizing && sizesNeeded.length < SIZE_BREAKPOINTS.length) {
    console.log(`  ⚡ Have ${SIZE_BREAKPOINTS.length - sizesNeeded.length} sizes cached, need ${sizesNeeded.length} more`);
  }

  // Resize for each needed size and capture ALL preload links (gets this + next 2-3 images)
  for (const bp of sizesNeeded) {
    await page.setViewport({ width: bp.width, height: bp.height });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await wait(100);
    
    // Capture ALL preload links at this size (populates cache for multiple images)
    await captureAllPreloadLinks(page);
  }

  // If we resized, go back to XL for metadata scraping
  if (sizesNeeded.length > 0) {
    await page.setViewport({ width: 2200, height: 1800 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await wait(50);
  }

  // Now get final URLs from cache (should have everything)
  const finalUrls = currentImageId ? getCachedUrls(currentImageId) : {};
  
  // GUARDRAIL 1: Validate cached URLs contain the image ID before using
  const idSuffix = currentImageId?.replace(/^i-/, "") || "";
  const validateUrl = (url: string): string => {
    if (!url || !idSuffix) return "";
    return url.includes(idSuffix) ? url : "";
  };
  
  const sizeUrls = {
    srcXL: validateUrl(finalUrls.srcXL || ""),
    srcL: validateUrl(finalUrls.srcL || ""),
    srcM: validateUrl(finalUrls.srcM || ""),
    srcS: validateUrl(finalUrls.srcS || ""),
    srcOriginal: validateUrl(finalUrls.srcOriginal || ""),
  };

  // Open info panel for metadata scraping
  const infoBtn = await page.$('[data-testid="lightbox_details_button"]');
  if (infoBtn) {
    const isOpen = await page.evaluate((el: Element) => el.getAttribute('data-selected') === 'true', infoBtn);
    if (!isOpen) {
      await infoBtn.click();
      await wait(80);
    }
  }

  const data = await page.evaluate(
    (sortOrderIn: number, smartSplitSrc: string) => {
      const smartSplit: (raw: string) => { title: string; description: string } = eval(`(${smartSplitSrc})`);
      let titleRaw =
        document.querySelector('[data-testid="imagemetadata_title_text"]')?.textContent?.trim() ||
        document.querySelector(".sm-lightbox-v2-photo-title")?.textContent?.trim() || "";
      let description =
        document.querySelector('[data-testid="imagemetadata_caption_text"]')?.textContent?.trim() ||
        document.querySelector(".sm-image-metadata-caption")?.textContent?.trim() ||
        document.querySelector(".sm-lightbox-v2-photo-caption")?.textContent?.trim() || "";
      let title = titleRaw;
      if (!description && titleRaw.length > 80) {
        const splitResult = smartSplit(titleRaw);
        title = splitResult.title;
        description = splitResult.description;
      }
      let alt =
        (document.querySelector("img.sm-lightbox-v2-photo") as HTMLImageElement)?.alt ||
        title || "";
      const matchId = window.location.pathname.match(/\/i-([a-zA-Z0-9]+)/);
      const id = matchId ? `i-${matchId[1]}` : "";
      let keywords: string[] = [];
      const kwBlock = document.querySelector('.sm-tile-keywords,[data-name="Keywords"]') as HTMLElement | null;
      if (kwBlock) {
        keywords = Array.from(kwBlock.querySelectorAll("a"))
          .map(a => a.textContent?.trim() || "")
          .filter(Boolean);
      }
      return {
        id,
        title,
        description: description || "",
        alt,
        buyLink: window.location.href,
        keywords,
        story: description || "",
        notes: "",
        rating: 0,
        galleries: [],
        visibility: "show" as const,
        sortOrder: sortOrderIn,
      };
    },
    sortOrder,
    smartSplitFn
  );

  return {
    ...data,
    src: sizeUrls.srcXL || sizeUrls.srcL || sizeUrls.srcM || sizeUrls.srcS || sizeUrls.srcOriginal || "",
    srcXL: sizeUrls.srcXL || "",
    srcL: sizeUrls.srcL || "",
    srcM: sizeUrls.srcM || "",
    srcS: sizeUrls.srcS || "",
    srcOriginal: sizeUrls.srcOriginal || "",
  };
}

/* =========================== Main =========================== */
async function main() {
  if (!PRIMARY_SLUG) {
    console.warn(
      `⚠️  No --slug provided. Strongly recommended for correct tagging.\n   Example: --slug="Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White"`
    );
  }

  const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
  const pages = await browser.pages();
  const page = pages[pages.length - 1];

  let results: ImageRecord[] = [];
  const seenIds = new Set<string>();
  const existingIds = new Set<string>(); // IDs already in the file (skip resizing for these)
  let sortOrder = 0;

  // Load existing data if file exists (enables "Add to" mode)
  const outputPath = path.join(OUT_PATH);
  if (fs.existsSync(outputPath)) {
    try {
      const fileContent = fs.readFileSync(outputPath, "utf-8");
      // Extract the JSON array from "export const galleryData = [...];"
      const match = fileContent.match(/export const galleryData\s*=\s*(\[[\s\S]*\]);?\s*$/);
      if (match) {
        const existingData: ImageRecord[] = JSON.parse(match[1]);
        results = existingData;
        // Track existing IDs and find max sortOrder
        for (const rec of existingData) {
          if (rec.id) {
            existingIds.add(rec.id);
            // NOTE: Don't add to seenIds - that's for loop detection during THIS session
          }
          if (rec.sortOrder >= sortOrder) {
            sortOrder = rec.sortOrder + 1;
          }
        }
        console.log(`📂 Loaded ${existingData.length} existing entries from ${outputPath}`);
        console.log(`   Existing IDs: ${existingIds.size} (will skip resizing for these)`);
        console.log(`   Next sortOrder: ${sortOrder}`);
      }
    } catch (err: any) {
      console.warn(`⚠️ Could not parse existing file: ${err.message}`);
    }
  }

  try {
    // CHANGED: Always start at XL size!
    await page.setViewport({ width: 2200, height: 1800 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await wait(60);

    // Close info panel if open at start
    const initialInfoBtn = await page.$('[data-testid="lightbox_details_button"]');
    if (initialInfoBtn) {
      const isOpen = await page.evaluate((el: Element) => el.getAttribute('data-selected') === 'true', initialInfoBtn);
      if (isOpen) {
        await initialInfoBtn.click();
        await wait(80);
      }
    }

    while (true) {
      await page.waitForSelector(".sm-panel-info", { timeout: 100 }).catch(() => {});
      await wait(40);

      // Get current image ID from URL first
      const currentId = await page.evaluate(() => {
        const matchId = window.location.pathname.match(/\/i-([a-zA-Z0-9]+)/);
        return matchId ? `i-${matchId[1]}` : "";
      });

      // CAPTURE ALL PRELOAD LINKS - this grabs URLs for current + next 2-3 images!
      // (Still do this even for existing IDs - helps cache upcoming new images)
      const newCached = await captureAllPreloadLinks(page);
      if (newCached > 0) {
        console.log(`  📦 Cached ${newCached} new preload URLs (total IDs in cache: ${Object.keys(preloadCache).length})`);
      }

      // Pass existingIds so we can skip resizing for images already in the file
      const data = await scrapeDetails(page, sortOrder, currentId, existingIds);

      if (!data.id) {
        console.log(`🛑 Missing ID — stopping.`);
        break;
      }
      if (data.id === GHOST_ID) {
        console.log(`⛔ Skipping ghost ${GHOST_ID}`);
      } else if (existingIds.has(data.id)) {
        // Already in file - skip processing but CONTINUE to next image
        console.log(`  ⏭️ ${data.id} already in file, skipping...`);
        seenIds.add(data.id); // Mark as seen this session
      } else if (seenIds.has(data.id)) {
        // Seen THIS SESSION but not in file = loop detected
        console.log(`🛑 Loop detected at ${data.id} — stopping.`);
        break;
      } else {
        // NEW image - process it
        const mergedGalleries = uniq([...(data.galleries || []), PRIMARY_SLUG, ...EXTRA_SLUGS]);

        // Detect missing/weak fields
        const needsTitle = !data.title?.trim();
        const needsDesc = !data.description?.trim();
        let needsAlt = !data.alt?.trim();
        const needsStory = !data.story?.trim();
        const needsKW = !data.keywords?.length;

        // if SmugMug filled alt with a filename → replace it
        if (/\.(jpg|jpeg|png|gif)$/i.test(data.alt || "")) {
          needsAlt = true;
        }

        if (needsTitle || needsDesc || needsAlt || needsStory || needsKW) {
          const defaults = buildDefaultFields(data.id, data.buyLink || "", mergedGalleries[0] || PRIMARY_SLUG);
          data.title = needsTitle ? defaults.title : data.title;
          data.description = needsDesc ? defaults.description : data.description;
          data.alt = needsAlt ? defaults.alt : data.alt;
          data.story = needsStory ? defaults.story : data.story;
          data.keywords = needsKW ? defaults.keywords : uniq(data.keywords);
        }

        data.galleries = mergedGalleries;
        results.push(data);
        seenIds.add(data.id);

        console.log(
          `✨ NEW [${results.length}] ${data.id} | ${data.title.slice(0, 50)} | galleries: ${data.galleries.length}`
        );
        sortOrder++;
      }

      // NAVIGATION: ADVANCE TO NEXT IMAGE
      const nextBtn = await page.$('[data-testid="lightbox_next_button"]');
      if (!nextBtn) {
        console.log("🛑 No next button — done.");
        break;
      }
      const isDisabled = await page.evaluate(
        el => el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true', nextBtn
      );
      if (isDisabled) {
        console.log("🛑 Next button is disabled — done.");
        break;
      }

      // Click next to load the new image
      await nextBtn.click();
      await wait(80); // Brief wait for URL to update

      // Close info panel if it's open
      const infoBtn = await page.$('[data-testid="lightbox_details_button"]');
      if (infoBtn) {
        const isOpen = await page.evaluate((el: Element) => el.getAttribute('data-selected') === 'true', infoBtn);
        if (isOpen) {
          await infoBtn.click();
          await wait(30);
        }
      }
    }
  } catch (err: any) {
    console.error(`❌ Error scraping:`, err?.message || err);
  }

  // Insert ghost intro image as the first entry (only if not already present)
  if (!existingIds.has(GHOST_ID)) {
    const ghostEntry: ImageRecord = {
      id: "i-k4studios",
      title: "Welcome K4 Studios",
      description: "Explore the grit, grace, and story behind each image.",
      alt: "Welcome to the K4 Studios Gallery",
      src: "/images/gallery-intro-placeholder.jpg",
      buyLink: "",
      keywords: [],
      story: "",
      notes: "",
      rating: 0,
      galleries: [
        PRIMARY_SLUG || "Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color"
      ],
      visibility: "ghost",
      sortOrder: -1,
      srcXL: "",
      srcL: "",
      srcM: "",
      srcS: "",
      srcOriginal: "",
    };

    results.unshift(ghostEntry);
  }

  // --- VERIFY LAST IMAGE - use preload cache as fallback ---
  if (results.length > 1) {
    const lastEntry = results[results.length - 1];
    
    if (!lastEntry.src || lastEntry.src === "") {
      console.log(`⚠️ Last image (${lastEntry.id}) missing src - checking preload cache...`);
      
      // Check the preload cache (should have been captured from previous images)
      const cachedUrls = getCachedUrls(lastEntry.id);
      if (cachedUrls.srcXL || cachedUrls.srcL || cachedUrls.srcM || cachedUrls.srcS) {
        lastEntry.src = cachedUrls.srcXL || cachedUrls.srcL || cachedUrls.srcM || cachedUrls.srcS || "";
        lastEntry.srcXL = cachedUrls.srcXL || "";
        lastEntry.srcL = cachedUrls.srcL || "";
        lastEntry.srcM = cachedUrls.srcM || "";
        lastEntry.srcS = cachedUrls.srcS || "";
        lastEntry.srcOriginal = cachedUrls.srcOriginal || "";
        console.log(`✓ Recovered last image src from cache: ${lastEntry.src.slice(-60)}`);
      } else {
        console.log(`❌ Could not recover src for last image ${lastEntry.id} - not in preload cache`);
        console.log(`   Cache contains ${Object.keys(preloadCache).length} image IDs`);
      }
    } else {
      console.log(`✓ Last image (${lastEntry.id}) has src: ${lastEntry.src.slice(-50)}`);
    }
  }

  // --- REALIGN src fields to correct id after scrape ---
  const fieldsToAlign = ["src", "srcXL", "srcL", "srcM", "srcS", "srcOriginal"];
  // Build a map of id to entry
  const idMap: Record<string, any> = {};
  for (const rec of results) {
    if (rec.id) idMap[rec.id] = rec;
  }
  // Collect all src fields by id found in their URL
  const srcFieldBuffer: Record<string, Partial<ImageRecord>> = {};
  for (const rec of results) {
    for (const f of fieldsToAlign) {
      const url = (rec as any)[f];
      if (typeof url === 'string' && url.startsWith('http') && url.includes('i-')) {
        const match = url.match(/i-([a-zA-Z0-9]+)/);
        if (match) {
          const urlId = `i-${match[1]}`;
          if (!srcFieldBuffer[urlId]) srcFieldBuffer[urlId] = {};
          (srcFieldBuffer[urlId] as any)[f] = url;
        }
      }
    }
  }
  // Assign collected src fields to the correct entry by id
  let realigned = 0, unmatched = 0;
  for (const id in srcFieldBuffer) {
    if (idMap[id]) {
      Object.assign(idMap[id], srcFieldBuffer[id]);
      realigned++;
    } else {
      unmatched++;
      console.warn(`No entry found for id ${id} when realigning src fields.`);
    }
  }
  // Optionally clear src fields that don't match their id
  for (const rec of results) {
    for (const f of fieldsToAlign) {
      const url = (rec as any)[f];
      if (typeof url === 'string' && url.startsWith('http') && url.includes('i-')) {
        const match = url.match(/i-([a-zA-Z0-9]+)/);
        if (!match || rec.id !== `i-${match[1]}`) {
          (rec as any)[f] = '';
        }
      }
    }
  }
  console.log(`Realigned src fields for ${realigned} ids. Unmatched: ${unmatched}`);

  // GUARDRAIL 2: Log cache completeness summary
  const totalImages = results.filter(r => r.id !== GHOST_ID).length;
  let fullSizes = 0, partialSizes = 0, noSizes = 0;
  for (const rec of results) {
    if (rec.id === GHOST_ID) continue;
    const hasSizes = [rec.srcXL, rec.srcL, rec.srcM, rec.srcS].filter(Boolean).length;
    if (hasSizes === 4) fullSizes++;
    else if (hasSizes > 0) partialSizes++;
    else noSizes++;
  }
  console.log(`\n📊 Cache completeness: ${fullSizes}/${totalImages} images have all 4 sizes`);
  if (partialSizes > 0) console.log(`   ⚠️ ${partialSizes} images have partial sizes`);
  if (noSizes > 0) console.log(`   ❌ ${noSizes} images have NO sizes (check preload behavior)`);

  mkdirpSync(path.dirname(outputPath));
  fs.writeFileSync(outputPath, `export const galleryData = ${JSON.stringify(results, null, 2)};\n`);
  console.log(`\n🟢 Saved ${results.length} entries → ${outputPath}`);

  try {
    await browser.disconnect();
  } catch {
    console.warn("Browser already closed or disconnect error (ignored).");
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
