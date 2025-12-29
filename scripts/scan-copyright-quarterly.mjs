// scripts/scan-copyright-quarterly.mjs
// Automated scanner for quarterly copyright registration maintenance
// 
// Usage: node scripts/scan-copyright-quarterly.mjs [--quarter 2025-Q1] [--dry-run]
// 
// This script:
// 1. Walks all gallery .mjs files in siteNav
// 2. Finds images with first_seen in the target quarter
// 3. Filters out already-registered images
// 4. Creates/updates a draft quarterly batch
//
// This can be run manually or scheduled via cron/CI.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const REGISTRY_PATH = path.join(ROOT, "src/data/copyright/copyright-registry.json");
const QUARTERLY_DIR = path.join(ROOT, "src/data/copyright/quarterly");
const SITENAV_PATH = path.join(ROOT, "src/data/siteNav.ts");

// Data roots to scan for gallery files
const DATA_ROOTS = [
  path.join(ROOT, "src/data/Galleries"),
  path.join(ROOT, "src/data/Other"),
  path.join(ROOT, "src/pages/Other"),
];

// --- Utility Functions ---

function getCurrentQuarter() {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

function getQuarterFromDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

function getQuarterFilePath(quarter) {
  return path.join(QUARTERLY_DIR, `copyright-quarterly-${quarter}.json`);
}

async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

async function readRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return { registrations: {} };
    }
    throw err;
  }
}

async function readQuarterlyBatch(quarter) {
  const filePath = getQuarterFilePath(quarter);
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function writeQuarterlyBatch(batch) {
  await ensureDir(QUARTERLY_DIR);
  batch.updated_at = new Date().toISOString();
  const filePath = getQuarterFilePath(batch.quarter);
  await fs.writeFile(filePath, JSON.stringify(batch, null, 2), "utf8");
}

// Find all .mjs gallery files recursively
async function findGalleryFiles(dir, files = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await findGalleryFiles(fullPath, files);
      } else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Ignore directories that don't exist
    if (err.code !== "ENOENT") throw err;
  }
  return files;
}

// Dynamically import a gallery .mjs file and extract images
async function loadGalleryData(filePath) {
  try {
    // Use file:// URL for Windows compatibility
    const fileUrl = `file:///${filePath.replace(/\\/g, "/")}`;
    const mod = await import(fileUrl);
    return mod.galleryData || [];
  } catch (err) {
    console.warn(`  ⚠ Could not load ${filePath}: ${err.message}`);
    return [];
  }
}

// --- Main Scanner ---

async function scanForQuarterlyCopyrights(targetQuarter, dryRun = false) {
  console.log(`\n📋 Copyright Quarterly Scanner`);
  console.log(`   Target quarter: ${targetQuarter}`);
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  // 1. Load existing registry
  const registry = await readRegistry();
  const registeredIds = new Set(Object.keys(registry.registrations || {}));
  console.log(`✓ Registry loaded: ${registeredIds.size} registered images`);

  // 2. Load existing quarterly batch (if any)
  let batch = await readQuarterlyBatch(targetQuarter);
  const existingInBatch = new Set(batch?.images?.map((i) => i.image_id) || []);
  console.log(`✓ Existing batch: ${existingInBatch.size} images in ${targetQuarter}`);

  // 3. Find all gallery files
  let allGalleryFiles = [];
  for (const root of DATA_ROOTS) {
    const files = await findGalleryFiles(root);
    allGalleryFiles.push(...files);
  }
  console.log(`✓ Found ${allGalleryFiles.length} gallery files to scan`);

  // 4. Scan each gallery for images with first_seen in target quarter
  const candidates = [];
  let totalScanned = 0;

  for (const filePath of allGalleryFiles) {
    const relativePath = path.relative(ROOT, filePath);
    const images = await loadGalleryData(filePath);

    for (const img of images) {
      totalScanned++;
      
      // Skip placeholder image
      if (img.id === "i-k4studios") continue;
      
      // Check if has first_seen in target quarter
      if (!img.first_seen) continue;
      const imgQuarter = getQuarterFromDate(img.first_seen);
      if (imgQuarter !== targetQuarter) continue;

      // Skip if already registered
      if (registeredIds.has(img.id)) continue;

      // Skip if already in batch
      if (existingInBatch.has(img.id)) continue;

      candidates.push({
        image_id: img.id,
        source_gallery: "/" + relativePath.replace(/\\/g, "/"),
        title_snapshot: img.title || "Untitled",
        thumbnail_url: img.srcS || img.srcM || img.src || "",
        first_seen: img.first_seen,
      });
    }
  }

  console.log(`✓ Scanned ${totalScanned} images`);
  console.log(`✓ Found ${candidates.length} new candidates for ${targetQuarter}`);

  if (candidates.length === 0) {
    console.log("\n✅ No new images to add to quarterly batch.");
    return { added: 0, total: existingInBatch.size };
  }

  // 5. Create or update quarterly batch
  if (!batch) {
    batch = {
      quarter: targetQuarter,
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      images: [],
    };
  }

  // Add new candidates
  for (const candidate of candidates) {
    batch.images.push(candidate);
    existingInBatch.add(candidate.image_id);
  }

  if (dryRun) {
    console.log("\n🔍 DRY RUN - Would add these images:");
    for (const c of candidates.slice(0, 10)) {
      console.log(`   ${c.image_id} - ${c.title_snapshot} (${c.first_seen})`);
    }
    if (candidates.length > 10) {
      console.log(`   ... and ${candidates.length - 10} more`);
    }
    console.log("\n⏸ No changes written (dry run mode)");
  } else {
    await writeQuarterlyBatch(batch);
    console.log(`\n✅ Added ${candidates.length} images to ${targetQuarter} batch`);
    console.log(`   Total in batch: ${batch.images.length}`);
  }

  return { added: candidates.length, total: batch.images.length };
}

