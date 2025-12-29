// netlify/functions/seriesRegistry.js
// Manages the series registry for canonical image-to-series mapping
// 
// Structure:
// - images: { "imageId:galleryPath": seriesId } - maps each occurrence to a series
// - series: { seriesId: { occurrences: [...], tiers, linkedCount, ... } }
//
// Same imageId in different galleries = same series by default
// Unlink action gives a gallery occurrence its own unique seriesId

const fs = require("fs/promises");
const path = require("path");

const REGISTRY_PATH = path.join(process.cwd(), "src/data/seriesRegistry.json");

// Generate a unique series ID
function generateSeriesId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let id = "s-";
  for (let i = 0; i < 7; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Create composite key for image+gallery
// Normalizes path to always start with / for consistency
function makeKey(imageId, galleryPath) {
  let normPath = galleryPath || "unknown";
  // Ensure path starts with / for consistency
  if (normPath !== "unknown" && !normPath.startsWith("/")) {
    normPath = "/" + normPath;
  }
  return `${imageId}:${normPath}`;
}

async function readRegistry() {
  try {
    const data = await fs.readFile(REGISTRY_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return {
        _meta: { version: "2.0" },
        images: {},
        series: {}
      };
    }
    throw err;
  }
}

async function writeRegistry(registry) {
  registry._meta = registry._meta || {};
  registry._meta.lastUpdated = new Date().toISOString();
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
}

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const registry = await readRegistry();

    // GET: Read registry or resolve a specific image
    if (event.httpMethod === "GET") {
      const imageId = event.queryStringParameters?.imageId;
      
      if (imageId) {
        // Find the series ID for this image (composite key format: imageId:galleryPath)
        let seriesId = registry.images[imageId]; // Try direct lookup first (legacy)
        
        // If not found, search for composite keys
        if (!seriesId) {
          for (const [key, sId] of Object.entries(registry.images)) {
            if (key.startsWith(imageId + ":")) {
              seriesId = sId;
              break;
            }
          }
        }
        
        const seriesMeta = seriesId ? registry.series[seriesId] : null;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            imageId,
            seriesId: seriesId || null,
            series: seriesMeta
          }),
        };
      }
      
      // Return full registry (for admin/matching utility)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(registry),
      };
    }

    // POST: Register or update series mappings
    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const { action, imageId, tiers, linkedImageIds, primarySeriesId, title, src, batch, galleryPath, excludeSizes } = body;

      switch (action) {
        case "batchRegister": {
          // Batch register multiple images in ONE atomic write (for Apply All)
          if (!batch || !Array.isArray(batch) || batch.length === 0) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing batch array" }) };
          }
          
          const results = [];
          for (const item of batch) {
            const { imageId: imgId, galleryPath: imgGalleryPath, tiers: imgTiers, title: imgTitle, src: imgSrc } = item;
            if (!imgId || !imgTiers) {
              results.push({ imageId: imgId, error: "Missing imageId or tiers" });
              continue;
            }
            
            // Store all tiers: sketch, foundation, chronicle, legend
            const storedTiers = imgTiers.filter(t => ["sketch", "foundation", "chronicle", "legend"].includes(t));
            
            const gPath = imgGalleryPath || galleryPath || "unknown";
            const occKey = makeKey(imgId, gPath);
            
            // Check if this specific occurrence is already registered
            let seriesId = registry.images[occKey];
            
            // If no storable tiers and no existing registration, skip
            if (storedTiers.length === 0 && !seriesId) {
              results.push({ imageId: imgId, skipped: true, reason: "No storable tiers" });
              continue;
            }
            
            // If no storable tiers BUT there's an existing registration, update it
            if (storedTiers.length === 0 && seriesId) {
              const series = registry.series[seriesId];
              if (series) {
                series.tiers = series.tiers?.includes("sketch") ? ["sketch"] : [];
              }
              results.push({ imageId: imgId, seriesId, tiersCleared: true });
              continue;
            }
            
            // If not registered yet, check if this imageId exists in any other gallery (to link them)
            if (!seriesId) {
              // Find any existing series with this imageId
              for (const [key, sId] of Object.entries(registry.images)) {
                if (key.startsWith(imgId + ":")) {
                  seriesId = sId;
                  break;
                }
              }
            }
            
            if (!seriesId) {
              // Create new series entry
              seriesId = generateSeriesId();
              registry.series[seriesId] = {
                primaryImageId: imgId,
                tiers: storedTiers,
                title: imgTitle || "",
                src: imgSrc || "",
                occurrences: [],
                linkedCount: 0,
                createdAt: new Date().toISOString()
              };
            }
            
            // Register this occurrence
            registry.images[occKey] = seriesId;
            
            // Add to occurrences if not already present
            const series = registry.series[seriesId];
            if (series) {
              // REPLACE tiers (not merge) - caller sends the complete current set
              series.tiers = storedTiers;
              if (!series.occurrences) series.occurrences = [];
              
              const existingOcc = series.occurrences.find(o => o.galleryPath === gPath && o.imageId === imgId);
              if (!existingOcc) {
                series.occurrences.push({
                  imageId: imgId,
                  galleryPath: gPath,
                  title: imgTitle || "",
                  src: imgSrc || ""
                });
              } else {
                // Update existing occurrence
                if (imgTitle) existingOcc.title = imgTitle;
                if (imgSrc) existingOcc.src = imgSrc;
              }
              
              series.linkedCount = series.occurrences.length;
              if (imgTitle && !series.title) series.title = imgTitle;
              if (imgSrc && !series.src) series.src = imgSrc;
            }
            
            results.push({ imageId: imgId, galleryPath: gPath, seriesId, registered: true });
          }
          
          // Single atomic write for entire batch
          await writeRegistry(registry);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: "Batch registered", count: results.filter(r => r.registered).length, results }),
          };
        }

        case "register": {
          // Register a new image for series tracking
          if (!imageId || !tiers || !Array.isArray(tiers)) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageId or tiers" }) };
          }
          
          // Store all tiers: sketch, foundation, chronicle, legend
          const storedTiers = tiers.filter(t => ["sketch", "foundation", "chronicle", "legend"].includes(t));
          
          const gPath = galleryPath || "unknown";
          const occKey = makeKey(imageId, gPath);
          
          // Check if this specific occurrence is already registered
          let seriesId = registry.images[occKey];
          
          // If no storable tiers and no existing registration, nothing to do
          if (storedTiers.length === 0 && !seriesId) {
            return { statusCode: 200, headers, body: JSON.stringify({ message: "No storable tiers, skipping registration" }) };
          }
          
          // If no storable tiers BUT there's an existing registration, update it to remove limited tiers
          if (storedTiers.length === 0 && seriesId) {
            const series = registry.series[seriesId];
            if (series) {
              // Keep only sketch tier if it was there
              series.tiers = series.tiers?.includes("sketch") ? ["sketch"] : [];
            }
            await writeRegistry(registry);
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({ message: "Tiers updated (limited tiers removed)", imageId, seriesId }),
            };
          }
          
          // If not, check if this imageId exists in any other gallery (to link them)
          if (!seriesId) {
            for (const [key, sId] of Object.entries(registry.images)) {
              if (key.startsWith(imageId + ":")) {
                seriesId = sId;
                break;
              }
            }
          }
          
          if (!seriesId) {
            // Create new series entry
            seriesId = generateSeriesId();
            registry.series[seriesId] = {
              primaryImageId: imageId,
              tiers: storedTiers,
              title: title || "",
              src: src || "",
              occurrences: [],
              linkedCount: 0,
              excludeSizes: excludeSizes || {},
              createdAt: new Date().toISOString()
            };
          }
          
          // Register this occurrence
          registry.images[occKey] = seriesId;
          
          // Add to occurrences if not already present
          const series = registry.series[seriesId];
          if (series) {
            // REPLACE tiers (not merge) - caller sends the complete current set
            series.tiers = storedTiers;
            // Update excludeSizes if provided
            if (excludeSizes !== undefined) {
              series.excludeSizes = excludeSizes;
            }
            if (!series.occurrences) series.occurrences = [];
            
            const existingOcc = series.occurrences.find(o => o.galleryPath === gPath && o.imageId === imageId);
            if (!existingOcc) {
              series.occurrences.push({
                imageId: imageId,
                galleryPath: gPath,
                title: title || "",
                src: src || ""
              });
            } else {
              if (title) existingOcc.title = title;
              if (src) existingOcc.src = src;
            }
            
            series.linkedCount = series.occurrences.length;
            if (title && !series.title) series.title = title;
            if (src && !series.src) series.src = src;
          }

          await writeRegistry(registry);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: "Registered",
              imageId,
              galleryPath: gPath,
              seriesId,
              series: registry.series[seriesId]
            }),
          };
        }

        case "updateExcludeSizes": {
          // Update only the excludeSizes for a series (by imageId and galleryPath)
          if (!imageId || !galleryPath) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageId or galleryPath" }) };
          }
          if (excludeSizes === undefined || typeof excludeSizes !== "object") {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing or invalid excludeSizes object" }) };
          }
          
          const occKey = makeKey(imageId, galleryPath);
          const seriesId = registry.images[occKey];
          
          if (!seriesId || !registry.series[seriesId]) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: "Series not found for this image" }) };
          }
          
          registry.series[seriesId].excludeSizes = excludeSizes;
          await writeRegistry(registry);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: "excludeSizes updated",
              imageId,
              seriesId,
              excludeSizes
            }),
          };
        }

        case "setEditionData": {
          // Set edition tracking data (soldBySize, printedBySize) for a series tier
          // data: { tier: "chronicle", soldBySize: {...}, printedBySize: {...} }
          if (!imageId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageId" }) };
          }
          const { tier, soldBySize, printedBySize } = body.data || {};
          if (!tier) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing tier in data" }) };
          }
          
          // Find the series for this image
          let seriesId = null;
          for (const [key, sId] of Object.entries(registry.images)) {
            if (key.startsWith(imageId + ":")) {
              seriesId = sId;
              break;
            }
          }
          
          if (!seriesId || !registry.series[seriesId]) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: "Series not found for this image" }) };
          }
          
          const series = registry.series[seriesId];
          
          // Initialize editionData if not present
          if (!series.editionData) {
            series.editionData = {};
          }
          if (!series.editionData[tier]) {
            series.editionData[tier] = {
              soldBySize: {},
              printedBySize: {},
              released: true,
              firstReleaseDate: new Date().toISOString()
            };
          }
          
          // Update the data
          if (soldBySize !== undefined) {
            series.editionData[tier].soldBySize = { ...series.editionData[tier].soldBySize, ...soldBySize };
          }
          if (printedBySize !== undefined) {
            series.editionData[tier].printedBySize = { ...series.editionData[tier].printedBySize, ...printedBySize };
          }
          
          await writeRegistry(registry);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: "Edition data updated",
              imageId,
              seriesId,
              tier,
              editionData: series.editionData[tier]
            }),
          };
        }

        case "getEditionData": {
          // Get edition data for a specific image
          if (!imageId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageId" }) };
          }
          
          // Find the series for this image
          let seriesId = null;
          for (const [key, sId] of Object.entries(registry.images)) {
            if (key.startsWith(imageId + ":")) {
              seriesId = sId;
              break;
            }
          }
          
          if (!seriesId || !registry.series[seriesId]) {
            return { statusCode: 200, headers, body: JSON.stringify({ imageId, editionData: {} }) };
          }
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              imageId,
              seriesId,
              editionData: registry.series[seriesId].editionData || {}
            }),
          };
        }

        case "unlink": {
          // Unlink a specific gallery occurrence from its series
          // This gives it a new unique seriesId (for handling SmugMug ID reuse)
          if (!imageId || !galleryPath) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageId or galleryPath" }) };
          }
          
          const occKey = makeKey(imageId, galleryPath);
          const oldSeriesId = registry.images[occKey];
          
          if (!oldSeriesId) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: "Occurrence not found in registry" }) };
          }
          
          const oldSeries = registry.series[oldSeriesId];
          if (!oldSeries || !oldSeries.occurrences || oldSeries.occurrences.length <= 1) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Cannot unlink - only one occurrence exists" }) };
          }
          
          // Find the occurrence to remove
          const occIdx = oldSeries.occurrences.findIndex(o => o.galleryPath === galleryPath && o.imageId === imageId);
          if (occIdx === -1) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: "Occurrence not found in series" }) };
          }
          
          const occ = oldSeries.occurrences[occIdx];
          
          // Remove from old series
          oldSeries.occurrences.splice(occIdx, 1);
          oldSeries.linkedCount = oldSeries.occurrences.length;
          
          // Create new series for this occurrence
          const newSeriesId = generateSeriesId();
          registry.images[occKey] = newSeriesId;
          registry.series[newSeriesId] = {
            primaryImageId: imageId,
            tiers: [...(oldSeries.tiers || [])],
            title: occ.title || "",
            src: occ.src || "",
            occurrences: [occ],
            linkedCount: 1,
            createdAt: new Date().toISOString(),
            unlinkedFrom: oldSeriesId
          };
          
          await writeRegistry(registry);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: "Unlinked",
              imageId,
              galleryPath,
              oldSeriesId,
              newSeriesId,
              oldSeriesOccurrences: oldSeries.linkedCount,
              newSeries: registry.series[newSeriesId]
            }),
          };
        }

        case "removeOccurrence": {
          // Remove an image occurrence from the registry (for when image is deleted from gallery)
          // Does NOT create a new series - just removes the occurrence entirely
          if (!imageId || !galleryPath) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageId or galleryPath" }) };
          }
          
          const occKey = makeKey(imageId, galleryPath);
          const seriesId = registry.images[occKey];
          
          if (!seriesId) {
            // Not in registry - nothing to remove
            return { statusCode: 200, headers, body: JSON.stringify({ message: "Not in registry", imageId, galleryPath }) };
          }
          
          // Remove from images map
          delete registry.images[occKey];
          
          const series = registry.series[seriesId];
          if (series && series.occurrences) {
            // Remove from occurrences array
            const occIdx = series.occurrences.findIndex(o => o.galleryPath === galleryPath && o.imageId === imageId);
            if (occIdx !== -1) {
              series.occurrences.splice(occIdx, 1);
              series.linkedCount = series.occurrences.length;
            }
            
            // If no more occurrences, delete the series entirely
            if (series.occurrences.length === 0) {
              delete registry.series[seriesId];
            }
          }
          
          await writeRegistry(registry);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: "Removed from registry",
              imageId,
              galleryPath,
              seriesId,
              seriesDeleted: !registry.series[seriesId]
            }),
          };
        }

        case "link": {
          // Link multiple images as the same artwork (deduplication)
          if (!linkedImageIds || !Array.isArray(linkedImageIds) || linkedImageIds.length < 2) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Need at least 2 imageIds to link" }) };
          }

          // Determine which series ID to keep (first one, or specified primary)
          let keepSeriesId = primarySeriesId;
          const allSeriesIds = new Set();
          
          for (const imgId of linkedImageIds) {
            const sId = registry.images[imgId];
            if (sId) allSeriesIds.add(sId);
          }

          if (!keepSeriesId) {
            // Use the first existing series ID, or create new
            keepSeriesId = allSeriesIds.values().next().value || generateSeriesId();
          }

          // Merge all tiers from all series being combined
          let mergedTiers = [];
          for (const sId of allSeriesIds) {
            if (registry.series[sId]) {
              mergedTiers = [...mergedTiers, ...registry.series[sId].tiers];
            }
          }
          mergedTiers = [...new Set(mergedTiers)];

          // Point all images to the keeper series
          for (const imgId of linkedImageIds) {
            registry.images[imgId] = keepSeriesId;
          }

          // Update or create the keeper series
          registry.series[keepSeriesId] = {
            primaryImageId: linkedImageIds[0],
            linkedCount: linkedImageIds.length,
            tiers: mergedTiers.length > 0 ? mergedTiers : ["chronicle"],
            createdAt: registry.series[keepSeriesId]?.createdAt || new Date().toISOString(),
            linkedAt: new Date().toISOString()
          };

          // Remove orphaned series entries
          for (const sId of allSeriesIds) {
            if (sId !== keepSeriesId) {
              delete registry.series[sId];
            }
          }

          await writeRegistry(registry);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: "Linked",
              seriesId: keepSeriesId,
              linkedImageIds,
              series: registry.series[keepSeriesId]
            }),
          };
        }

        case "unlink": {
          // Remove an image from a linked group (creates new series for it)
          if (!imageId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing imageId" }) };
          }

          const oldSeriesId = registry.images[imageId];
          if (!oldSeriesId) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Image not in registry" }) };
          }

          const oldSeries = registry.series[oldSeriesId];
          if (!oldSeries || oldSeries.linkedCount <= 1) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Image is not linked to others" }) };
          }

          // Create new series for this image
          const newSeriesId = generateSeriesId();
          registry.images[imageId] = newSeriesId;
          registry.series[newSeriesId] = {
            primaryImageId: imageId,
            linkedCount: 1,
            tiers: [...oldSeries.tiers],
            createdAt: new Date().toISOString()
          };

          // Update old series count
          oldSeries.linkedCount--;
          
          // If unlinked image was the primary, pick a new primary
          if (oldSeries.primaryImageId === imageId) {
            const remaining = Object.entries(registry.images)
              .find(([imgId, sId]) => sId === oldSeriesId && imgId !== imageId);
            if (remaining) {
              oldSeries.primaryImageId = remaining[0];
            }
          }

          await writeRegistry(registry);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: "Unlinked",
              imageId,
              newSeriesId,
              oldSeriesId
            }),
          };
        }

        case "linkSeries": {
          // Link/merge multiple series entries into one (for merging different image IDs as same artwork)
          const { seriesIds } = body;
          if (!seriesIds || !Array.isArray(seriesIds) || seriesIds.length < 2) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Need at least 2 seriesIds to link" }) };
          }
          
          // Validate all series exist
          const validSeriesIds = seriesIds.filter(sId => registry.series[sId]);
          if (validSeriesIds.length < 2) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Need at least 2 valid series to link" }) };
          }
          
          // Use first series as the keeper
          const keepSeriesId = validSeriesIds[0];
          const keepSeries = registry.series[keepSeriesId];
          
          // Collect all data from series being merged
          let allTiers = [...(keepSeries.tiers || [])];
          let allOccurrences = [...(keepSeries.occurrences || [])];
          
          for (let i = 1; i < validSeriesIds.length; i++) {
            const mergeSeriesId = validSeriesIds[i];
            const mergeSeries = registry.series[mergeSeriesId];
            
            // Merge tiers
            allTiers = [...allTiers, ...(mergeSeries.tiers || [])];
            
            // Merge occurrences
            if (mergeSeries.occurrences) {
              for (const occ of mergeSeries.occurrences) {
                // Check if already have this occurrence
                const exists = allOccurrences.some(o => o.imageId === occ.imageId && o.galleryPath === occ.galleryPath);
                if (!exists) {
                  allOccurrences.push(occ);
                }
              }
            }
            
            // Update all image mappings from merged series to point to keeper
            for (const [key, sId] of Object.entries(registry.images)) {
              if (sId === mergeSeriesId) {
                registry.images[key] = keepSeriesId;
              }
            }
            
            // Delete the merged series
            delete registry.series[mergeSeriesId];
          }
          
          // Update keeper series with merged data
          keepSeries.tiers = [...new Set(allTiers)];
          keepSeries.occurrences = allOccurrences;
          keepSeries.linkedCount = allOccurrences.length;
          keepSeries.linkedAt = new Date().toISOString();
          keepSeries.mergedFrom = validSeriesIds.slice(1);
          
          // Use best title/src available
          if (!keepSeries.title) {
            for (const occ of allOccurrences) {
              if (occ.title) {
                keepSeries.title = occ.title;
                break;
              }
            }
          }
          if (!keepSeries.src) {
            for (const occ of allOccurrences) {
              if (occ.src) {
                keepSeries.src = occ.src;
                break;
              }
            }
          }
          
          await writeRegistry(registry);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              message: "Series linked successfully",
              keepSeriesId,
              mergedCount: validSeriesIds.length,
              totalOccurrences: allOccurrences.length,
              series: keepSeries
            }),
          };
        }

        default:
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    console.error("[seriesRegistry] Error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
