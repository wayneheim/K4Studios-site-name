import fs from "fs";
import path from "path";

export async function handler(event) {
  try {
    const { filename, content, astroFilename, astroContent } = JSON.parse(event.body || "{}");

    if (!filename || !content) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing filename or content" }) };
    }

    // Always write locally (intended usage: run the builder locally)
    // Netlify prod functions cannot persist files; if this runs in such an env, return a helpful error.
    try {
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

      console.log("✅ Saved locally:", mjsPath);
      if (astroPath) console.log("✅ Saved locally:", astroPath);
      return { statusCode: 200, body: JSON.stringify({ ok: true, target: "local", mjsPath, astroPath }) };
    } catch (writeErr) {
      console.error("Local write failed (read-only env?):", writeErr);
      return { statusCode: 403, body: JSON.stringify({ error: "Local write not permitted in this environment. Please run the builder locally to save .mjs/.astro to the repo." }) };
    }
  } catch (err) {
    console.error("saveShowData error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
