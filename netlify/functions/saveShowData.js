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

      // Update the stories index
      try {
        const storiesPath = path.join(dataDir, "stories.mjs");
        let storiesContent = fs.readFileSync(storiesPath, "utf8");

        const slug = filename.replace('.mjs', '');
        
        // Convert slug to camelCase variable name (e.g., "The-Cost-of-the-Journey" -> "theCostOfTheJourney")
        const toCamelCase = (str) => {
          return str
            .split('-')
            .map((word, idx) => {
              if (idx === 0) return word.toLowerCase();
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join('');
        };
        
        const baseName = toCamelCase(slug);
        const metaVarName = baseName + 'Meta';
        const dataVarName = baseName + 'Data';

        // Check if the story is already in the index
        if (!storiesContent.includes(`slug: "${slug}"`)) {
          // Add the import line after the last existing import
          const importLine = `import { storyMeta as ${metaVarName}, storyData as ${dataVarName} } from "./${filename}";`;
          
          // Find the last import line and add after it
          const lastImportMatch = storiesContent.match(/^import .* from "\.\/.*\.mjs";$/gm);
          if (lastImportMatch && lastImportMatch.length > 0) {
            const lastImport = lastImportMatch[lastImportMatch.length - 1];
            storiesContent = storiesContent.replace(
              lastImport,
              lastImport + '\n' + importLine
            );
          }

          // Create the new story entry
          const newStoryEntry = `
  {
    slug: "${slug}",
    title: ${metaVarName}.showTitle,
    date: ${metaVarName}.savedAt ? new Date(${metaVarName}.savedAt).toISOString().split('T')[0] : "${new Date().toISOString().split('T')[0]}",
    excerpt: ${metaVarName}.description,
    cover: getFirstSlideThumbnail(${dataVarName}),
    keywords: ${metaVarName}.keywords,
    alt: ${metaVarName}.alt
  },`;

          // Add the new entry at the beginning of the stories array (newest first)
          storiesContent = storiesContent.replace(
            /export const stories = \[/,
            `export const stories = [${newStoryEntry}`
          );

          fs.writeFileSync(storiesPath, storiesContent, "utf8");
          console.log("✅ Updated stories index:", storiesPath);
        } else {
          console.log("ℹ️ Story already exists in index, skipping update");
        }
      } catch (indexErr) {
        console.error("Failed to update stories index:", indexErr);
        // Don't fail the whole operation for index update issues
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
