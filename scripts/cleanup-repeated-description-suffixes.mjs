import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const MIN_HITS = Number.parseInt(args.find((arg) => arg.startsWith("--min="))?.split("=")[1] || "5", 10);
const LIMIT_ARG = args.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number.parseInt(LIMIT_ARG.split("=")[1], 10) : Infinity;
const FILE_ARGS = args
  .filter((arg) => arg.startsWith("--file="))
  .map((arg) => path.resolve(process.cwd(), arg.split("=").slice(1).join("=")));

const DEFAULT_ROOTS = [
  path.resolve(process.cwd(), "src/data/Galleries"),
  path.resolve(process.cwd(), "src/data/Other/K4-Select-Series"),
];

const SKIP_PATH_PARTS = new Set([
  "old-galleries",
  "backup",
  "backups",
  "galleryMaps",
  "doorway",
  "hybrid-hubs",
]);

function walk(dir, files = []) {
  let entries = [];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const parts = full.split(/[\\/]/);
    if (parts.some((part) => SKIP_PATH_PARTS.has(part))) continue;

    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && /\.(mjs|ts|js)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

function parseGalleryData(fileContent) {
  const match = fileContent.match(/export const galleryData = (\[[\s\S]*\]);?\s*$/);
  if (!match) return null;
  return new Function(`return ${match[1]}`)();
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

function isCopyrightParagraph(value) {
  return /^(?:\u00a9|Â©|Copyright\b)/i.test(String(value || "").trim());
}

function copyrightSuffix(value) {
  const match = String(value || "").match(/(\s*(?:\u00a9|Â©)\s*Wayne Heim\s*)$/i);
  return match ? match[1].trim() : "";
}

function sentenceParts(paragraph) {
  const parts = [];
  const pattern = /[^.!?]+[.!?]+(?:["')\]]+)?/g;
  for (const match of paragraph.matchAll(pattern)) {
    parts.push({
      text: normalizeText(match[0]),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return parts;
}

function descriptionSentences(description) {
  return String(description || "")
    .split(/\n\n+/)
    .filter((paragraph) => !isCopyrightParagraph(paragraph))
    .flatMap((paragraph) => sentenceParts(paragraph).map((part) => part.text))
    .filter((sentence) => sentence.length >= 70);
}

function repeatedSentenceMap(galleryData) {
  const counts = new Map();
  for (const image of galleryData) {
    if (!image || typeof image.description !== "string") continue;
    for (const sentence of descriptionSentences(image.description)) {
      const key = sentence.toLowerCase();
      if (!counts.has(key)) counts.set(key, { sentence, count: 0 });
      counts.get(key).count += 1;
    }
  }
  return counts;
}

function cleanupDescription(description, repeatedKeys) {
  const paragraphs = String(description || "").split(/\n\n+/);
  const removed = [];
  let sawFirstDescriptiveSentence = false;

  const cleanedParagraphs = paragraphs.map((paragraph) => {
    if (isCopyrightParagraph(paragraph)) return paragraph.trim();

    const copyright = copyrightSuffix(paragraph);
    const workingParagraph = copyright
      ? paragraph.slice(0, paragraph.lastIndexOf(copyright)).trim()
      : paragraph;
    const parts = sentenceParts(workingParagraph);
    if (!parts.length) return normalizeText([workingParagraph, copyright].filter(Boolean).join(" "));

    const kept = [];
    for (const part of parts) {
      const key = part.text.toLowerCase();
      const isFirstDescriptiveSentence = !sawFirstDescriptiveSentence;
      sawFirstDescriptiveSentence = true;

      if (!isFirstDescriptiveSentence && repeatedKeys.has(key)) {
        removed.push(part.text);
        continue;
      }
      kept.push(part.text);
    }

    return normalizeText([kept.join(" "), copyright].filter(Boolean).join(" "));
  });

  return {
    description: cleanedParagraphs.filter(Boolean).join("\n\n"),
    removed,
  };
}

function validate(before, after, removed) {
  const issues = [];
  const firstParagraph = String(after || "").split(/\n\n+/).find((p) => !isCopyrightParagraph(p)) || "";
  if (removed.length && !firstParagraph.trim()) issues.push("empty descriptive paragraph");
  if (/\b(and|or|but|while|where|with|as)\s*$/i.test(firstParagraph)) issues.push("dangling connector");
  if (/[,;:]\s*$/.test(firstParagraph)) issues.push("dangling punctuation");
  if (/\s{2,}/.test(firstParagraph)) issues.push("double spaces");
  if (/\s+[.,;:!?]/.test(firstParagraph)) issues.push("space before punctuation");
  if (/\u00a9|Â©|Copyright/i.test(before) && !/\u00a9|Â©|Copyright/i.test(after)) issues.push("copyright removed");
  return issues;
}

function rebuildFile(galleryData) {
  return `// Auto-generated by GalleryOrderer - review & commit
export const galleryData = ${JSON.stringify(galleryData, null, 2)};
`;
}

const files = FILE_ARGS.length ? FILE_ARGS : DEFAULT_ROOTS.flatMap((root) => walk(root));
const fileReports = [];
let totalChanges = 0;
let totalRemoved = 0;
let totalIssues = 0;

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const galleryData = parseGalleryData(content);
  if (!galleryData) continue;

  const repeated = [...repeatedSentenceMap(galleryData).values()]
    .filter((entry) => entry.count >= MIN_HITS)
    .map((entry) => entry.sentence.toLowerCase());
  const repeatedKeys = new Set(repeated);
  if (!repeatedKeys.size) continue;

  const changes = [];
  for (const image of galleryData) {
    if (!image || typeof image.description !== "string") continue;
    if (totalChanges >= LIMIT) break;

    const before = image.description;
    const result = cleanupDescription(before, repeatedKeys);
    if (!result.removed.length || result.description === before) continue;

    const issues = validate(before, result.description, result.removed);
    changes.push({
      id: image.id,
      title: image.title,
      before,
      after: result.description,
      removed: result.removed,
      issues,
    });
    totalChanges += 1;
    totalRemoved += result.removed.length;
    totalIssues += issues.length;
  }

  if (!changes.length) continue;

  fileReports.push({
    file,
    repeatedSentenceCount: repeatedKeys.size,
    changes,
  });

  if (APPLY && totalIssues === 0) {
    for (const change of changes) {
      const image = galleryData.find((entry) => entry?.id === change.id);
      if (image) image.description = change.after;
    }
    writeFileSync(file, rebuildFile(galleryData), "utf8");
  }
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
console.log(`Minimum repeat count: ${MIN_HITS}`);
console.log(`Files changed: ${fileReports.length}`);
console.log(`Image descriptions changed: ${totalChanges}`);
console.log(`Repeated suffix sentences removed: ${totalRemoved}`);
console.log(`Validation issues: ${totalIssues}`);
console.log("");

for (const report of fileReports) {
  console.log(path.relative(process.cwd(), report.file));
  console.log(`  repeated sentence candidates: ${report.repeatedSentenceCount}`);
  console.log(`  descriptions changed: ${report.changes.length}`);
  for (const change of report.changes.slice(0, 5)) {
    const beforeFirst = String(change.before).split(/\n\n+/)[0];
    const afterFirst = String(change.after).split(/\n\n+/)[0];
    console.log(`  [${change.id}] ${change.title || "(untitled)"} :: removed ${change.removed.length}`);
    if (change.issues.length) console.log(`    issues: ${change.issues.join("; ")}`);
    console.log(`    before: ${normalizeText(beforeFirst)}`);
    console.log(`    after:  ${normalizeText(afterFirst)}`);
  }
  if (report.changes.length > 5) {
    console.log(`  ... ${report.changes.length - 5} more`);
  }
  console.log("");
}

if (APPLY && totalIssues > 0) {
  console.log("Refused to apply because validation issues were found.");
  process.exit(1);
}

if (!APPLY) {
  console.log("Dry run only. Re-run with --apply to write changes.");
}
