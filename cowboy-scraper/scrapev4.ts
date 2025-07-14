import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

async function scrapeDetails(page, sortOrder) {
  return await page.evaluate((sortOrder) => {
    // Use latest SmugMug info panel selectors, fallback to previous if missing
    const title =
      document.querySelector('[data-testid="imagemetadata_title_text"]')?.textContent?.trim() ||
      document.querySelector(".sm-lightbox-v2-photo-title")?.textContent?.trim() ||
      "";

    const description =
      document.querySelector('[data-testid="imagemetadata_caption_text"]')?.textContent?.trim() ||
      document.querySelector(".sm-image-metadata-caption")?.textContent?.trim() ||
      document.querySelector(".sm-lightbox-v2-photo-caption")?.textContent?.trim() ||
      "";

    const img =
      document.querySelector(".sm-lightbox-v2-photo-img img") ||
      document.querySelector('.sm-image-metadata-image img');
    const src = img?.src || "";
    const alt =
      img?.alt ||
      document.querySelector('[data-testid="imagemetadata_title_text"]')?.textContent?.trim() ||
      "";

    // Get ID from URL
    const match = window.location.pathname.match(/\/i-([a-zA-Z0-9]+)/);
    const id = match ? `i-${match[1]}` : "";

    // Keywords from info panel if available
    let keywords = [];
    const kwBlock = document.querySelector('.sm-tile-keywords,[data-name="Keywords"]');
    if (kwBlock) {
      keywords = Array.from(kwBlock.querySelectorAll("a")).map(a => a.textContent?.trim()).filter(Boolean);
    }

    return {
      id,
      title,
      description,
      alt,
      src,
      buyLink: window.location.href,
      keywords,
      story: "",
      collectorNotes: "",
      rating: 0,
      galleries: [
        "Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color"
      ],
      visibility: "show",
      sortOrder,
    };
  }, sortOrder);
}

async function main() {
  const browser = await puppeteer.connect({
    browserURL: "http://localhost:9222"
  });
  const pages = await browser.pages();
  const page = pages[pages.length - 1];

  let results = [];
  let seenIds = new Set();
  let sortOrder = 0;

  // Make sure the info panel is open first (user should do this manually once)
  while (true) {
    // Wait for info panel if needed
    await page.waitForSelector(".sm-panel-info", { timeout: 150 }).catch(() => {});
    await new Promise(res => setTimeout(res, 200));
    const data = await scrapeDetails(page, sortOrder);

    if (!data.id || seenIds.has(data.id)) {
      console.log(`🛑 Loop detected or missing ID. Done!`);
      break;
    }
    results.push(data);
    seenIds.add(data.id);
    console.log(`✅ [${sortOrder + 1}] ${data.buyLink}`);
    sortOrder++;

    // 2. Click "down arrow" to shrink info panel
    const shrinkBtn = await page.$(".sm-button.sm-lightbox-v2-close-sidebar-button");
    if (shrinkBtn) {
      await shrinkBtn.click();
      await new Promise(res => setTimeout(res, 100));
    }

    // 3. Click Next arrow
    const nextBtn = await page.$('[data-testid="lightbox_next_button"]');
    if (!nextBtn) {
      console.log("🛑 No next button. Done!");
      break;
    }
    await nextBtn.click();
    await new Promise(res => setTimeout(res, 150));

    // 4. Click the "i" (info) button again to show info panel
    const infoBtn = await page.$('[data-testid="lightbox_details_button"]');
    if (infoBtn) {
      await infoBtn.click();
      await new Promise(res => setTimeout(res, 120));
    }
  }

  // Save to correct path
  const outputPath = path.join(
    "data/galleries",
    "Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color.ts"
  );
  mkdirpSync(path.dirname(outputPath));
  fs.writeFileSync(
    outputPath,
    `export const galleryData = ${JSON.stringify(results, null, 2)};\n`
  );
  console.log(`\n🟢 Saved ${results.length} entries → ${outputPath}`);
  await browser.disconnect();
}

main();
