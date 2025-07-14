import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

// Helper for separating title/description if run-together
function smartSplitTitleAndDescription(titleRaw) {
  // List of phrases that likely start the description
  const splitPhrases = [
    "Painterly photography",
    "Fine art photography",
    "Embrace the spirit",
    "Each piece of his",
    "Bring the essence",
    "© Wayne Heim"
  ];

  for (const phrase of splitPhrases) {
    const idx = titleRaw.indexOf(phrase);
    if (idx > 0) {
      // Found a phrase – split title and description
      return {
        title: titleRaw.slice(0, idx).trim(),
        description: titleRaw.slice(idx).trim()
      };
    }
  }
  return { title: titleRaw.trim(), description: "" };
}

async function scrapeDetails(page, sortOrder) {
  return await page.evaluate((sortOrder, smartSplit) => {
    // 1. Title field
    let titleRaw =
      document.querySelector('[data-testid="imagemetadata_title_text"]')?.textContent?.trim() ||
      document.querySelector(".sm-lightbox-v2-photo-title")?.textContent?.trim() ||
      "";

    // 2. Description field (try to pull, else split from titleRaw)
    let description =
      document.querySelector('[data-testid="imagemetadata_caption_text"]')?.textContent?.trim() ||
      document.querySelector(".sm-image-metadata-caption")?.textContent?.trim() ||
      document.querySelector(".sm-lightbox-v2-photo-caption")?.textContent?.trim() ||
      "";

    // If description is empty and titleRaw is very long, try to split
    let title = titleRaw;
    if (!description && titleRaw.length > 80) {
      const splitResult = smartSplit(titleRaw);
      title = splitResult.title;
      description = splitResult.description;
    }

    // --- UPDATED: Image src logic ---
    let img = null;
    let src = "";
    const photoEl = document.querySelector("img.sm-lightbox-v2-photo");
    if (photoEl && photoEl.style.backgroundImage) {
      const match = photoEl.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
      if (match && match[1]) {
        src = match[1];
      }
    }
    if (!src) {
      img =
        document.querySelector(".sm-lightbox-v2-photo-img img") ||
        document.querySelector('.sm-image-metadata-image img') ||
        document.querySelector('.sm-image-viewer-img') ||
        document.querySelector('img[alt*="Cowboy"]') ||
        document.querySelector('img');
      src = img?.src || "";
    }

    // --- UPDATED: Alt text logic, always safe ---
    let alt =
      photoEl?.alt ||
      img?.alt ||
      title ||
      "";

    // 5. Get ID from URL
    const matchId = window.location.pathname.match(/\/i-([a-zA-Z0-9]+)/);
    const id = matchId ? `i-${matchId[1]}` : "";

    // 6. Keywords from info panel if available
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
  }, sortOrder, smartSplitTitleAndDescription.toString());
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

  try {
    while (true) {
      await page.waitForSelector(".sm-panel-info", { timeout: 150 }).catch(() => {});
      await new Promise(res => setTimeout(res, 200));
      const data = await scrapeDetails(page, sortOrder);

      // Debugging log (see what fields are found)
      console.log(`[${sortOrder + 1}] ID: ${data.id}  Title: ${data.title}  Image: ${data.src.slice(0, 40)}`);

      if (!data.id || seenIds.has(data.id)) {
        console.log(`🛑 Loop detected or missing ID. Done!`);
        break;
      }
      results.push(data);
      seenIds.add(data.id);
      sortOrder++;

      // ... rest of your loop logic ...
      // Shrink info panel
      const shrinkBtn = await page.$(".sm-button.sm-lightbox-v2-close-sidebar-button");
      if (shrinkBtn) {
        await shrinkBtn.click();
        await new Promise(res => setTimeout(res, 100));
      }

      // Next image
      const nextBtn = await page.$('[data-testid="lightbox_next_button"]');
      if (!nextBtn) {
        console.log("🛑 No next button. Done!");
        break;
      }
      await nextBtn.click();
      await new Promise(res => setTimeout(res, 150));

      // Open info panel again
      const infoBtn = await page.$('[data-testid="lightbox_details_button"]');
      if (infoBtn) {
        await infoBtn.click();
        await new Promise(res => setTimeout(res, 120));
      }
    }
  } catch (err) {
    console.error(`❌ Error scraping:`, err && err.message ? err.message : err);
  }

  // Always write what you have, even if the script crashed or finished!
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

  // Defensive disconnect
  try {
    await browser.disconnect();
  } catch (e) {
    console.warn("Browser already closed or disconnect error (ignoring).");
  }
}

main();
