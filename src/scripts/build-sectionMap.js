// scripts/build-sectionMap.js

import fs from "fs";
import path from "path";
import siteNav from "../src/data/siteNav.js";  // adjust extension if needed

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
      // build path to your .mjs file
      const filePath = path.resolve(
        __dirname,
        "../src/data/Galleries",
        ...relSegments
      ) + ".mjs";

      if (fs.existsSync(filePath)) {
        sectionMap[node.href] = filePath;
      } else {
        console.warn(`⚠️  Missing data file: ${filePath}`);
      }
    }
    if (node.children) traverse(node.children);
  }
}

traverse(siteNav);

fs.writeFileSync(
  path.resolve(__dirname, "../src/data/sectionImageMap.json"),
  JSON.stringify(sectionMap, null, 2)
);

console.log("✅  Built sectionImageMap.json with", Object.keys(sectionMap).length, "entries");
