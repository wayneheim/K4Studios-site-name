// netlify/functions/editionState.js
// Manages the edition state database (read/write/lock operations)

const fs = require("fs/promises");
const path = require("path");

// Same pattern as updateGalleryItem.js which works
const EDITION_STATE_PATH = path.join(process.cwd(), "src/data/editionState.json");
const SERIES_REGISTRY_PATH = path.join(process.cwd(), "src/data/seriesRegistry.json");

// Series definitions with their edition limits
const SERIES_DEFINITIONS = {
  sketch: { limit: null, description: "Open edition, 5×7 only" },
  foundation: { limit: null, description: "Open edition, larger formats" },
  chronicle: { limit: 250, description: "Limited edition of 250" },
  legend: { limit: 12, description: "Limited edition of 12" },
  engrained: { limit: 50, description: "Limited edition of 50" },
};

// Read series registry to resolve canonical IDs
async function readSeriesRegistry() {
  try {
    const data = await fs.readFile(SERIES_REGISTRY_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return { images: {}, series: {} };
    }
    throw err;
  }
}

// Resolve imageId to canonical series ID (or return original if not registered)
function resolveCanonicalId(imageId, registry) {
  return registry.images?.[imageId] || imageId;
}

async function readEditionState() {
  try {
    const data = await fs.readFile(EDITION_STATE_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return { _meta: { version: "1.0", lastUpdated: null } };
    }
    throw err;
  }
}

async function writeEditionState(state) {
  state._meta = state._meta || {};
  state._meta.lastUpdated = new Date().toISOString();
  await fs.writeFile(EDITION_STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function makeKey(imageId, series) {
  return `${imageId}:${series}`;
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Debug endpoint
  if (event.queryStringParameters?.debug === "1") {
    try {
      const exists = await fs.access(EDITION_STATE_PATH).then(() => true).catch(() => false);
      const content = exists ? await fs.readFile(EDITION_STATE_PATH, "utf8") : "FILE NOT FOUND";
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          debug: true,
          path: EDITION_STATE_PATH,
          cwd: process.cwd(),
          exists,
          content: content.substring(0, 500),
        }, null, 2),
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  try {
    const state = await readEditionState();
    const registry = await readSeriesRegistry();

    // GET: Read edition state for an image or all
    if (event.httpMethod === "GET") {
      const imageId = event.queryStringParameters?.imageId;
      
      if (imageId) {
        // Resolve to canonical series ID if linked
        const canonicalId = resolveCanonicalId(imageId, registry);
        
        // Return all series states for this image (using canonical ID)
        const imageStates = {};
        for (const [key, value] of Object.entries(state)) {
          if (key.startsWith(`${canonicalId}:`)) {
            const series = key.split(":")[1];
            imageStates[series] = value;
          }
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            imageId, 
            canonicalId,
            states: imageStates, 
            definitions: SERIES_DEFINITIONS 
          }),
        };
      }
      
      // Return all (for admin/debugging)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ state, definitions: SERIES_DEFINITIONS }),
      };
    }

    // POST: Update edition state
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { action, imageId, series, data } = body;

      if (!imageId || !series) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageId or series" }) };
      }

      // Resolve to canonical series ID if linked
      const canonicalId = resolveCanonicalId(imageId, registry);
      const key = makeKey(canonicalId, series);
      const existing = state[key];

      switch (action) {
        case "create": {
          // Create new edition state (only if doesn't exist)
          if (existing) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Edition state already exists" }) };
          }
          
          const seriesDef = SERIES_DEFINITIONS[series];
          if (!seriesDef) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown series: ${series}` }) };
          }

          state[key] = {
            imageId: canonicalId,  // Store canonical ID, not original
            originalImageId: imageId !== canonicalId ? imageId : undefined,  // Track original if different
            series,
            editionLimit: seriesDef.limit,
            sold: 0,  // Start at 0 (no editions sold yet)
            released: true,  // Auto-release on creation
            firstReleaseDate: new Date().toISOString(),
          };
          
          await writeEditionState(state);
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, canonicalId, state: state[key] }) };
        }

        case "release": {
          // Mark edition as released (enables sales)
          if (!existing) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: "Edition state not found" }) };
          }
          if (existing.released) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Already released" }) };
          }

          existing.released = true;
          existing.firstReleaseDate = new Date().toISOString();
          
          await writeEditionState(state);
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, state: existing }) };
        }

        case "recordSale": {
          // Record a sale (increment sold count)
          if (!existing) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: "Edition state not found" }) };
          }
          if (!existing.released) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Cannot sell unreleased edition" }) };
          }
          if (existing.editionLimit && existing.sold >= existing.editionLimit) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Edition sold out" }) };
          }

          existing.sold = (existing.sold || 0) + 1;
          
          await writeEditionState(state);
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, state: existing }) };
        }

        case "delete": {
          // Delete edition state (only if sold === 0)
          if (!existing) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: "Edition state not found" }) };
          }
          if (existing.sold > 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Cannot delete edition with sales" }) };
          }

          delete state[key];
          
          await writeEditionState(state);
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, deleted: key }) };
        }

        case "setSold": {
          // Manually set sold count (for correcting pre-existing inventory)
          if (!existing) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: "Edition state not found" }) };
          }
          
          const newSold = parseInt(data?.sold, 10);
          if (isNaN(newSold) || newSold < 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid sold count" }) };
          }
          if (existing.editionLimit && newSold > existing.editionLimit) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: `Cannot exceed edition limit of ${existing.editionLimit}` }) };
          }

          existing.sold = newSold;
          // Mark as released if we're setting a non-zero count
          if (newSold > 0 && !existing.released) {
            existing.released = true;
            existing.firstReleaseDate = existing.firstReleaseDate || new Date().toISOString();
          }
          
          await writeEditionState(state);
          return { statusCode: 200, headers, body: JSON.stringify({ ok: true, state: existing }) };
        }

        case "checkLock": {
          // Check if image has any sales (for status change validation)
          let totalSold = 0;
          for (const [k, v] of Object.entries(state)) {
            if (k.startsWith(`${imageId}:`)) {
              totalSold += v.sold || 0;
            }
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              imageId, 
              totalSold,
              isLocked: totalSold > 0,
              canRemove: totalSold === 0,
              canRetire: true,
            }),
          };
        }

        default:
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("[editionState] Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
