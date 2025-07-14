// scrapeCowboyGrid.ts
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

const GALLERY_URL =
  "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color";

// Helper to convert gallery URL to unique .ts filename
function galleryUrlToFilePath(galleryUrl: string) {
  const cleanUrl = galleryUrl.replace(/^https?:\/\//, "");
  const fileName = cleanUrl.replace(/\//g, "_") + ".ts";
  // Change this to "src/data/galleries" for your Astro build, or "data/galleries" for current repo
  return path.join("src", "data", "galleries", fileName);
}

async function scrape() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 850 },
  });

  const page = await browser.newPage();
  await page.goto(GALLERY_URL, { waitUntil: "networkidle2" });

  const scrapedImages = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".sm-tile-content"));

    return items.map((el, index) => {
      const linkEl = el.querySelector("a[href*='/i-']");
      const imgEl = el.querySelector("img");

      const href = linkEl?.getAttribute("href") || "";
      const match = href.match(/\/i-([a-zA-Z0-9]+)/);
      const id = match ? `i-${match[1]}` : "";

      return {
        id,
        title: imgEl?.getAttribute("alt")?.trim() || "",
        alt: imgEl?.getAttribute("alt")?.trim() || "",
        src: imgEl?.getAttribute("src") || "",
        buyLink: `https://www.k4studios.com${href}`,
        story: "",
        collectorNotes: "",
        rating: 0,
        galleries: [
          "Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
        ],
        visibility: "show",
        sortOrder: index,
      };
    });
  });

  await browser.close();

  // New: Generate file path based on URL
  const outputPath = galleryUrlToFilePath(GALLERY_URL);
  mkdirpSync(path.dirname(outputPath));

  fs.writeFileSync(
    outputPath,
    `export const galleryData = ${JSON.stringify(scrapedImages, null, 2)};\n`
  );

  console.log(`✅ Scraped ${scrapedImages.length} entries → ${outputPath}`);
}

scrape();
