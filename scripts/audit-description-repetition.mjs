import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const MIN_HITS = Number.parseInt(args.find((arg) => arg.startsWith("--min="))?.split("=")[1] || "5", 10);
const JSON_OUT = args.find((arg) => arg.startsWith("--json="))?.split("=").slice(1).join("=");
const ROOTS = args
  .filter((arg) => arg.startsWith("--root="))
  .map((arg) => path.resolve(process.cwd(), arg.split("=").slice(1).join("=")));

const DEFAULT_ROOTS = [
  path.resolve(process.cwd(), "src/data/Galleries"),
  path.resolve(process.cwd(), "src/data/Other/K4-Select-Series"),
];

const SEARCH_ROOTS = ROOTS.length ? ROOTS : DEFAULT_ROOTS;
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

function unescapeDescription(value) {
  return String(value || "")
    .replace(/\\r\\n/g, " ")
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(value) {
  return unescapeDescription(value)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 70)
    .filter((sentence) => !/^copyright\b/i.test(sentence))
    .filter((sentence) => !/^©|^Â©/.test(sentence));
}

function extractDescriptionBlocks(fileContent) {
  const blocks = [];
  const descriptionPattern = /(["']description["']\s*:\s*)(["'`])([\s\S]*?)\2/g;
  for (const match of fileContent.matchAll(descriptionPattern)) {
    blocks.push({
      start: match.index,
      text: match[3],
    });
  }
  return blocks;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

const files = SEARCH_ROOTS.flatMap((root) => walk(root));
const perFile = [];
const globalSentences = new Map();

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const relativeFile = path.relative(process.cwd(), file);
  const sentenceMap = new Map();

  for (const block of extractDescriptionBlocks(content)) {
    const line = lineNumberAt(content, block.start);
    for (const sentence of splitSentences(block.text)) {
      const key = sentence.toLowerCase();
      if (!sentenceMap.has(key)) sentenceMap.set(key, { sentence, hits: [] });
      sentenceMap.get(key).hits.push(line);

      if (!globalSentences.has(key)) {
        globalSentences.set(key, { sentence, files: new Map(), total: 0 });
      }
      const globalEntry = globalSentences.get(key);
      globalEntry.total += 1;
      globalEntry.files.set(relativeFile, (globalEntry.files.get(relativeFile) || 0) + 1);
    }
  }

  const repeated = [...sentenceMap.values()]
    .filter((entry) => entry.hits.length >= MIN_HITS)
    .sort((a, b) => b.hits.length - a.hits.length)
    .map((entry) => ({
      sentence: entry.sentence,
      count: entry.hits.length,
      sampleLines: entry.hits.slice(0, 8),
    }));

  if (repeated.length) {
    perFile.push({
      file: relativeFile,
      repeated,
    });
  }
}

const crossFile = [...globalSentences.values()]
  .filter((entry) => entry.total >= MIN_HITS && entry.files.size > 1)
  .sort((a, b) => b.total - a.total)
  .map((entry) => ({
    sentence: entry.sentence,
    total: entry.total,
    files: [...entry.files.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([file, count]) => ({ file, count })),
  }));

const report = {
  generatedAt: new Date().toISOString(),
  minHits: MIN_HITS,
  roots: SEARCH_ROOTS.map((root) => path.relative(process.cwd(), root)),
  filesScanned: files.length,
  filesWithRepeatedSentences: perFile.length,
  perFile,
  crossFile,
};

if (JSON_OUT) {
  writeFileSync(path.resolve(process.cwd(), JSON_OUT), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

console.log(`Scanned ${report.filesScanned} production data files.`);
console.log(`Files with repeated full sentences >= ${MIN_HITS}: ${report.filesWithRepeatedSentences}`);
console.log("");

for (const fileEntry of perFile.slice(0, 40)) {
  console.log(fileEntry.file);
  for (const entry of fileEntry.repeated.slice(0, 12)) {
    console.log(`  ${entry.count}x lines ${entry.sampleLines.join(", ")} :: ${entry.sentence}`);
  }
  console.log("");
}

if (crossFile.length) {
  console.log("Cross-file repeats:");
  for (const entry of crossFile.slice(0, 25)) {
    console.log(`  ${entry.total}x / ${entry.files.length} files :: ${entry.sentence}`);
    for (const file of entry.files.slice(0, 5)) {
      console.log(`    ${file.count}x ${file.file}`);
    }
  }
}
