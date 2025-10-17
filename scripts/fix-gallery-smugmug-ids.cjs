#!/usr/bin/env node
/**
 * Fix SmugMug image URL IDs in a gallery data file so that
 * each item's src/srcXL/srcL/srcM/srcS belong to that item's id.
 *
 * Heuristic:
 * - Scan the entire file for SmugMug URLs and build a map of id -> urls by size.
 * - Prefer the set (by base path) that has the most complete sizes for a given id.
 * - For each item, if we have URLs for its id, replace src* to the mapped ones.
 * - Set `src` to the best available of S/M/L/XL (consistent with generateMasterGalleryData.cjs behavior).
 *
 * Usage:
 *   node scripts/fix-gallery-smugmug-ids.cjs <path-to-gallery.mjs>
 *   If not provided, defaults to NA-Color.mjs in Western Cowboy Portraits.
 */

const fs = require('fs');
const path = require('path');

const defaultFile = path.join(
  __dirname,
  '..',
  'src',
  'data',
  'Galleries',
  'Painterly-Fine-Art-Photography',
  'Facing-History',
  'Western-Cowboy-Portraits',
  'NA-Color.mjs'
);

const filePath = process.argv[2] ? path.resolve(process.argv[2]) : defaultFile;

function extractJsonArray(fileText) {
  // Remove the leading export and trailing semicolon safely
  const start = fileText.indexOf('export const galleryData =');
  if (start === -1) throw new Error('Could not find export const galleryData =');
  const after = fileText.slice(start + 'export const galleryData ='.length);
  const firstBracket = after.indexOf('[');
  const endBracket = after.lastIndexOf(']');
  if (firstBracket === -1 || endBracket === -1) throw new Error('Could not locate JSON array brackets');
  const jsonText = after.slice(firstBracket, endBracket + 1);
  return jsonText;
}

function parseArray(jsonText) {
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    // Try to be forgiving: remove trailing commas
    const forgiving = jsonText.replace(/,\s*([\]\}])/g, '$1');
    return JSON.parse(forgiving);
  }
}

function buildIdToUrlsMap(fileText) {
  // Match SmugMug photo URLs that contain /i-<id>/ and size segment
  const urlRegex = /(https?:\/\/photos\.smugmug\.com\/[^\s"']*\/i-([A-Za-z0-9]+)\/[^\s"']*)/g;
  /** @type {Record<string, Array<{url:string, size:string, base:string}>>} */
  const temp = {};

  let m;
  while ((m = urlRegex.exec(fileText)) !== null) {
    const url = m[1];
    const id = 'i-' + m[2];
    // size heuristic from path: contains \/XL\/ or \/L\/ or \/M\/ or \/S\/
    let size = '';
    if (/\/XL\//.test(url) || /-XL\.[a-zA-Z]+$/.test(url)) size = 'XL';
    else if (/\/L\//.test(url) || /-L\.[a-zA-Z]+$/.test(url)) size = 'L';
    else if (/\/M\//.test(url) || /-M\.[a-zA-Z]+$/.test(url)) size = 'M';
    else if (/\/S\//.test(url) || /-S\.[a-zA-Z]+$/.test(url)) size = 'S';

    // derive a base without the final filename to group variants
    const lastSlash = url.lastIndexOf('/');
    const base = lastSlash > -1 ? url.slice(0, lastSlash) : url;

    (temp[id] ||= []).push({ url, size, base });
  }

  /** @type {Record<string, {srcXL?:string, srcL?:string, srcM?:string, srcS?:string}>} */
  const result = {};

  for (const [id, entries] of Object.entries(temp)) {
    // group by base and pick the group with the most sizes
    const byBase = entries.reduce((acc, e) => {
      (acc[e.base] ||= []).push(e);
      return acc;
    }, /** @type {Record<string, typeof entries>} */ ({}));

    let bestGroup = [];
    for (const group of Object.values(byBase)) {
      if (group.length > bestGroup.length) bestGroup = group;
    }

    const chosen = { srcXL: undefined, srcL: undefined, srcM: undefined, srcS: undefined };
    for (const e of bestGroup) {
      if (e.size === 'XL') chosen.srcXL = e.url;
      if (e.size === 'L') chosen.srcL = e.url;
      if (e.size === 'M') chosen.srcM = e.url;
      if (e.size === 'S') chosen.srcS = e.url;
    }
    result[id] = chosen;
  }

  return result;
}

function reserialize(array) {
  // Pretty-print with 2 spaces and trailing commas as in examples
  return 'export const galleryData = ' + JSON.stringify(array, null, 2) + '\n';
}

function main() {
  const fileText = fs.readFileSync(filePath, 'utf8');
  const jsonText = extractJsonArray(fileText);
  const data = parseArray(jsonText);

  const idToUrls = buildIdToUrlsMap(fileText);

  let fixes = 0;
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const id = item.id;
    if (!id || typeof id !== 'string') continue;

    const urls = idToUrls[id];
    if (!urls) continue; // nothing to fix for this id

    const before = { src: item.src, srcXL: item.srcXL, srcL: item.srcL, srcM: item.srcM, srcS: item.srcS };

    if (urls.srcXL) item.srcXL = urls.srcXL;
    if (urls.srcL) item.srcL = urls.srcL;
    if (urls.srcM) item.srcM = urls.srcM;
    if (urls.srcS) item.srcS = urls.srcS;

    // pick best src display: prefer S, then M, L, XL (to match generateMasterGalleryData precedence)
    item.src = item.srcS || item.srcM || item.srcL || item.srcXL || item.src || '';

    const after = { src: item.src, srcXL: item.srcXL, srcL: item.srcL, srcM: item.srcM, srcS: item.srcS };
    if (JSON.stringify(before) !== JSON.stringify(after)) fixes++;
  }

  const newText = reserialize(data);
  fs.writeFileSync(filePath, newText, 'utf8');
  console.log(`Updated ${filePath}. Fixed ${fixes} items.`);
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
