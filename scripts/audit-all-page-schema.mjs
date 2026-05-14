#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ORIGIN = "http://localhost:4321";
const SITE_ORIGIN = "https://www.k4studios.com";
const JSON_LD_RE = /<script type="application\/ld\+json">(?<json>.*?)<\/script>/gis;

const DEFAULT_PATHS = [
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/all",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Black-White/all",
  "/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Black-White/all",
  "/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains/all",
];

const STANDARD_PRINT_SERIES_KEYS = ["sketch", "foundation", "chronicle", "legend"];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pricingConfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../src/data/pricingConfig.json"), "utf8")
);

function getStandardPrices() {
  return STANDARD_PRINT_SERIES_KEYS.flatMap((key) =>
    Object.values(pricingConfig.pricing?.[key] || {}).map((value) => Number(value))
  ).filter((value) => Number.isFinite(value));
}

function getLowestStandardPrintPrice() {
  return Math.min(...getStandardPrices());
}

function getHighestStandardPrintPrice() {
  return Math.max(...getStandardPrices());
}

function usage() {
  return [
    "Usage:",
    "  node scripts/audit-all-page-schema.mjs [--origin http://localhost:4321] /Gallery/Path/all [...]",
    "",
    "Checks:",
    "  1. CollectionPage @id = allPageUrl#collectionpage",
    "  2. CollectionPage.mainEntity = galleryBaseUrl#imagegallery",
    "  3. ImageGallery @id = galleryBaseUrl#imagegallery",
    "  4. no /all#imagegallery",
    "  5. exactly one BreadcrumbList",
    "  6. AggregateOffer exists on CollectionPage",
    "  7. offerCount matches rendered .ssr-card count",
    "  8. lowPrice/highPrice match the shared pricing module",
    "  9. seller = https://www.k4studios.com/#organization",
    "  10. sampled image detail isPartOf matches galleryBaseUrl#imagegallery",
  ].join("\n");
}

function parseArgs(argv) {
  const args = [...argv];
  let origin = DEFAULT_ORIGIN;
  const paths = [];

  while (args.length) {
    const arg = args.shift();
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--origin") {
      origin = args.shift() || DEFAULT_ORIGIN;
      continue;
    }
    paths.push(arg);
  }

  return { origin: origin.replace(/\/$/, ""), paths: paths.length ? paths : DEFAULT_PATHS };
}

function normalizePath(value) {
  if (!value) return "/";
  try {
    return new URL(value).pathname.replace(/\/$/, "");
  } catch {
    return String(value).startsWith("/") ? String(value).replace(/\/$/, "") : `/${value}`.replace(/\/$/, "");
  }
}

function allPageUrlFor(path) {
  return `${SITE_ORIGIN}${path}`;
}

function galleryBasePathFor(allPath) {
  return allPath.replace(/\/all$/, "");
}

function collectSchemaItems(html) {
  const items = [];
  for (const match of html.matchAll(JSON_LD_RE)) {
    try {
      const parsed = JSON.parse(match.groups.json);
      if (Array.isArray(parsed?.["@graph"])) {
        items.push(...parsed["@graph"]);
      } else if (parsed) {
        items.push(parsed);
      }
    } catch {
      // Bad JSON-LD is reported as missing required nodes below.
    }
  }
  return items;
}

function schemaTypeIncludes(item, typeName) {
  const type = item?.["@type"];
  return Array.isArray(type) ? type.includes(typeName) : type === typeName;
}

function firstSchemaItem(items, typeName) {
  return items.find((item) => schemaTypeIncludes(item, typeName));
}

function countSchemaItems(items, typeName) {
  return items.filter((item) => schemaTypeIncludes(item, typeName)).length;
}

function countRenderedCards(html) {
  return (html.match(/<div\b[^>]*class="[^"]*\bssr-card\b[^"]*"[^>]*\bid="i-[A-Za-z0-9]+"/g) || []).length;
}

function firstImageIdFor(html, galleryBasePath) {
  const escaped = galleryBasePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`${escaped}/(i-[A-Za-z0-9]+)`));
  return match?.[1] || "";
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

function addCheck(checks, label, pass, details = "") {
  checks.push({ label, pass: Boolean(pass), details });
}

