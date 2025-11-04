import fs from "fs";
import path from "path";

export async function handler(event) {
  try {
    const { filename, content, astroFilename, astroContent } = JSON.parse(event.body || "{}");

    if (!filename || !content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing filename or content" }),
      };
    }

    // Always resolve relative to your project root
    const dataDir = path.join(process.cwd(), "src", "data", "Other", "Stories");
    const pagesDir = path.join(process.cwd(), "src", "pages", "Other", "Stories");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.mkdirSync(pagesDir, { recursive: true });

    const mjsPath = path.join(dataDir, filename);
    fs.writeFileSync(mjsPath, content, "utf8");

    let astroPath = null;
    if (astroFilename && astroContent) {
      astroPath = path.join(pagesDir, astroFilename);
      fs.writeFileSync(astroPath, astroContent, "utf8");
    }

    console.log("✅ Saved Picture Show:", mjsPath);
    if (astroPath) console.log("✅ Saved Astro Viewer:", astroPath);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, mjsPath, astroPath }),
    };
  } catch (err) {
    console.error("❌ saveShowData.js failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
