import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

const FIRST_URL =
  "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-fM9qmKW/A";

function makeOutputPath(startUrl: string) {
  const clean = startUrl.replace(/^https?:\/\//, "").replace(/\/[iI]-[^/]+\/[a-zA-Z]*$/, "");
  return path.join(
    "src", "data", "galleries",
    clean.replace(/\//g, "_") + "_ALL_METADATA.ts"
  );
}

async function scrapeDetails(page) {
  return await page.evaluate(() => {
    const getText = (label: string) => {
      const item = Array.from(document.querySelectorAll(".sm-panel-info li")).find((li) =>
        li.textContent?.toLowerCase().includes(label.toLowerCase())
      );
      return item?.textContent?.split(":").slice(1).join(":").trim() || "";
    };

    const title = document.querySelector(".sm-lightbox-v2-photo-title")?.textContent?.trim() || "";
    const description = document.querySelector(".sm-lightbox-v2-photo-caption")?.textContent?.trim() || "";
    const keywords = getText("keywords")?.split(",").map(k => k.trim()).filter(Boolean) || [];

    const imageEl = document.querySelector(".sm-lightbox-v2-photo-img img") as HTMLImageElement;
    const src = imageEl?.src || "";
    const alt = imageEl?.alt || "";

    const match = window.location.pathname.match(/\/i-([a-zA-Z0-9]+)/);
    const id = match ? `i-${match[1]}` : "";
    const buyLink = window.location.href;

    return { id, title, description, alt, keywords, src, buyLink };
  });
}

async function scrape() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 850 },
  });

  const page = await browser.newPage();
  await page.goto(FIRST_URL, { waitUntil: "networkidle2" });

  // Only click info/details button ONCE, at the start
await page.waitForSelector('[data-testid="lightbox_details_button"]', { timeout: 5000 });
await page.click('[data-testid="lightbox_details_button"]');

// 🟢 Immediately move mouse over the main image to trigger overlays (NO WAIT YET)
const img = await page.$('.sm-lightbox-v2-photo-img img');
if (img) {
  const box = await img.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  }
}
await new Promise(res => setTimeout(res, 400)); // overlays appear

// NOW let panel finish opening (if needed)
await page.waitForSelector(".sm-panel-info", { visible: true, timeout: 7000 });

  const results = [];
  let step = 1;
  let lastId = "";

  while (true) {
    // Scrape data
    const data = await scrapeDetails(page);

    if (!data.id) {
      console.log("❌ No image ID found, skipping.");
    } else if (data.id === lastId) {
      console.log("🛑 Loop detected or gallery ended.");
      break;
    } else {
      results.push({
        ...data,
        story: "",
        collectorNotes: "",
        rating: 0,
        galleries: [
          "Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color",
        ],
        visibility: "show",
        sortOrder: results.length,
      });
      lastId = data.id;
      console.log(`✅ [${results.length}] ${data.title || data.id}`);
    }

    // Click next or end
    const nextBtn = await page.$('[data-testid="lightbox_next_button"]');
    if (!nextBtn) {
      console.log("🛑 Reached end of gallery.");
      break;
    }
    await nextBtn.click();
    await new Promise(res => setTimeout(res, 1200));
    step++;
    if (step > 500) break;
  }

  await browser.close();

  // Save result
  const outputPath = makeOutputPath(FIRST_URL);
  mkdirpSync(path.dirname(outputPath));
  fs.writeFileSync(
    outputPath,
    `export const galleryData = ${JSON.stringify(results, null, 2)};\n`
  );
  console.log(`\n🟢 Saved ${results.length} entries → ${outputPath}`);
}

scrape();
