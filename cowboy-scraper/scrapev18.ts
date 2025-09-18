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
      "archival",
      "historical",
      "western",
      "portrait",
      "cowboy",
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

// -- THIS IS THE scrapeDetails FUNCTION THAT WORKED FOR A SINGLE IMAGE AND RECORDED SIZES --
async function scrapeDetails(page: puppeteer.Page, sortOrder: number): Promise<ImageRecord> {
  const smartSplitFn = smartSplitTitleAndDescription.toString();

  const SIZE_BREAKPOINTS = [
    { name: "srcXL", width: 2200, height: 1800 },
    { name: "srcL", width: 1200, height: 831 },
    { name: "srcM", width: 800, height: 600 },
    { name: "srcS", width: 400, height: 300 },
  ];

  let sizeUrls: Record<string, string> = {};

  // Start with XL size to ensure we get the largest image first
  await page.setViewport({ width: 2200, height: 1800 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await wait(300);

  for (const bp of SIZE_BREAKPOINTS) {
    await page.setViewport({ width: bp.width, height: bp.height });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await wait(300);

    const url = await page.evaluate(() => {
      // Always pull background-image from the lightbox container!
      const el = document.querySelector('.sm-lightbox-v2-photo') as HTMLElement | null;
      if (el) {
        const bg = getComputedStyle(el).backgroundImage;
        const match = bg.match(/url\(["']?(.+?\.jpg)["']?\)/);
        if (match && match[1]) return match[1];
      }
      // Try fallback container
      const el2 = document.querySelector('.sm-lightbox-v2-photo-img') as HTMLElement | null;
      if (el2) {
        const bg = getComputedStyle(el2).backgroundImage;
        const match = bg.match(/url\(["']?(.+?\.jpg)["']?\)/);
        if (match && match[1]) return match[1];
      }
      return "";
    });

    if (url) sizeUrls[bp.name] = url;
  }

  // Try to find Original from preload links
  let srcOriginal = "";
  const allOriginals = await page.evaluate(() => {
    let urls: string[] = [];
    document.querySelectorAll('link[rel="preload"][as="image"]').forEach(link => {
      const href = link.getAttribute("href");
      if (href && /Original\./i.test(href)) urls.push(href);
    });
    return urls;
  });
  if (allOriginals.length) srcOriginal = allOriginals[0];

  // Restore to largest size for metadata scrape
  await page.setViewport({ width: 2200, height: 1800 });
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await wait(100);

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
    src: sizeUrls.srcXL || sizeUrls.srcL || sizeUrls.srcM || sizeUrls.srcS || srcOriginal || "",
    srcXL: sizeUrls.srcXL || "",
    srcL: sizeUrls.srcL || "",
    srcM: sizeUrls.srcM || "",
    srcS: sizeUrls.srcS || "",
    srcOriginal: srcOriginal || "",
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
  let sortOrder = 0;

  try {
    // CHANGED: Always start at XL size!
    await page.setViewport({ width: 2200, height: 1800 });
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await wait(120);

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
      await page.waitForSelector(".sm-panel-info", { timeout: 150 }).catch(() => {});
      await wait(100);

      const data = await scrapeDetails(page, sortOrder);

      if (!data.id) {
        console.log(`🛑 Missing ID — stopping.`);
        break;
      }
      if (data.id === GHOST_ID) {
        console.log(`⛔ Skipping ghost ${GHOST_ID}`);
      } else if (!seenIds.has(data.id)) {
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
          `[${sortOrder + 1}] ${data.id} | ${data.title.slice(0, 64)} | galleries: ${data.galleries.length}`
        );
      } else {
        console.log(`🛑 Loop detected at ${data.id} — stopping.`);
        break;
      }

      sortOrder++;

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

      // Click next first to load the new image
      await nextBtn.click();
      await wait(250); // Extra wait to ensure new image loads

      // Close info panel if it's open, as it might interfere with image sizing
      const infoBtn = await page.$('[data-testid="lightbox_details_button"]');
      if (infoBtn) {
        const isOpen = await page.evaluate((el: Element) => el.getAttribute('data-selected') === 'true', infoBtn);
        if (isOpen) {
          await infoBtn.click();
          await wait(80);
        }
      }

      // DON'T set viewport here - let scrapeDetails handle all viewport changes internally
      // This was causing the last image to get wrong sizes because viewport was already at XL
      // await page.setViewport({ width: 2200, height: 1800 });
      // await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      // await wait(120);
    }
  } catch (err: any) {
    console.error(`❌ Error scraping:`, err?.message || err);
  }

  // Insert ghost intro image as the first entry
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

  // --- No need for final scrape anymore - main loop should handle all images correctly ---
  console.log(`All ${results.length} images processed with proper size variants.`);

  // --- Simplified: No complex realignment needed if scraping works correctly ---
  console.log(`Processed ${results.length} images with proper src field assignment.`);

  const outputPath = path.join(OUT_PATH);
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
