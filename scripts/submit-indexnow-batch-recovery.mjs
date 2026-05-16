/**
 * One-time IndexNow recovery submitter.
 *
 * Reads dist/sitemap.xml, compares URL lastmod signatures against the local
 * IndexNow signature state, submits changed URLs in batch chunks, then updates
 * the baseline so the normal streaming script can return to small submits.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_HOST = "www.k4studios.com";
const INDEXNOW_KEY = "e05ffc8ff8004372b01c0e153ba16b44";
const INDEXNOW_KEY_URL = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const SITEMAP_PATH = path.join(__dirname, "../dist/sitemap.xml");
const URL_STATE_PATH = path.join(__dirname, ".indexnow-url-signatures.json");
const LAST_SUBMIT_PATH = path.join(__dirname, ".indexnow-last-submit.json");
const CHUNK_SIZE = Math.max(1, Number(process.env.INDEXNOW_BATCH_SIZE || 500));
const isDryRun = process.argv.includes("--dry-run");

function extractEntriesFromSitemap(xmlContent) {
  const entries = [];
  const urlBlocks = [...xmlContent.matchAll(/<url>([\s\S]*?)<\/url>/g)];

  for (const block of urlBlocks) {
    const section = block[1] || "";
    const loc = section.match(/<loc>(.*?)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;

    const lastmod = section.match(/<lastmod>(.*?)<\/lastmod>/)?.[1]?.trim() || "";
    entries.push({ url: loc, lastmod });
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

function loadPreviousSignatures() {
  if (!fs.existsSync(URL_STATE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(URL_STATE_PATH, "utf8")) || {};
  } catch {
    return {};
  }
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function submitChunk(urlList, index, total) {
  const body = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_URL,
    urlList,
  };

  console.log(`Submitting chunk ${index}/${total}: ${urlList.length} URL(s)`);

  if (isDryRun) {
    console.log(`Dry run: first URL ${urlList[0]}`);
    return true;
  }

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  console.log(`Chunk ${index}/${total} response: ${response.status} ${text}`);
  return response.ok;
}

async function main() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    throw new Error(`Missing sitemap at ${SITEMAP_PATH}`);
  }

  const xml = fs.readFileSync(SITEMAP_PATH, "utf8");
  const entries = extractEntriesFromSitemap(xml);
  const currentSignatures = buildSignatureMap(entries);
  const previousSignatures = loadPreviousSignatures();
  const changedUrls = entries
    .filter((entry) => previousSignatures[entry.url] !== (entry.lastmod || ""))
    .map((entry) => entry.url);

  const batches = chunk(changedUrls, CHUNK_SIZE);
  console.log(`Found ${entries.length} sitemap URL(s).`);
  console.log(`Detected ${changedUrls.length} changed/new URL(s).`);
  console.log(`Batch size: ${CHUNK_SIZE}. Chunk count: ${batches.length}.`);

  if (changedUrls.length === 0) {
    console.log("No changed URLs to submit.");
    return;
  }

  let successCount = 0;
  for (let index = 0; index < batches.length; index += 1) {
    const ok = await submitChunk(batches[index], index + 1, batches.length);
    if (!ok) {
      console.error(`Stopping after failed chunk ${index + 1}.`);
      break;
    }
    successCount += 1;
  }

  if (successCount !== batches.length) {
    console.error(`Submitted ${successCount}/${batches.length} chunks. Baseline was not updated.`);
    process.exitCode = 1;
    return;
  }

  if (!isDryRun) {
    fs.writeFileSync(URL_STATE_PATH, JSON.stringify(currentSignatures, null, 2));
    fs.writeFileSync(LAST_SUBMIT_PATH, JSON.stringify({ lastSubmit: Date.now() }));
    console.log("Updated IndexNow signature baseline.");
  }

  console.log(`Batch recovery complete: ${changedUrls.length} URL(s) submitted.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
