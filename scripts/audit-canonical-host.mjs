import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const roots = ["dist", "public"].map((dir) => path.join(repoRoot, dir));
const extensions = new Set([".html", ".xml", ".json"]);
const bareHostPattern = /https?:\/\/k4studios\.com\b|https:\\\/\\\/k4studios\.com\b/gi;
const allowedFiles = new Set([
  path.normalize("public/image-manifest.json"),
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

const findings = [];

for (const root of roots) {
  for (const file of walk(root)) {
    const relativePath = path.normalize(path.relative(repoRoot, file));
    if (allowedFiles.has(relativePath)) continue;

    const text = fs.readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      bareHostPattern.lastIndex = 0;
      if (bareHostPattern.test(lines[index])) {
        findings.push(`${relativePath}:${index + 1}`);
        if (findings.length >= 40) break;
      }
    }
  }
}

if (findings.length > 0) {
  console.error("Bare K4 host found in rendered public output. Use https://www.k4studios.com for canonical/entity signals.");
  for (const finding of findings) console.error(`  ${finding}`);
  process.exit(1);
}

console.log("Canonical host audit passed: rendered public output uses https://www.k4studios.com.");
