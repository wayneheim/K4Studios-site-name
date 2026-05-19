/**
 * Submit URLs to IndexNow from the generated sitemap tree.
 *
 * The script follows nested sitemap indexes, so the normal sitemap,
 * blog sitemap, and image-page sitemaps all participate in change detection.
 *
 * Usage:
 *   node scripts/submit-indexnow.mjs [--dry-run] [--no-wait-live] [--skip-url-live-check] [--allow-full-submit]
 *
 * Useful environment variables:
 *   INDEXNOW_BATCH_SIZE=500
 *   INDEXNOW_BULK_THRESHOLD=200
 *   INDEXNOW_MIN_INTERVAL_HOURS=0
 *   INDEXNOW_LIVE_TIMEOUT_MS=600000
 *   INDEXNOW_LIVE_INTERVAL_MS=20000
 *   INDEXNOW_LIVE_CONCURRENCY=16
 *   INDEXNOW_STREAM_DELAY_MS=250
 *   SITEMAP_URL=https://www.k4studios.com/sitemap-index.xml
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const SUBMIT_INTERVAL_HOURS = Number(process.env.INDEXNOW_MIN_INTERVAL_HOURS || 0);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LAST_SUBMIT_PATH = path.join(__dirname, ".indexnow-last-submit.json");
const URL_STATE_PATH = path.join(__dirname, ".indexnow-url-signatures.json");

const SITE_HOST = "www.k4studios.com";
const INDEXNOW_KEY = "e05ffc8ff8004372b01c0e153ba16b44";
const INDEXNOW_KEY_URL = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;
const DIST_DIR = path.join(__dirname, "../dist");
const SITEMAP_PATH = path.join(DIST_DIR, "sitemap-index.xml");
const FALLBACK_SITEMAP_PATH = path.join(DIST_DIR, "sitemap.xml");
const SITEMAP_URL = process.env.SITEMAP_URL || `https://${SITE_HOST}/sitemap-index.xml`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const STREAM_DELAY_MS = Number(process.env.INDEXNOW_STREAM_DELAY_MS || 250);
const INDEXNOW_BATCH_SIZE = Math.max(
  1,
  Math.min(10000, Number(process.env.INDEXNOW_BATCH_SIZE || 500))
);
const INDEXNOW_BULK_THRESHOLD = Math.max(1, Number(process.env.INDEXNOW_BULK_THRESHOLD || 200));
const LIVE_CHECK_TIMEOUT_MS = Number(process.env.INDEXNOW_LIVE_TIMEOUT_MS || 10 * 60 * 1000);
const LIVE_CHECK_INTERVAL_MS = Number(process.env.INDEXNOW_LIVE_INTERVAL_MS || 20 * 1000);
const LIVE_CHECK_CONCURRENCY = Math.max(1, Number(process.env.INDEXNOW_LIVE_CONCURRENCY || 16));
const LIVE_CHECK_USER_AGENT = "K4-IndexNow-Verifier/1.0";

const isDryRun = process.argv.includes("--dry-run");
const shouldWaitForLive = !process.argv.includes("--no-wait-live");
const shouldCheckUrlsLive = !isDryRun && !process.argv.includes("--skip-url-live-check");
const allowFullSubmit = process.argv.includes("--allow-full-submit");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueUrls(urls) {
  return [...new Set(urls.filter(Boolean))];
}

function uniqueEntries(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (entry?.url) {
      map.set(entry.url, entry);
    }
  }
  return [...map.values()];
}

function extractUrlsFromSitemap(xmlContent) {
  const matches = [...xmlContent.matchAll(/<loc>(.*?)<\/loc>/g)];
  return uniqueUrls(matches.map((m) => m[1].trim()));
}

function extractSitemapIndexUrls(xmlContent) {
  const sitemapBlocks = [...xmlContent.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)];
  const urls = [];

  for (const block of sitemapBlocks) {
    const section = block[1] || "";
    const locMatch = section.match(/<loc>(.*?)<\/loc>/);
    if (locMatch?.[1]) {
      urls.push(locMatch[1].trim());
    }
  }

  return uniqueUrls(urls);
}

function isSitemapIndex(xmlContent) {
  return /<sitemapindex\b/i.test(xmlContent);
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

function sitemapUrlToLocalPath(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== SITE_HOST) {
      return null;
    }
    const relativePath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    return path.join(DIST_DIR, relativePath);
  } catch {
    return null;
  }
}

function loadLocalSitemapEntries(sitemapPath, visited = new Set()) {
  const resolvedPath = path.resolve(sitemapPath);
  if (visited.has(resolvedPath)) {
    return [];
  }
  visited.add(resolvedPath);

  const xml = fs.readFileSync(resolvedPath, "utf8");
  if (!isSitemapIndex(xml)) {
    return extractEntriesFromSitemap(xml);
  }

  const entries = [];
  const childUrls = extractSitemapIndexUrls(xml);
  for (const childUrl of childUrls) {
    const childPath = sitemapUrlToLocalPath(childUrl);
    if (!childPath || !fs.existsSync(childPath)) {
      console.warn(`Warning: skipping sitemap index child without local file: ${childUrl}`);
      continue;
    }
    entries.push(...loadLocalSitemapEntries(childPath, visited));
  }

  return uniqueEntries(entries);
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

async function loadRemoteSitemapEntries(url, visited = new Set()) {
  if (visited.has(url)) {
    return [];
  }
  visited.add(url);

  const xml = await fetchText(url, "Remote sitemap");
  if (!isSitemapIndex(xml)) {
    return extractEntriesFromSitemap(xml);
  }

  const entries = [];
  const childUrls = extractSitemapIndexUrls(xml);
  for (const childUrl of childUrls) {
    entries.push(...(await loadRemoteSitemapEntries(childUrl, visited)));
  }

  return uniqueEntries(entries);
}

async function loadRemoteSitemapEntriesWithRetry() {
  const deadline = Date.now() + LIVE_CHECK_TIMEOUT_MS;
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      console.log(`Fetching live sitemap tree (attempt ${attempt}) from ${SITEMAP_URL}`);
      return await loadRemoteSitemapEntries(SITEMAP_URL);
    } catch (err) {
      const remainingMs = deadline - Date.now();
      if (!shouldWaitForLive || remainingMs <= 0) {
        throw err;
      }

      const waitMs = Math.min(LIVE_CHECK_INTERVAL_MS, remainingMs);
      console.warn(`${err.message}. Retrying in ${Math.ceil(waitMs / 1000)}s...`);
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
    const batchResults = [];
    for (let i = 0; i < pending.length; i += LIVE_CHECK_CONCURRENCY) {
      const chunk = pending.slice(i, i + LIVE_CHECK_CONCURRENCY);
      const chunkResults = await Promise.all(
        chunk.map(async (url) => ({ url, live: await isUrlLive(url) }))
      );
      batchResults.push(...chunkResults);
    }

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
    console.warn(`${pending.length} URL(s) still not live. Retrying in ${Math.ceil(waitMs / 1000)}s...`);
    await sleep(waitMs);
  }

  return {
    liveUrls: live,
    missingUrls: pending,
  };
}

async function submitUrlBatch(urls, batchNum, totalBatches) {
  console.log(`Submitting batch ${batchNum}/${totalBatches}: ${urls.length} URL(s)`);

  if (isDryRun) {
    console.log(`Dry run: skipping batch ${batchNum}`);
    for (const url of urls.slice(0, 10)) {
      console.log(`   - ${url}`);
    }
    if (urls.length > 10) {
      console.log(`   ...and ${urls.length - 10} more`);
    }
    return true;
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host: SITE_HOST,
        key: INDEXNOW_KEY,
        keyLocation: INDEXNOW_KEY_URL,
        urlList: urls,
      }),
    });

    const text = await res.text();
    console.log(`Batch ${batchNum} response: ${res.status} ${text}`);
    return res.ok;
  } catch (err) {
    console.error(`Error submitting batch ${batchNum}:`, err);
    return false;
  }
}

async function submitUrl(url, submitNum, totalUrls) {
  const requestUrl = new URL(ENDPOINT);
  requestUrl.searchParams.set("url", url);
  requestUrl.searchParams.set("key", INDEXNOW_KEY);
  requestUrl.searchParams.set("keyLocation", INDEXNOW_KEY_URL);

  console.log(`Submitting URL ${submitNum}/${totalUrls}: ${url}`);

  if (isDryRun) {
    console.log(`Dry run: skipping single-URL request ${submitNum}`);
    return true;
  }

  try {
    const res = await fetch(requestUrl);
    const text = await res.text();
    console.log(`URL ${submitNum} response: ${res.status} ${text}`);
    return res.ok;
  } catch (err) {
    console.error(`Error submitting URL ${submitNum}:`, err);
    return false;
  }
}

async function main() {
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
    console.log(
      `Skipping IndexNow submit: only ${hoursSince.toFixed(2)} hours since last submit. Interval is ${SUBMIT_INTERVAL_HOURS} hours.`
    );
    return;
  }

  let allUrls = [];
  let submitUrls = [];
  let currentSignatures = null;
  let previousSignatures = null;
  const localSitemapPath = fs.existsSync(SITEMAP_PATH) ? SITEMAP_PATH : FALLBACK_SITEMAP_PATH;

  if (fs.existsSync(localSitemapPath)) {
    console.log(`Using local sitemap root at: ${localSitemapPath}`);
    const localEntries = loadLocalSitemapEntries(localSitemapPath);
    allUrls = localEntries.map((entry) => entry.url);
    currentSignatures = buildSignatureMap(localEntries);
    previousSignatures = loadUrlSignatureState();
    submitUrls = computeChangedUrls(currentSignatures, previousSignatures);

    console.log(`Found ${allUrls.length} URLs in local sitemap tree`);
    if (previousSignatures) {
      console.log(`Detected ${submitUrls.length} changed/new URL(s) since last IndexNow submit state.`);
    } else {
      console.log("No local IndexNow signature state found; using live sitemap comparison for initial baseline detection.");
    }

    try {
      const liveEntries = await loadRemoteSitemapEntriesWithRetry();
      const liveUrls = liveEntries.map((entry) => entry.url);
      console.log(`Found ${liveUrls.length} URLs in live sitemap tree`);

      if (!previousSignatures) {
        const liveUrlSet = new Set(liveUrls);
        const newUrls = allUrls.filter((url) => !liveUrlSet.has(url));
        submitUrls = uniqueUrls([...submitUrls, ...newUrls]);
      }

      if (allowFullSubmit) {
        submitUrls = allUrls;
      }

      if (submitUrls.length > 0) {
        console.log(`Detected ${submitUrls.length} URL(s) requiring IndexNow submission.`);

        if (shouldCheckUrlsLive) {
          const { liveUrls: readyUrls, missingUrls } = await waitForUrlsToGoLive(submitUrls);
          if (readyUrls.length === 0) {
            console.error("No changed/new URLs are live yet. Skipping IndexNow submission.");
            return;
          }

          if (missingUrls.length > 0) {
            console.warn(`Skipping ${missingUrls.length} URL(s) still returning non-200 responses.`);
            for (const url of missingUrls) {
              console.warn(`   - ${url}`);
            }
          }

          submitUrls = readyUrls;
        } else {
          console.log("Skipping individual URL live checks for this run.");
        }
      } else {
        console.log("No changed/new URLs detected for IndexNow submission.");
      }
    } catch (err) {
      if (shouldWaitForLive) {
        console.error(`Unable to verify live sitemap before IndexNow submission: ${err.message}. Skipping submission.`);
        return;
      }

      console.warn(`Live sitemap check failed: ${err.message}. Continuing without live verification.`);
      if (allowFullSubmit) {
        submitUrls = allUrls;
      }
    }
  } else {
    console.warn(`Sitemap not found at ${SITEMAP_PATH}. Falling back to remote: ${SITEMAP_URL}`);
    try {
      const remoteEntries = await loadRemoteSitemapEntries(SITEMAP_URL);
      allUrls = remoteEntries.map((entry) => entry.url);
      currentSignatures = buildSignatureMap(remoteEntries);
      console.log(`Found ${allUrls.length} URLs in remote sitemap tree`);
    } catch (err) {
      console.error(`Error fetching remote sitemap: ${err.message}. Skipping IndexNow submission.`);
      return;
    }

    if (allowFullSubmit) {
      submitUrls = allUrls;
    }
  }

  if (!submitUrls) {
    submitUrls = [];
  }

  if (submitUrls.length === 0) {
    console.warn("No URLs qualified for IndexNow submission.");
    console.warn("To force a full one-time batch submit, rerun with --allow-full-submit.");

    if (!isDryRun && currentSignatures) {
      saveUrlSignatureState(currentSignatures);
      console.log("Updated local IndexNow signature state for future change detection.");
    }

    return;
  }

  const successfulUrls = [];
  const shouldUseBulkSubmit = submitUrls.length > INDEXNOW_BULK_THRESHOLD;

  if (shouldUseBulkSubmit) {
    console.log(
      `Preparing bulk IndexNow submit for ${submitUrls.length} URL(s) in batches of ${INDEXNOW_BATCH_SIZE}${isDryRun ? " [dry run]" : ""}`
    );

    const totalBatches = Math.ceil(submitUrls.length / INDEXNOW_BATCH_SIZE);
    for (let i = 0; i < submitUrls.length; i += INDEXNOW_BATCH_SIZE) {
      const batch = submitUrls.slice(i, i + INDEXNOW_BATCH_SIZE);
      const batchNum = Math.floor(i / INDEXNOW_BATCH_SIZE) + 1;
      const ok = await submitUrlBatch(batch, batchNum, totalBatches);
      if (ok) {
        successfulUrls.push(...batch);
      }
      if (i + INDEXNOW_BATCH_SIZE < submitUrls.length) {
        await sleep(STREAM_DELAY_MS);
      }
    }
  } else {
    console.log(
      `Preparing streaming IndexNow submit for ${submitUrls.length} URL(s) one at a time${isDryRun ? " [dry run]" : ""}`
    );

    for (let i = 0; i < submitUrls.length; i += 1) {
      const ok = await submitUrl(submitUrls[i], i + 1, submitUrls.length);
      if (ok) {
        successfulUrls.push(submitUrls[i]);
      }
      if (i + 1 < submitUrls.length) {
        await sleep(STREAM_DELAY_MS);
      }
    }
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
    console.log(`Updated local IndexNow signature state (${successfulUrls.length}/${submitUrls.length} URL(s) sent successfully).`);
  }

  if (!isDryRun) {
    fs.writeFileSync(LAST_SUBMIT_PATH, JSON.stringify({ lastSubmit: now }));
  }

  console.log("IndexNow submission complete.");
}

main();
