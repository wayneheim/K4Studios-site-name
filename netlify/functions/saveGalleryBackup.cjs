const fs = require("fs/promises");
const path = require("path");

const ALLOWED_ROOTS = ["src/data/Galleries", "src/pages/Other", "src/data/Other"];
const BACKUP_DIR = path.join(process.cwd(), "local-backups", "gallery-editor");

function resolveDataset(datasetPath) {
  const relativePath = String(datasetPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const allowed = ALLOWED_ROOTS.some((root) => relativePath.startsWith(`${root}/`));
  if (!allowed || relativePath.split("/").includes("..") || !relativePath.endsWith(".mjs")) {
    throw new Error("Invalid gallery dataset path");
  }
  return path.join(process.cwd(), relativePath);
}

function safeFilename(filename) {
  const name = path.basename(String(filename || ""));
  if (!name || name.length > 180 || !/^[a-zA-Z0-9 ._-]+\.mjs$/.test(name)) {
    throw new Error("Invalid backup filename");
  }
  return name;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { datasetPath, filename } = JSON.parse(event.body || "{}");
    const sourcePath = resolveDataset(datasetPath);
    const backupName = safeFilename(filename);
    const backupPath = path.join(BACKUP_DIR, backupName);

    await fs.mkdir(BACKUP_DIR, { recursive: true });
    await fs.copyFile(sourcePath, backupPath);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({
        ok: true,
        filename: backupName,
        relativePath: `local-backups/gallery-editor/${backupName}`,
      }),
    };
  } catch (error) {
    console.error("[saveGalleryBackup]", error);
    return { statusCode: 500, body: error.message };
  }
};
