const fs = require("fs/promises");
const path = require("path");

const REGISTRY_PATH = path.join(process.cwd(), "src/data/contentClassificationRegistry.json");
const VALID_CLASSIFICATIONS = new Set(["oim", "scout"]);

function normalizeGalleryPath(galleryPath = "") {
  const normalized = String(galleryPath).replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function makeKey(imageId, galleryPath) {
  return `${imageId}:${normalizeGalleryPath(galleryPath)}`;
}

async function readRegistry() {
  try {
    return JSON.parse(await fs.readFile(REGISTRY_PATH, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return { _meta: { version: "1.0" }, images: {} };
    }
    throw error;
  }
}

async function writeRegistry(registry) {
  registry._meta = registry._meta || { version: "1.0" };
  registry._meta.lastUpdated = new Date().toISOString();
  await fs.writeFile(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate",
  };

  if (event.httpMethod === "GET") {
    try {
      return { statusCode: 200, headers, body: JSON.stringify(await readRegistry()) };
    } catch (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const { imageId, galleryPath, classification } = JSON.parse(event.body || "{}");
    if (!imageId || !galleryPath) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageId or galleryPath" }) };
    }
    if (classification != null && !VALID_CLASSIFICATIONS.has(classification)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid classification" }) };
    }

    const registry = await readRegistry();
    registry.images = registry.images || {};
    const key = makeKey(imageId, galleryPath);

    if (classification == null) {
      delete registry.images[key];
    } else {
      registry.images[key] = {
        classification,
        updatedAt: new Date().toISOString(),
      };
    }

    await writeRegistry(registry);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, key, classification: classification || null }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
