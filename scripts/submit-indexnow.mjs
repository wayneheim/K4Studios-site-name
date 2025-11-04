/**
 * Submit URLs to Bing IndexNow directly from your generated sitemap.xml
 * Usage: node scripts/submit-indexnow.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// === ⏰ SUBMIT INTERVAL CONTROL ===
const SUBMIT_INTERVAL_HOURS = 6;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LAST_SUBMIT_PATH = path.join(__dirname, ".indexnow-last-submit.json");

// === 🔧 CONFIGURATION ===
const SITE_HOST = "www.k4studios.com";
const INDEXNOW_KEY = "e05ffc8ff8004372b01c0e153ba16b44";
const INDEXNOW_KEY_URL = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;
const SITEMAP_PATH = path.join(__dirname, "../dist/sitemap.xml");
const SITEMAP_URL = process.env.SITEMAP_URL || `https://${SITE_HOST}/sitemap.xml`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH_SIZE = 500;
const DELAY_MS = 2000; // 2s between requests

// === 🧠 HELPERS ===
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// === 🕵️ READ SITEMAP ===
function extractUrlsFromSitemap(xmlContent) {
  const matches = [...xmlContent.matchAll(/<loc>(.*?)<\/loc>/g)];
  return matches.map((m) => m[1].trim());
}

async function submitBatch(urlList, batchNum) {
  const payload = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_URL,
    urlList,
  };

  console.log(`🚀 Submitting batch ${batchNum} (${urlList.length} URLs)...`);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log(`✅ Batch ${batchNum} response: ${res.status} ${text}`);
  } catch (err) {
    console.error(`❌ Error in batch ${batchNum}:`, err);
  }
}

// === 🚦 MAIN ===
async function main() {
  // Check last submit time
  let lastSubmit = 0;
  if (fs.existsSync(LAST_SUBMIT_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(LAST_SUBMIT_PATH, "utf8"));
      lastSubmit = data.lastSubmit || 0;
    } catch {}
  }
  const now = Date.now();
  const hoursSince = (now - lastSubmit) / (1000 * 60 * 60);
  if (hoursSince < SUBMIT_INTERVAL_HOURS) {
    console.log(`⏳ Skipping IndexNow submit: Only ${hoursSince.toFixed(2)} hours since last submit. Interval is ${SUBMIT_INTERVAL_HOURS} hours.`);
    return;
  }

  let xml;
  if (fs.existsSync(SITEMAP_PATH)) {
    console.log(`📄 Using local sitemap at: ${SITEMAP_PATH}`);
    xml = fs.readFileSync(SITEMAP_PATH, "utf8");
  } else {
    console.warn(`⚠️ Sitemap not found at ${SITEMAP_PATH}. Falling back to remote: ${SITEMAP_URL}`);
    try {
      const res = await fetch(SITEMAP_URL);
      if (!res.ok) {
        console.error(`❌ Failed to fetch remote sitemap: ${res.status} ${res.statusText}`);
        process.exit(1);
      }
      xml = await res.text();
    } catch (err) {
      console.error(`❌ Error fetching remote sitemap:`, err);
      process.exit(1);
    }
  }

  const allUrls = extractUrlsFromSitemap(xml);
  console.log(`📄 Found ${allUrls.length} URLs in sitemap.xml`);

  for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
    const batch = allUrls.slice(i, i + BATCH_SIZE);
    await submitBatch(batch, Math.floor(i / BATCH_SIZE) + 1);
    if (i + BATCH_SIZE < allUrls.length) await sleep(DELAY_MS);
  }

  // Update last submit time
  fs.writeFileSync(LAST_SUBMIT_PATH, JSON.stringify({ lastSubmit: now }));
  console.log("🎉 All batches submitted!");
}

main();