// scrapeBuyPages.ts
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { mkdirpSync } from "fs-extra";

const FIRST_BUY_URL =
  "https://www.k4studios.com/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-fM9qmKW/buy";

async function scrapeBuyUrls() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 850 },
  });

  const page = await browser.newPage();
  await page.goto(FIRST_BUY_URL, { waitUntil: "networkidle2" });

  const buyUrls: string[] = [];
  let step = 1;

  while (true) {
    // Grab the URL (should always be a /buy page)
    const url = page.url();
    buyUrls.push(url);
    console.log(`✅ [${step}] ${url}`);

    // Try to click "Next"
    const nextBtn = await page.$('[data-testid="lightbox_next_button"]');
    if (!nextBtn) {
      console.log("🛑 End of /buy images.");
      break;
    }
    await nextBtn.click();
 await new Promise(res => setTimeout(res, 1300));
    step++;

    // Fail-safe: avoid infinite loops
    if (step > 500) break;
  }

  await browser.close();

  // Save to a new TypeScript (or change to .json if you want)
  const outputPath = path.join(
    "src", "data", "galleries",
    "Western-Cowboy-Portraits_Color_BUYURLS.ts"
  );
  mkdirpSync(path.dirname(outputPath));

  fs.writeFileSync(
    outputPath,
    `export const buyUrls = ${JSON.stringify(buyUrls, null, 2)};\n`
  );

  console.log(`\n🟢 Saved ${buyUrls.length} buy URLs → ${outputPath}`);
}

scrapeBuyUrls();