// --- Reminder Logic ---

function getQuarterDeadlines(quarter) {
  // Parse quarter string (e.g., "2025-Q2")
  const [year, q] = quarter.split("-Q");
  const quarterNum = parseInt(q);
  
  // Quarter end dates
  const quarterEndMonths = [2, 5, 8, 11]; // March, June, Sept, Dec (0-indexed)
  const endMonth = quarterEndMonths[quarterNum - 1];
  const lastDay = new Date(parseInt(year), endMonth + 1, 0).getDate();
  
  const quarterEnd = new Date(parseInt(year), endMonth, lastDay);
  
  // Registration deadline is 90 days after quarter end (3 months)
  const deadline = new Date(quarterEnd);
  deadline.setDate(deadline.getDate() + 90);
  
  // Reminder dates
  const reminder60 = new Date(deadline);
  reminder60.setDate(reminder60.getDate() - 60);
  
  const reminder30 = new Date(deadline);
  reminder30.setDate(reminder30.getDate() - 30);
  
  return {
    quarterEnd,
    deadline,
    reminder60,
    reminder30,
  };
}

function checkReminders(quarter) {
  const now = new Date();
  const dates = getQuarterDeadlines(quarter);
  
  const daysUntilDeadline = Math.ceil((dates.deadline - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDeadline <= 0) {
    return { level: "overdue", message: `⚠️ OVERDUE: ${quarter} registration deadline has passed!` };
  }
  if (daysUntilDeadline <= 30) {
    return { level: "urgent", message: `🔴 URGENT: Only ${daysUntilDeadline} days until ${quarter} deadline!` };
  }
  if (daysUntilDeadline <= 60) {
    return { level: "warning", message: `🟡 WARNING: ${daysUntilDeadline} days until ${quarter} deadline.` };
  }
  return { level: "ok", message: `✅ ${daysUntilDeadline} days until ${quarter} deadline.` };
}

// --- CLI ---

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let targetQuarter = getCurrentQuarter();
  let dryRun = false;
  let showReminders = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--quarter" && args[i + 1]) {
      targetQuarter = args[i + 1];
      i++;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--reminders") {
      showReminders = true;
    } else if (args[i] === "--help") {
      console.log(`
Usage: node scripts/scan-copyright-quarterly.mjs [options]

Options:
  --quarter YYYY-Qn   Target quarter (default: current)
  --dry-run           Show what would be added without writing
  --reminders         Show deadline reminders for recent quarters
  --help              Show this help

Examples:
  node scripts/scan-copyright-quarterly.mjs
  node scripts/scan-copyright-quarterly.mjs --quarter 2025-Q1
  node scripts/scan-copyright-quarterly.mjs --dry-run
  node scripts/scan-copyright-quarterly.mjs --reminders
`);
      return;
    }
  }
  
  if (showReminders) {
    console.log("\n📅 Copyright Registration Reminders\n");
    
    // Check current and previous quarter
    const now = new Date();
    const currentQ = getCurrentQuarter();
    
    // Previous quarter
    const prevDate = new Date(now);
    prevDate.setMonth(prevDate.getMonth() - 3);
    const prevYear = prevDate.getFullYear();
    const prevQuarter = Math.ceil((prevDate.getMonth() + 1) / 3);
    const prevQ = `${prevYear}-Q${prevQuarter}`;
    
    console.log(checkReminders(prevQ).message);
    console.log(checkReminders(currentQ).message);
    return;
  }
  
  // Run scanner
  try {
    await scanForQuarterlyCopyrights(targetQuarter, dryRun);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
