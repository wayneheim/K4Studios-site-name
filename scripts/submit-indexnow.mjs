/**
 * Submit URLs to Bing IndexNow directly from your generated sitemap.xml
 * Streaming mode submits one URL at a time as soon as eligible changes are detected.
 * Usage: node scripts/submit-indexnow.mjs [--dry-run] [--no-wait-live] [--allow-full-submit]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// === ⏰ SUBMIT INTERVAL CONTROL ===
// Default is immediate submission for streaming compliance.
const SUBMIT_INTERVAL_HOURS = Number(process.env.INDEXNOW_MIN_INTERVAL_HOURS || 0);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LAST_SUBMIT_PATH = path.join(__dirname, ".indexnow-last-submit.json");
const URL_STATE_PATH = path.join(__dirname, ".indexnow-url-signatures.json");

// === 🔧 CONFIGURATION ===
const SITE_HOST = "www.k4studios.com";
const INDEXNOW_KEY = "e05ffc8ff8004372b01c0e153ba16b44";
const INDEXNOW_KEY_URL = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;
const SITEMAP_PATH = path.join(__dirname, "../dist/sitemap.xml");
const SITEMAP_URL = process.env.SITEMAP_URL || `https://${SITE_HOST}/sitemap.xml`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const STREAM_DELAY_MS = Number(process.env.INDEXNOW_STREAM_DELAY_MS || 250);
const LIVE_CHECK_TIMEOUT_MS = Number(process.env.INDEXNOW_LIVE_TIMEOUT_MS || 10 * 60 * 1000);
const LIVE_CHECK_INTERVAL_MS = Number(process.env.INDEXNOW_LIVE_INTERVAL_MS || 20 * 1000);
const LIVE_CHECK_USER_AGENT = "K4-IndexNow-Verifier/1.0";

const isDryRun = process.argv.includes("--dry-run");
const shouldWaitForLive = !process.argv.includes("--no-wait-live");
const allowFullSubmit = process.argv.includes("--allow-full-submit");

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

function extractEntriesFromSitemap(xmlContent) {
  const entries = [];
  const urlBlocks = [...xmlContent.matchAll(/<url>([\s\S]*?)<\/url>/g)];

  for (const block of urlBlocks) {
    const section = block[1] || "";
    const locMatch = section.match(/<loc>(.*?)<\/loc>/);
    if (!locMatch?.[1]) continue;

    const url = locMatch[1].trim();
    const lastmodMatch = section.match(/<lastmod>(.*?)<\/lastmod>/);
    const lastmod = lastmodMatch?.[1]?.trim() || "";
    entries.push({ url, lastmod });
  }

  if (entries.length === 0) {
    return extractUrlsFromSitemap(xmlContent).map((url) => ({ url, lastmod: "" }));
  }

  return entries;
}

function buildSignatureMap(entries) {
  const map = {};
  for (const entry of entries) {
    map[entry.url] = entry.lastmod || "";
  }
  return map;
}

function loadUrlSignatureState() {
  if (!fs.existsSync(URL_STATE_PATH)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(URL_STATE_PATH, "utf8"));
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveUrlSignatureState(signatures) {
  fs.writeFileSync(URL_STATE_PATH, JSON.stringify(signatures, null, 2));
}

function computeChangedUrls(currentSignatures, previousSignatures) {
  if (!previousSignatures) {
    return [];
  }

  const changed = [];
  for (const [url, signature] of Object.entries(currentSignatures)) {
    if (previousSignatures[url] !== signature) {
      changed.push(url);
    }
  }
  return changed;
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

async function submitUrl(url, submitNum) {
  const requestUrl = new URL(ENDPOINT);
  requestUrl.searchParams.set("url", url);
  requestUrl.searchParams.set("key", INDEXNOW_KEY);
  requestUrl.searchParams.set("keyLocation", INDEXNOW_KEY_URL);

  console.log(`🚀 Submitting URL ${submitNum}: ${url}`);

  if (isDryRun) {
    console.log(`🧪 Dry run: skipping single-URL request for URL ${submitNum}`);
    return true;
  }

  try {
    const res = await fetch(requestUrl);

    const text = await res.text();
    console.log(`✅ URL ${submitNum} response: ${res.status} ${text}`);
    return res.ok;
  } catch (err) {
    console.error(`❌ Error submitting URL ${submitNum}:`, err);
    return false;
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
  if (!isDryRun && SUBMIT_INTERVAL_HOURS > 0 && hoursSince < SUBMIT_INTERVAL_HOURS) {
    console.log(`⏳ Skipping IndexNow submit: Only ${hoursSince.toFixed(2)} hours since last submit. Interval is ${SUBMIT_INTERVAL_HOURS} hours.`);
    return;
  }

  let xml;
  let allUrls;
  let submitUrls;
  let currentSignatures = null;
  let previousSignatures = null;

  if (fs.existsSync(SITEMAP_PATH)) {
    console.log(`📄 Using local sitemap at: ${SITEMAP_PATH}`);
    xml = fs.readFileSync(SITEMAP_PATH, "utf8");
    const localEntries = extractEntriesFromSitemap(xml);
    allUrls = localEntries.map((entry) => entry.url);
    currentSignatures = buildSignatureMap(localEntries);
    previousSignatures = loadUrlSignatureState();
    submitUrls = computeChangedUrls(currentSignatures, previousSignatures);

    console.log(`📄 Found ${allUrls.length} URLs in local sitemap.xml`);
    if (previousSignatures) {
      console.log(`🧾 Detected ${submitUrls.length} changed/new URL(s) since last IndexNow submit state.`);
    } else {
      console.log("ℹ️ No local IndexNow signature state found; using live sitemap comparison for initial baseline detection.");
    }

    try {
      const liveUrls = await loadRemoteSitemapUrlsWithRetry();
      console.log(`🌐 Found ${liveUrls.length} URLs in live sitemap.xml`);

      if (!previousSignatures) {
        const liveUrlSet = new Set(liveUrls);
        const newUrls = allUrls.filter((url) => !liveUrlSet.has(url));
        submitUrls = uniqueUrls([...submitUrls, ...newUrls]);
      }

      if (submitUrls.length > 0) {
        console.log(`🆕 Detected ${submitUrls.length} URL(s) requiring IndexNow submission.`);

        const { liveUrls: readyUrls, missingUrls } = await waitForUrlsToGoLive(submitUrls);

        if (readyUrls.length === 0) {
          console.error("❌ No changed/new URLs are live yet. Skipping IndexNow submission.");
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
        console.log("ℹ️ No changed/new URLs detected for IndexNow submission.");
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

    if (allowFullSubmit) {
      submitUrls = allUrls;
    }

    if (!isDryRun) {
      const remoteEntries = extractEntriesFromSitemap(xml);
      currentSignatures = buildSignatureMap(remoteEntries);
      saveUrlSignatureState(currentSignatures);
    }
  }

  if (!submitUrls && allowFullSubmit) {
    submitUrls = allUrls;
  }

  if (!submitUrls) {
    submitUrls = [];
  }

  if (submitUrls.length === 0) {
    console.warn("⚠️ No URLs qualified for streaming IndexNow submission.");
    console.warn("ℹ️ To force a full one-time stream, rerun with --allow-full-submit.");

    if (!isDryRun && currentSignatures) {
      saveUrlSignatureState(currentSignatures);
      console.log("💾 Updated local IndexNow signature state for future change detection.");
    }

    return;
  }

  console.log(`📬 Preparing to stream ${submitUrls.length} URL(s) to IndexNow${isDryRun ? ' [dry run]' : ''}`);

  const successfulUrls = [];
  for (let i = 0; i < submitUrls.length; i += 1) {
    const ok = await submitUrl(submitUrls[i], i + 1);
    if (ok) {
      successfulUrls.push(submitUrls[i]);
    }
    if (i + 1 < submitUrls.length) await sleep(STREAM_DELAY_MS);
  }

  if (!isDryRun && currentSignatures) {
    const allSucceeded = successfulUrls.length === submitUrls.length;
    if (allSucceeded) {
      saveUrlSignatureState(currentSignatures);
    } else {
      const merged = { ...(previousSignatures || {}) };
      for (const url of successfulUrls) {
        if (Object.prototype.hasOwnProperty.call(currentSignatures, url)) {
          merged[url] = currentSignatures[url];
        }
      }
      saveUrlSignatureState(merged);
    }
    console.log(`💾 Updated local IndexNow signature state (${successfulUrls.length}/${submitUrls.length} URL(s) sent successfully).`);
  }

  // Update last submit time
  if (!isDryRun) {
    fs.writeFileSync(LAST_SUBMIT_PATH, JSON.stringify({ lastSubmit: now }));
  }
  console.log("🎉 Streaming submission complete.");
}

main();
