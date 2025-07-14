import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

async function scrapeDetails(page) {
  return await page.evaluate(() => {
    const title = document.querySelector(".sm-lightbox-v2-photo-title")?.textContent?.trim() || "";
    const description = document.querySelector(".sm-lightbox-v2-photo-caption")?.textContent?.trim() || "";
    const img = document.querySelector(".sm-lightbox-v2-photo-img img");
    const src = img?.src || "";
    const alt = img?.alt || "";
    const match = window.location.pathname.match(/\/i-([a-zA-Z0-9]+)/);
    const id = match ? `i-${match[1]}` : "";
    return { id, title, description, alt, src, buyLink: window.location.href };
  });
}

async function main() {
  const browser = await puppeteer.connect({
    browserURL: "http://localhost:9222"
  });
  const pages = await browser.pages();
  const page = pages[pages.length - 1];

  let results = [];
  let seenUrls = new Set();
  let step = 0;

  // Make sure the info panel is open first (user should do this manually once)
  while (true) {
    // 1. Scrape current info
    await page.waitForSelector(".sm-panel-info", { timeout: 250 }).catch(() => {});
    await new Promise(res => setTimeout(res, 300));
    const data = await scrapeDetails(page);

    if (seenUrls.has(data.buyLink)) {
      console.log(`🛑 Loop detected. Done!`);
      break;
    }
    results.push(data);
    seenUrls.add(data.buyLink);
    console.log(`✅ [${++step}] ${data.buyLink}`);

    // 2. Click "down arrow" to shrink info panel
    const shrinkBtn = await page.$(".sm-button.sm-lightbox-v2-close-sidebar-button");
    if (shrinkBtn) {
      await shrinkBtn.click();
      await new Promise(res => setTimeout(res, 200));
    } else {
      console.log("❓ Could not find shrink/down-arrow button, trying to continue...");
    }

    // 3. Click Next arrow
    const nextBtn = await page.$('[data-testid="lightbox_next_button"]');
    if (!nextBtn) {
      console.log("🛑 No next button. Done!");
      break;
    }
    await nextBtn.click();
    await new Promise(res => setTimeout(res, 200));

    // 4. Click the "i" (info) button again to show info panel
    const infoBtn = await page.$('[data-testid="lightbox_details_button"]');
    if (infoBtn) {
      await infoBtn.click();
      await new Promise(res => setTimeout(res, 200));
    } else {
      console.log("❓ Could not find info button, trying to continue...");
    }
  }

  // Save
  const outputPath = path.join(
    "src", "data", "galleries",
    "CowboyColorManualScrape.ts"
  );
  mkdirpSync(path.dirname(outputPath));
  fs.writeFileSync(
    outputPath,
    `export const cowboyColorData = ${JSON.stringify(results, null, 2)};\n`
  );
  console.log(`\n🟢 Saved ${results.length} entries → ${outputPath}`);
  await browser.disconnect();
}

main();
