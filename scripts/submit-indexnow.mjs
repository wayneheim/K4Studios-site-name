/**
 * Submit URLs to Bing IndexNow directly from your generated sitemap.xml
 * Usage: node scripts/submit-indexnow.mjs [--dry-run] [--no-wait-live]
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
const LIVE_CHECK_TIMEOUT_MS = Number(process.env.INDEXNOW_LIVE_TIMEOUT_MS || 10 * 60 * 1000);
const LIVE_CHECK_INTERVAL_MS = Number(process.env.INDEXNOW_LIVE_INTERVAL_MS || 20 * 1000);
const LIVE_CHECK_USER_AGENT = "K4-IndexNow-Verifier/1.0";

const isDryRun = process.argv.includes("--dry-run");
const shouldWaitForLive = !process.argv.includes("--no-wait-live");

// === 🧠 HELPERS ===
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueUrls(urls) {
  return [...new Set(urls.filter(Boolean))];
}

// === 🕵️ READ SITEMAP ===
function extractUrlsFromSitemap(xmlContent) {
  const matches = [...xmlContent.matchAll(/<loc>(.*?)<\/loc>/g)];
  return uniqueUrls(matches.map((m) => m[1].trim()));
}

async function fetchText(url, label) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": LIVE_CHECK_USER_AGENT,
      "Accept": "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) {
    throw new Error(`${label} returned ${res.status} ${res.statusText}`);
  }

  return res.text();
}

async function loadRemoteSitemapUrlsWithRetry() {
  const deadline = Date.now() + LIVE_CHECK_TIMEOUT_MS;
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      console.log(`🌐 Fetching live sitemap (attempt ${attempt}) from ${SITEMAP_URL}`);
      const remoteXml = await fetchText(SITEMAP_URL, "Remote sitemap");
      return extractUrlsFromSitemap(remoteXml);
    } catch (err) {
      const remainingMs = deadline - Date.now();
      if (!shouldWaitForLive || remainingMs <= 0) {
        throw err;
      }

      const waitMs = Math.min(LIVE_CHECK_INTERVAL_MS, remainingMs);
      console.warn(`⚠️ ${err.message}. Retrying in ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
    }
  }
}

async function isUrlLive(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        headers: {
          "User-Agent": LIVE_CHECK_USER_AGENT,
          "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
      });

      if (res.status === 200) {
        return true;
      }
    } catch {
      // Try the fallback method.
    }
  }

  return false;
}

async function waitForUrlsToGoLive(urls) {
  const pending = [...urls];
  const live = [];
  const deadline = Date.now() + LIVE_CHECK_TIMEOUT_MS;

  while (pending.length > 0) {
    const batchResults = await Promise.all(
      pending.map(async (url) => ({ url, live: await isUrlLive(url) }))
    );

    pending.length = 0;
    for (const result of batchResults) {
      if (result.live) {
        live.push(result.url);
      } else {
        pending.push(result.url);
      }
    }

    if (pending.length === 0) {
      break;
    }

    const remainingMs = deadline - Date.now();
    if (!shouldWaitForLive || remainingMs <= 0) {
      break;
    }

    const waitMs = Math.min(LIVE_CHECK_INTERVAL_MS, remainingMs);
    console.warn(`⏳ ${pending.length} URL(s) still not live. Retrying in ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs);
  }

  return {
    liveUrls: live,
    missingUrls: pending,
  };
}

async function submitBatch(urlList, batchNum) {
  const payload = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_URL,
    urlList,
  };

  console.log(`🚀 Submitting batch ${batchNum} (${urlList.length} URLs)...`);

  if (isDryRun) {
    console.log(`🧪 Dry run: skipping POST for batch ${batchNum}`);
    return;
  }

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
  if (!isDryRun && fs.existsSync(LAST_SUBMIT_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(LAST_SUBMIT_PATH, "utf8"));
      lastSubmit = data.lastSubmit || 0;
    } catch {}
  }
  const now = Date.now();
  const hoursSince = (now - lastSubmit) / (1000 * 60 * 60);
  if (!isDryRun && hoursSince < SUBMIT_INTERVAL_HOURS) {
    console.log(`⏳ Skipping IndexNow submit: Only ${hoursSince.toFixed(2)} hours since last submit. Interval is ${SUBMIT_INTERVAL_HOURS} hours.`);
    return;
  }

  let xml;
  let allUrls;
  let submitUrls;

  if (fs.existsSync(SITEMAP_PATH)) {
    console.log(`📄 Using local sitemap at: ${SITEMAP_PATH}`);
    xml = fs.readFileSync(SITEMAP_PATH, "utf8");
    allUrls = extractUrlsFromSitemap(xml);
    console.log(`📄 Found ${allUrls.length} URLs in local sitemap.xml`);

    try {
      const liveUrls = await loadRemoteSitemapUrlsWithRetry();
      console.log(`🌐 Found ${liveUrls.length} URLs in live sitemap.xml`);

      const liveUrlSet = new Set(liveUrls);
      const newUrls = allUrls.filter((url) => !liveUrlSet.has(url));

      if (newUrls.length > 0) {
        console.log(`🆕 Detected ${newUrls.length} URL(s) not yet present in the live sitemap.`);

        const { liveUrls: readyUrls, missingUrls } = await waitForUrlsToGoLive(newUrls);

        if (readyUrls.length === 0) {
          console.error("❌ No newly added URLs are live yet. Skipping IndexNow submission.");
          return;
        }

        if (missingUrls.length > 0) {
          console.warn(`⚠️ Skipping ${missingUrls.length} URL(s) still returning non-200 responses.`);
          for (const url of missingUrls) {
            console.warn(`   - ${url}`);
          }
        }

        submitUrls = readyUrls;
      } else {
        console.log("ℹ️ No new URLs detected versus the live sitemap. Submitting the full sitemap URL set.");
      }
    } catch (err) {
      if (shouldWaitForLive) {
        console.error(`❌ Unable to verify live sitemap before IndexNow submission: ${err.message}. Skipping submission.`);
        return;
      }

      console.warn(`⚠️ Live sitemap check failed: ${err.message}. Continuing without live verification.`);
    }
  } else {
    console.warn(`⚠️ Sitemap not found at ${SITEMAP_PATH}. Falling back to remote: ${SITEMAP_URL}`);
    try {
      xml = await fetchText(SITEMAP_URL, "Remote sitemap");
    } catch (err) {
      console.error(`❌ Error fetching remote sitemap:`, err.message, '. Skipping IndexNow submission.');
      return; // Exit gracefully
    }

    allUrls = extractUrlsFromSitemap(xml);
    console.log(`📄 Found ${allUrls.length} URLs in remote sitemap.xml`);
  }

  submitUrls = submitUrls || allUrls;

  if (submitUrls.length === 0) {
    console.warn("⚠️ No URLs qualified for IndexNow submission.");
    return;
  }

  console.log(`📬 Preparing to submit ${submitUrls.length} URL(s) to IndexNow${isDryRun ? ' [dry run]' : ''}`);

  for (let i = 0; i < submitUrls.length; i += BATCH_SIZE) {
    const batch = submitUrls.slice(i, i + BATCH_SIZE);
    await submitBatch(batch, Math.floor(i / BATCH_SIZE) + 1);
    if (i + BATCH_SIZE < submitUrls.length) await sleep(DELAY_MS);
  }

  // Update last submit time
  if (!isDryRun) {
    fs.writeFileSync(LAST_SUBMIT_PATH, JSON.stringify({ lastSubmit: now }));
  }
  console.log("🎉 All batches submitted!");
}

main();