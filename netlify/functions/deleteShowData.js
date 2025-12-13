// netlify/functions/deleteShowData.js
// Deletes a Picture Show and removes it from the stories index

import fs from "fs";
import path from "path";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { slug } = JSON.parse(event.body || "{}");

    if (!slug) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing slug" }) };
    }

    // Validate slug (prevent path traversal)
    if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid slug" }) };
    }

    const dataDir = path.join(process.cwd(), "src", "data", "Other", "Stories");
    const pagesDir = path.join(process.cwd(), "src", "pages", "Other", "Stories");
    const storiesPath = path.join(dataDir, "stories.mjs");

    const mjsPath = path.join(dataDir, `${slug}.mjs`);
    const astroPath = path.join(pagesDir, `${slug}.astro`);

    const deleted = [];
    const notFound = [];

    // Delete .mjs file
    try {
      if (fs.existsSync(mjsPath)) {
        fs.unlinkSync(mjsPath);
        deleted.push(`${slug}.mjs`);
        console.log("✅ Deleted:", mjsPath);
      } else {
        notFound.push(`${slug}.mjs`);
      }
    } catch (err) {
      console.error("Failed to delete .mjs:", err);
    }

    // Delete .astro file
    try {
      if (fs.existsSync(astroPath)) {
        fs.unlinkSync(astroPath);
        deleted.push(`${slug}.astro`);
        console.log("✅ Deleted:", astroPath);
      } else {
        notFound.push(`${slug}.astro`);
      }
    } catch (err) {
      console.error("Failed to delete .astro:", err);
    }

    // Remove from stories.mjs index
    try {
      if (fs.existsSync(storiesPath)) {
        let storiesContent = fs.readFileSync(storiesPath, "utf8");

        // Remove the import line for this slug
        const importVarName = slug.replace(/-/g, "");
        const importRegex = new RegExp(
          `import\\s*\\{[^}]*\\}\\s*from\\s*["']\\.\\/${slug}\\.mjs["'];?\\s*\\n?`,
          "g"
        );
        storiesContent = storiesContent.replace(importRegex, "");

        // Remove the story entry from the array
        // This handles multi-line object entries in the stories array
        const entryRegex = new RegExp(
          `\\s*\\{[^{}]*slug:\\s*["']${slug}["'][^{}]*\\},?`,
          "g"
        );
        storiesContent = storiesContent.replace(entryRegex, "");

        // Clean up any double commas or trailing commas before ]
        storiesContent = storiesContent
          .replace(/,\s*,/g, ",")
          .replace(/,\s*\]/g, "\n]")
          .replace(/\[\s*,/g, "[");

        fs.writeFileSync(storiesPath, storiesContent, "utf8");
        console.log("✅ Updated stories index (removed entry):", storiesPath);
      }
    } catch (indexErr) {
      console.error("Failed to update stories index:", indexErr);
    }

    if (deleted.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No files found to delete",
          notFound,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        deleted,
        notFound: notFound.length > 0 ? notFound : undefined,
      }),
    };
  } catch (err) {
    console.error("deleteShowData error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
