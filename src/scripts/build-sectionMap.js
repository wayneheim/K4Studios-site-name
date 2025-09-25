// scripts/build-sectionMap.js


import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { siteNav } from "../data/siteNav.js";  // corrected import path

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sectionMap = {};

// Recursively walk your nav tree
function traverse(nodes) {
  for (const node of nodes) {
    if (node.type === "gallery-source") {
      // node.href is like "/Galleries/.../Some-Gallery"
      const relSegments = node.href
        .split("/")
        .filter(Boolean)  // drop leading empty
        .slice(1);        // drop "Galleries"
      // Try flat and nested .mjs file locations
      const filePath1 = path.resolve(
        __dirname,
        "../data/Galleries",
        ...relSegments
      ) + ".mjs";
      const filePath2 = path.resolve(
        __dirname,
        "../data/Galleries",
        ...relSegments,
        relSegments[relSegments.length - 1] + ".mjs"
      );

      if (fs.existsSync(filePath1)) {
        sectionMap[node.href] = filePath1;
      } else if (fs.existsSync(filePath2)) {
        sectionMap[node.href] = filePath2;
      } else {
        console.warn(`⚠️  Missing data file: ${filePath1} or ${filePath2}`);
      }
    }
    if (node.children) traverse(node.children);
  }
}

traverse(siteNav);

fs.writeFileSync(
  path.resolve(__dirname, "../data/sectionImageMap.json"),
  JSON.stringify(sectionMap, null, 2)
);

console.log("✅  Built sectionImageMap.json with", Object.keys(sectionMap).length, "entries");