async function auditPath({ origin, allPath }) {
  const path = normalizePath(allPath);
  const galleryBasePath = galleryBasePathFor(path);
  const allPageUrl = allPageUrlFor(path);
  const galleryBaseUrl = `${SITE_ORIGIN}${galleryBasePath}`;
  const expectedCollectionPageId = `${allPageUrl}#collectionpage`;
  const expectedImageGalleryId = `${galleryBaseUrl}#imagegallery`;
  const expectedItemListId = `${allPageUrl}#itemlist`;
  const expectedSellerId = `${SITE_ORIGIN}/#organization`;
  const expectedLowPrice = getLowestStandardPrintPrice();
  const expectedHighPrice = getHighestStandardPrintPrice();
  const html = await fetchText(`${origin}${path}`);
  const schemaItems = collectSchemaItems(html);
  const collectionPage = firstSchemaItem(schemaItems, "CollectionPage");
  const imageGallery = firstSchemaItem(schemaItems, "ImageGallery");
  const itemList = firstSchemaItem(schemaItems, "ItemList");
  const breadcrumbCount = countSchemaItems(schemaItems, "BreadcrumbList");
  const renderedCardCount = countRenderedCards(html);
  const checks = [];

  addCheck(checks, "CollectionPage @id", collectionPage?.["@id"] === expectedCollectionPageId, collectionPage?.["@id"]);
  addCheck(checks, "CollectionPage.mainEntity", collectionPage?.mainEntity?.["@id"] === expectedImageGalleryId, collectionPage?.mainEntity?.["@id"]);
  addCheck(checks, "ImageGallery @id", imageGallery?.["@id"] === expectedImageGalleryId, imageGallery?.["@id"]);
  addCheck(checks, "no /all#imagegallery", !html.includes("/all#imagegallery"));
  addCheck(checks, "one BreadcrumbList", breadcrumbCount === 1, String(breadcrumbCount));
  addCheck(checks, "AggregateOffer exists", collectionPage?.offers?.["@type"] === "AggregateOffer", collectionPage?.offers?.["@type"]);
  addCheck(checks, "offerCount matches cards", Number(collectionPage?.offers?.offerCount) === renderedCardCount, `${collectionPage?.offers?.offerCount} / ${renderedCardCount}`);
  addCheck(checks, "lowPrice from pricing module", Number(collectionPage?.offers?.lowPrice) === Number(expectedLowPrice), `${collectionPage?.offers?.lowPrice} / ${expectedLowPrice}`);
  addCheck(checks, "highPrice from pricing module", Number(collectionPage?.offers?.highPrice) === Number(expectedHighPrice), `${collectionPage?.offers?.highPrice} / ${expectedHighPrice}`);
  addCheck(checks, "seller #organization", collectionPage?.offers?.seller?.["@id"] === expectedSellerId, collectionPage?.offers?.seller?.["@id"]);
  addCheck(checks, "Person full node absent", countSchemaItems(schemaItems, "Person") === 0, String(countSchemaItems(schemaItems, "Person")));
  addCheck(checks, "Organization full node absent", countSchemaItems(schemaItems, "Organization") === 0, String(countSchemaItems(schemaItems, "Organization")));

  if (itemList) {
    addCheck(checks, "ItemList @id", itemList?.["@id"] === expectedItemListId, itemList?.["@id"]);
  }

  const firstImageId = firstImageIdFor(html, galleryBasePath);
  let detailIsPartOf = "";
  let detailImageId = "";

  if (firstImageId) {
    const detailHtml = await fetchText(`${origin}${galleryBasePath}/${firstImageId}`);
    const detailItems = collectSchemaItems(detailHtml);
    const imageNode = detailItems.find((item) =>
      schemaTypeIncludes(item, "ImageObject") || schemaTypeIncludes(item, "VisualArtwork") || schemaTypeIncludes(item, "Product")
    );
    const isPartOf = imageNode?.isPartOf;
    detailImageId = imageNode?.["@id"] || "";
    detailIsPartOf = Array.isArray(isPartOf)
      ? isPartOf.find((item) => schemaTypeIncludes(item, "ImageGallery"))?.["@id"] || ""
      : isPartOf?.["@id"] || "";
  }

  addCheck(checks, "detail isPartOf", detailIsPartOf === expectedImageGalleryId, detailIsPartOf || "no sampled image detail");

  return {
    path,
    pass: checks.every((check) => check.pass),
    summary: {
      collectionPageId: collectionPage?.["@id"] || "",
      collectionPageMainEntity: collectionPage?.mainEntity?.["@id"] || "",
      imageGalleryId: imageGallery?.["@id"] || "",
      itemListId: itemList?.["@id"] || "",
      breadcrumbCount,
      offerCount: collectionPage?.offers?.offerCount,
      renderedCardCount,
      lowPrice: collectionPage?.offers?.lowPrice,
      highPrice: collectionPage?.offers?.highPrice,
      seller: collectionPage?.offers?.seller?.["@id"] || "",
      detailImageId,
      detailIsPartOf,
    },
    checks,
  };
}

function printResult(result) {
  const mark = result.pass ? "PASS" : "FAIL";
  console.log(`\n${mark} ${result.path}`);
  console.log(`  CollectionPage: ${result.summary.collectionPageId}`);
  console.log(`  mainEntity:     ${result.summary.collectionPageMainEntity}`);
  console.log(`  ImageGallery:   ${result.summary.imageGalleryId}`);
  if (result.summary.itemListId) console.log(`  ItemList:       ${result.summary.itemListId}`);
  console.log(`  BreadcrumbList: ${result.summary.breadcrumbCount}`);
  console.log(`  Offer:          low ${result.summary.lowPrice}, high ${result.summary.highPrice}, count ${result.summary.offerCount}`);
  console.log(`  Cards:          ${result.summary.renderedCardCount}`);
  console.log(`  Seller:         ${result.summary.seller}`);
  console.log(`  Detail image:   ${result.summary.detailImageId}`);
  console.log(`  Detail partOf:  ${result.summary.detailIsPartOf}`);

  for (const check of result.checks) {
    if (!check.pass) {
      console.log(`  - FAIL ${check.label}${check.details ? `: ${check.details}` : ""}`);
    }
  }
}

const { origin, paths } = parseArgs(process.argv.slice(2));
const results = [];

for (const path of paths) {
  try {
    const result = await auditPath({ origin, allPath: path });
    results.push(result);
    printResult(result);
  } catch (error) {
    results.push({ path, pass: false });
    console.log(`\nFAIL ${path}`);
    console.log(`  ${error.message}`);
  }
}

const failed = results.filter((result) => !result.pass);
console.log(`\nAll-page schema audit: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
