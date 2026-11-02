import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] || "dist");
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(fullPath);
    else if (/\.(?:html|js|xml)$/i.test(entry.name)) files.push(fullPath);
  }
}

await walk(root);

const violations = [];
const attributePattern = /\b(?:href|action|formaction|data-[\w-]*(?:url|href|link))\s*=\s*["']([^"']+)["']/gi;

for (const file of files) {
  const content = await readFile(file, "utf8");
  const relative = path.relative(root, file);

  for (const match of content.matchAll(attributePattern)) {
    if (/smugmug\.com/i.test(match[1])) violations.push(`${relative}: public destination ${match[1]}`);
  }

  if (/\.js$/i.test(file) && /wayne-heim\.smugmug\.com/i.test(content)) {
    violations.push(`${relative}: public JavaScript contains the legacy SmugMug site hostname`);
  }

  if (/Contact Us to Order/i.test(content)) {
    violations.push(`${relative}: public output contains the legacy Contact Us to Order flow`);
  }

  if (/mailto:info@k4studios\.com\?subject=Order(?:%20|\s)Inquiry/i.test(content)) {
    violations.push(`${relative}: public output contains a legacy email-to-order destination`);
  }
}

if (violations.length) {
  console.error(`Public checkout-link audit failed (${violations.length} finding${violations.length === 1 ? "" : "s"}):`);
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Public checkout-link audit passed across ${files.length} rendered HTML, JavaScript, and XML files.`);
