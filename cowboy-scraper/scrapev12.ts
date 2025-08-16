// scrapev11.ts
// Run with: npx tsx scrapev11.ts --slug="..." --out="../src/data/galleries/....mjs"

import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

/* ===========================
   CLI helpers
   =========================== */
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

/* ===========================
   Types & helpers
   =========================== */
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

/* ===========================
   Default field builder
   =========================== */
function buildDefaultFields(
  id: string,
  pageUrl: string,
  gallerySlugFromCli: string
): { title: string; description: string; alt: string; story: string; keywords: string[] } {
  const urlObj = safeParseURL(pageUrl);
  const urlPath = urlObj?.pathname ?? "";
  const urlLeaf = urlPath.split("/").filter(Boolean).pop() || "";
  const fromUrlTitle = toTitleCase(
    urlLeaf.replace(/i-[A-Za-z0-9]+/, "").replace(/[-_]+/g, " ").trim()
  );
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

  // 🆕 alt variations
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

/* ===========================
   Smart title splitter
   =========================== */
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

/* ===========================
   In-page scrape
   =========================== */
async function scrapeDetails(page: puppeteer.Page, sortOrder: number): Promise<ImageRecord> {
  const smartSplitFn = smartSplitTitleAndDescription.toString();

  const data = await page.evaluate(
    (sortOrderIn: number, smartSplitSrc: string) => {
      const smartSplit: (raw: string) => { title: string; description: string } = eval(`(${smartSplitSrc})`);

      let titleRaw =
        document.querySelector('[data-testid="imagemetadata_title_text"]')?.textContent?.trim() ||
        document.querySelector(".sm-lightbox-v2-photo-title")?.textContent?.trim() ||
        "";

      let description =
        document.querySelector('[data-testid="imagemetadata_caption_text"]')?.textContent?.trim() ||
        document.querySelector(".sm-image-metadata-caption")?.textContent?.trim() ||
        document.querySelector(".sm-lightbox-v2-photo-caption")?.textContent?.trim() ||
        "";

      let title = titleRaw;
      if (!description && titleRaw.length > 80) {
        const splitResult = smartSplit(titleRaw);
        title = splitResult.title;
        description = splitResult.description;
      }

      // Try to locate image src
      let img: HTMLImageElement | null = null;
      let src = "";
      const photoEl = document.querySelector("img.sm-lightbox-v2-photo") as HTMLImageElement | null;

      if (photoEl && (photoEl as any).style?.backgroundImage) {
        const match = (photoEl as any).style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
        if (match && match[1]) {
          src = match[1];
        }
      }
      if (!src) {
        img =
          (document.querySelector(".sm-lightbox-v2-photo-img img") as HTMLImageElement | null) ||
          (document.querySelector(".sm-image-metadata-image img") as HTMLImageElement | null) ||
          (document.querySelector(".sm-image-viewer-img") as HTMLImageElement | null) ||
          (document.querySelector('img[alt*="Cowboy"]') as HTMLImageElement | null) ||
          (document.querySelector("img") as HTMLImageElement | null);
        src = (img?.src as string) || "";
      }

      if (/photos\.smugmug\.com/.test(src)) {
        src = src
          .replace(/\/Ti\//, "/XL/")
          .replace(/\/Ti(-[^/]+\.jpg)/, "/XL$1")
          .replace(/Ti\.jpg$/, "XL.jpg");
      }

      try {
        src = encodeURI(src);
      } catch {}

      let alt =
        (photoEl?.alt as string) ||
        (img?.alt as string) ||
        title ||
        "";

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
        src,
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

  return data;
}

/* ===========================
   Main
   =========================== */
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
    while (true) {
      await page.waitForSelector(".sm-panel-info", { timeout: 150 }).catch(() => {});
      await new Promise(res => setTimeout(res, 200));

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

      const shrinkBtn = await page.$(".sm-button.sm-lightbox-v2-close-sidebar-button");
      if (shrinkBtn) {
        await shrinkBtn.click();
        await new Promise(res => setTimeout(res, 100));
      }

      const nextBtn = await page.$('[data-testid="lightbox_next_button"]');
      if (!nextBtn) {
        console.log("🛑 No next button — done.");
        break;
      }
      await nextBtn.click();
      await new Promise(res => setTimeout(res, 150));

      const infoBtn = await page.$('[data-testid="lightbox_details_button"]');
      if (infoBtn) {
        await infoBtn.click();
        await new Promise(res => setTimeout(res, 120));
      }
    }
  } catch (err: any) {
    console.error(`❌ Error scraping:`, err?.message || err);
  }

  if (results.length > 1) {
    for (let i = 0; i < results.length - 1; i++) {
      results[i].src = results[i + 1].src;
      results[i].alt = results[i + 1].alt;
    }
    results.pop();
  }

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
