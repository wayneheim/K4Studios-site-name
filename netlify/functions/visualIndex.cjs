// netlify/functions/visualIndex.js
// Generates and stores dHash (difference hash) for visual similarity detection
// Called when images are saved, or batch-processed for existing images

const fs = require("fs/promises");
const path = require("path");
const https = require("https");
const http = require("http");

// Sharp is intentionally not bundled into Netlify functions. Manual Netlify
// deploys run from Windows here, and native sharp binaries can mismatch the
// Linux function runtime. Visual indexing fails gracefully when sharp is absent.
const sharp = null;

const VISUAL_INDEX_PATH = path.join(process.cwd(), "src/data/visualIndex.json");

/**
 * Fetch image as buffer from URL
 */
async function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    
    protocol.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        return fetchImageBuffer(res.headers.location).then(resolve).catch(reject);
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        return;
      }
      
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * Simple BMP/JPEG/PNG dimension extraction (basic, for aspect ratio)
 * Returns { width, height } or null
 */
function getImageDimensions(buffer) {
  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
  
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      if (marker === 0xc0 || marker === 0xc2) { // SOF0 or SOF2
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      const segmentLength = buffer.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }
  }
  
  return null;
}

/**
 * Compute proper dHash (difference hash) using Sharp-decoded grayscale pixels
 * This is a perceptual hash that's robust to resize/compression
 * Returns a 64-bit binary string
 */
async function computeDHashWithSharp(buffer) {
  if (!sharp) {
    throw new Error("Sharp is required for visual indexing");
  }
  
  try {
    // Resize to 9x8 grayscale for difference hash
    // dHash REQUIRES inside (preserve aspect) + cubic kernel (smooth gradients)
    // This is the literature-standard preprocessing for perceptual hashing
    const { data, info } = await sharp(buffer)
      .resize(9, 8, {
        fit: 'inside',
        kernel: sharp.kernel.cubic
      })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const width = info.width;
    const height = info.height;
    
    // With 'inside' fit, one dimension may be smaller
    if (width < 2 || height < 1) {
      throw new Error(`dHash image too small: ${width}x${height}`);
    }
    
    // Compare adjacent horizontal pixels to generate hash
    // Pad to 64 bits for consistent comparison
    let hash = "";
    for (let y = 0; y < height && hash.length < 64; y++) {
      for (let x = 0; x < width - 1 && hash.length < 64; x++) {
        const left = data[y * width + x];
        const right = data[y * width + x + 1];
        hash += left < right ? "1" : "0";
      }
    }
    // Pad with zeros if needed (very narrow images)
    while (hash.length < 64) hash += "0";
    return hash;
  } catch (err) {
    throw new Error(`dHash computation failed: ${err.message}`);
  }
}

/**
 * Extract RGB pixels using Sharp (proper decoding)
 * Returns array of {r, g, b} objects from decoded, resized pixels
 */
async function extractPixelSamplesWithSharp(buffer) {
  if (!sharp) {
    throw new Error("Sharp is required for color analysis");
  }
  
  try {
    // Decode → Convert to sRGB → Resize to 128px → Get raw pixels
    // Using 'contain' with neutral gray padding - preserves full image, gray is ignored by hue logic
    const { data, info } = await sharp(buffer)
      .toColorspace('srgb')           // Ensure consistent sRGB colorspace
      .resize(128, 128, {
        fit: 'contain',
        background: { r: 128, g: 128, b: 128 }  // Neutral gray padding
      })
      .removeAlpha()                  // Strip alpha for consistent RGB
      .raw()                          // Get raw pixel buffer
      .toBuffer({ resolveWithObject: true });
    
    const pixels = [];
    for (let i = 0; i < data.length; i += 3) {
      pixels.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2]
      });
    }
    return pixels;
  } catch (err) {
    console.warn("[visualIndex] Sharp pixel extraction failed:", err.message);
    return null;
  }
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s, l };
}

/**
 * Quantize a color to reduce palette (for dominant color extraction)
 * Using 8 levels for better color fidelity
 */
function quantizeColor(r, g, b, levels = 8) {
  const step = 256 / levels;
  return {
    r: Math.floor(r / step) * step + step / 2,
    g: Math.floor(g / step) * step + step / 2,
    b: Math.floor(b / step) * step + step / 2
  };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

/**
 * Compute color analysis from pixel samples
 * Returns: dominantColors, warmCoolRatio, saturationAvg, brightnessAvg, coverage metrics
 */
function computeColorAnalysis(pixels) {
  if (!pixels.length) {
    return {
      dominantColors: [],
      warmCoolRatio: 0.5,
      saturationAvg: 0.5,
      brightnessAvg: 0.5,
      greenCoverage: 0,
      blueCoverage: 0,
      orangeCoverage: 0,
      redCoverage: 0,
      yellowCoverage: 0,
      purpleCoverage: 0
    };
  }
  
  // 1. Dominant Colors (quantized histogram with saturation weighting)
  const colorData = {}; // { hex: { count, saturation } }
  let totalWarm = 0, totalCool = 0;
  let totalSaturation = 0, totalBrightness = 0;
  let coloredPixelCount = 0;  // Track non-neutral pixels
  
  // Coverage counters (percentage of COLORED pixels that are each color)
  let greenPixels = 0;
  let bluePixels = 0;
  let orangePixels = 0;
  let redPixels = 0;
  let yellowPixels = 0;
  let purplePixels = 0;
  
  for (const px of pixels) {
    // HSL for saturation/brightness
    const hsl = rgbToHsl(px.r, px.g, px.b);
    
    // Skip neutral pixels (gray padding from contain resize)
    // This stabilizes color metrics and improves B&W behavior
    if (hsl.s < 0.05) continue;
    
    coloredPixelCount++;
    
    // Coverage tracking (broad ranges for natural landscapes)
    // Green: sage → olive → forest → grass (hue 60-160)
    if (hsl.h >= 60 && hsl.h <= 160 && hsl.s > 0.08) {
      greenPixels++;
    }
    // Blue: cyan → sky → deep blue (hue 180-250)
    if (hsl.h >= 180 && hsl.h <= 250 && hsl.s > 0.08) {
      bluePixels++;
    }
    // Purple: violet → magenta (hue 250-320)
    if (hsl.h >= 250 && hsl.h <= 320 && hsl.s > 0.08) {
      purplePixels++;
    }
    // Red: true red (hue 0-15 or 345-360)
    if (((hsl.h >= 0 && hsl.h <= 15) || (hsl.h >= 345 && hsl.h <= 360)) && hsl.s > 0.08) {
      redPixels++;
    }
    // Orange: orange → gold (hue 15-45)
    if (hsl.h >= 15 && hsl.h <= 45 && hsl.s > 0.08) {
      orangePixels++;
    }
    // Yellow: yellow → chartreuse (hue 45-70)
    if (hsl.h >= 45 && hsl.h <= 70 && hsl.s > 0.08) {
      yellowPixels++;
    }
    
    const q = quantizeColor(px.r, px.g, px.b);
    const hex = rgbToHex(q.r, q.g, q.b);
    
    // Track color with its saturation for weighted sorting
    if (!colorData[hex]) {
      colorData[hex] = { count: 0, totalSat: 0 };
    }
    colorData[hex].count++;
    colorData[hex].totalSat += hsl.s;
    
    totalSaturation += hsl.s;
    totalBrightness += hsl.l;
    
    // Warm/cool classification based on hue
    // Weight by saturation - vivid colors count more than grays
    const weight = 0.2 + (hsl.s * 0.8); // min 0.2, max 1.0
    
    // Warm: 0-80 (reds/oranges/yellows/yellow-greens) and 300-360 (magentas/reds)
    // Cool: 160-300 (teals/blues/purples)
    // Broader ranges match human perception better for landscapes
    // Only count warm/cool if saturation is meaningful
    if (hsl.s > 0.15) {
      if ((hsl.h >= 0 && hsl.h <= 80) || (hsl.h >= 300 && hsl.h <= 360)) {
        totalWarm += weight;
      } else if (hsl.h >= 160 && hsl.h < 300) {
        totalCool += weight;
      }
    }
    // Low saturation colors don't contribute to warm/cool
  }
  
  // Sort colors by saturation-weighted frequency (vivid colors rank higher)
  // Score = count * (1 + avgSaturation) - so saturated colors beat grays
  const sortedColors = Object.entries(colorData)
    .map(([hex, data]) => {
      const avgSat = data.totalSat / data.count;
      const score = data.count * (1 + avgSat * 2); // Boost saturated colors
      return { hex, score, avgSat };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.hex);
  
  // 2. Warm/Cool ratio (0 = all cool, 1 = all warm, 0.5 = neutral/gray)
  const warmCoolTotal = totalWarm + totalCool;
  const warmCoolRatio = warmCoolTotal > 0.1 ? totalWarm / warmCoolTotal : 0.5;
  
  // 3. Saturation average (0 = muted, 1 = vivid)
  // Use coloredPixelCount to exclude neutral padding pixels
  const saturationAvg = coloredPixelCount > 0 ? totalSaturation / coloredPixelCount : 0;
  
  // 4. Brightness average (0 = dark, 1 = light)
  const brightnessAvg = coloredPixelCount > 0 ? totalBrightness / coloredPixelCount : 0.5;
  
  // 5. Coverage metrics (percentage of COLORED pixels, not total)
  // This prevents snow/fog/B&W from collapsing all values to near-zero
  const colorBase = coloredPixelCount || 1;
  const greenCoverage = colorBase > 0 ? greenPixels / colorBase : 0;
  const blueCoverage = colorBase > 0 ? bluePixels / colorBase : 0;
  const orangeCoverage = colorBase > 0 ? orangePixels / colorBase : 0;
  const redCoverage = colorBase > 0 ? redPixels / colorBase : 0;
  const yellowCoverage = colorBase > 0 ? yellowPixels / colorBase : 0;
  const purpleCoverage = colorBase > 0 ? purplePixels / colorBase : 0;
  
  return {
    dominantColors: sortedColors,
    warmCoolRatio: Math.round(warmCoolRatio * 100) / 100,
    saturationAvg: Math.round(saturationAvg * 100) / 100,
    brightnessAvg: Math.round(brightnessAvg * 100) / 100,
    greenCoverage: Math.round(greenCoverage * 100) / 100,
    blueCoverage: Math.round(blueCoverage * 100) / 100,
    orangeCoverage: Math.round(orangeCoverage * 100) / 100,
    redCoverage: Math.round(redCoverage * 100) / 100,
    yellowCoverage: Math.round(yellowCoverage * 100) / 100,
    purpleCoverage: Math.round(purpleCoverage * 100) / 100
  };
}

/**
 * Compute tone/contrast analysis from pixel samples
 * Returns: contrastScore, toneDistribution (shadows/midtones/highlights percentages)
 */
function computeToneAnalysis(pixels) {
  if (!pixels.length) {
    return {
      contrastScore: 0.5,
      toneDistribution: { shadows: 0.33, midtones: 0.34, highlights: 0.33 }
    };
  }
  
  // Filter out neutral gray pixels (padding from contain resize)
  // Only analyze pixels with meaningful saturation
  const validPixels = pixels.filter(px => {
    const hsl = rgbToHsl(px.r, px.g, px.b);
    return hsl.s >= 0.05;
  });
  
  // If no valid pixels (B&W image), use all pixels for tone
  const analyzePixels = validPixels.length > 0 ? validPixels : pixels;
  
  // Calculate luminance for each pixel (standard luminance formula)
  const luminances = analyzePixels.map(px => (0.299 * px.r + 0.587 * px.g + 0.114 * px.b) / 255);
  
  // 1. Contrast score = standard deviation of luminance (normalized 0-1)
  const avgLum = luminances.reduce((a, b) => a + b, 0) / luminances.length;
  const variance = luminances.reduce((acc, l) => acc + Math.pow(l - avgLum, 2), 0) / luminances.length;
  const stdDev = Math.sqrt(variance);
  // Max possible stdDev is 0.5 (half black, half white), so multiply by 2 to normalize
  const contrastScore = Math.min(1, stdDev * 2);
  
  // 2. Tonal distribution
  // Shadows: luminance 0-0.25
  // Midtones: luminance 0.25-0.75
  // Highlights: luminance 0.75-1.0
  let shadows = 0, midtones = 0, highlights = 0;
  
  for (const l of luminances) {
    if (l < 0.25) shadows++;
    else if (l < 0.75) midtones++;
    else highlights++;
  }
  
  const total = luminances.length;
  
  return {
    contrastScore: Math.round(contrastScore * 100) / 100,
    toneDistribution: {
      shadows: Math.round((shadows / total) * 100) / 100,
      midtones: Math.round((midtones / total) * 100) / 100,
      highlights: Math.round((highlights / total) * 100) / 100
    }
  };
}

// computeDHash is now async - see computeDHashWithSharp above

/**
 * Read the visual index
 */
async function readIndex() {
  try {
    const data = await fs.readFile(VISUAL_INDEX_PATH, "utf8");
    return JSON.parse(data);
  } catch (e) {
    return { version: "1.0", images: {} };
  }
}

/**
 * Write the visual index
 */
async function writeIndex(index) {
  await fs.writeFile(VISUAL_INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
}

/**
 * Generate and store hash for a single image
 * Key is imageId only - one photograph = one visual fingerprint
 */
async function indexImage(imageId, imageUrl, galleryPath) {
  const index = await readIndex();
  
  // Use imageId as key - one photograph = one visual fingerprint
  // galleryPath is stored as metadata but doesn't affect identity
  const key = imageId;
  const CURRENT_VERSION = 7;
  
  // Only skip if already indexed WITH current version
  // Version mismatch triggers re-index (fixes mixed-version chaos)
  if (index.images[key]?.analysisVersion === CURRENT_VERSION) {
    return { success: true, key, dhash: index.images[key].dhash, cached: true };
  }
  
  try {
    const buffer = await fetchImageBuffer(imageUrl);
    
    // Compute proper dHash from decoded pixels (not compressed bytes)
    const dhash = await computeDHashWithSharp(buffer);
    const dimensions = getImageDimensions(buffer);
    
    // Extract pixel samples for color/tone analysis
    // Must use Sharp - fail loud if it doesn't work
    const pixels = await extractPixelSamplesWithSharp(buffer);
    if (!pixels || pixels.length === 0) {
      throw new Error("Pixel decode failed — cannot index visual data");
    }
    
    // Compute color analysis
    const colorAnalysis = computeColorAnalysis(pixels);
    
    // Compute tone analysis  
    const toneAnalysis = computeToneAnalysis(pixels);
    
    index.images[key] = {
      imageId,
      galleryPath,  // Stored as metadata, not part of key
      dhash,
      width: dimensions?.width || null,
      height: dimensions?.height || null,
      // Color descriptors
      dominantColors: colorAnalysis.dominantColors,
      warmCoolRatio: colorAnalysis.warmCoolRatio,
      saturationAvg: colorAnalysis.saturationAvg,
      brightnessAvg: colorAnalysis.brightnessAvg,
      // Coverage metrics (percentage of colored pixels that are each color)
      greenCoverage: colorAnalysis.greenCoverage,
      blueCoverage: colorAnalysis.blueCoverage,
      orangeCoverage: colorAnalysis.orangeCoverage,
      redCoverage: colorAnalysis.redCoverage,
      yellowCoverage: colorAnalysis.yellowCoverage,
      purpleCoverage: colorAnalysis.purpleCoverage,
      // Tone descriptors
      contrastScore: toneAnalysis.contrastScore,
      toneDistribution: toneAnalysis.toneDistribution,
      // Versioning
      analysisVersion: 7,  // v7 = separate coverage for each color
      indexedAt: new Date().toISOString()
    };
    
    await writeIndex(index);
    
    return { success: true, key, dhash };
  } catch (err) {
    console.error(`[visualIndex] Failed to index ${imageId}:`, err.message);
    return { success: false, key, error: err.message };
  }
}

/**
 * Remove an image from the index
 */
async function removeImage(imageId, galleryPath) {
  const index = await readIndex();
  const key = imageId;  // Key is imageId only
  
  if (index.images[key]) {
    delete index.images[key];
    await writeIndex(index);
    return { success: true, removed: key };
  }
  
  return { success: true, removed: null };
}

/**
 * Get all indexed images (for similarity sorting)
 */
async function getAllHashes() {
  const index = await readIndex();
  return index.images;
}

/**
 * Compute Hamming distance between two binary hash strings
 */
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

/**
 * Compute composite visual distance between two indexed images
 * Combines structural (dHash) + color + tone for art-appropriate similarity
 * Returns 0-1 where 0 = identical, 1 = completely different
 */
function visualDistance(a, b) {
  // 1. dHash distance (0–64), normalize to 0–1
  const hashDist = hammingDistance(a.dhash, b.dhash) / 64;

  // 2. Warm/cool distance
  const warmCoolDist = Math.abs((a.warmCoolRatio || 0.5) - (b.warmCoolRatio || 0.5));

  // 3. Saturation distance
  const satDist = Math.abs((a.saturationAvg || 0) - (b.saturationAvg || 0));

  // 4. Brightness distance
  const brightDist = Math.abs((a.brightnessAvg || 0.5) - (b.brightnessAvg || 0.5));

  // 5. Contrast distance
  const contrastDist = Math.abs((a.contrastScore || 0.5) - (b.contrastScore || 0.5));

  // Special case: B&W images rely more on structure
  const isBW = (a.saturationAvg || 0) < 0.05 && (b.saturationAvg || 0) < 0.05;
  const structureWeight = isBW ? 0.55 : 0.4;
  const colorWeight = isBW ? 0.1 : 0.2;

  // Weighted sum (ART perception weights)
  return (
    hashDist * structureWeight +      // structure
    warmCoolDist * colorWeight +      // color temperature
    satDist * 0.15 +                  // color intensity
    brightDist * 0.15 +               // tonal weight
    contrastDist * 0.1                // drama
  );
}

/**
 * Find similar images based on pure dHash hamming distance
 * Color/tone metrics are for SORTING only, not similarity matching
 * This is how Lightroom/Capture One/museum DAMs work
 */
async function findSimilar(imageId, galleryPath, threshold = 10) {
  const index = await readIndex();
  const key = imageId;  // Key is imageId only
  const target = index.images[key];
  
  if (!target) {
    return { success: false, error: "Image not indexed" };
  }
  
  const similar = [];
  for (const [k, v] of Object.entries(index.images)) {
    if (k === key) continue;
    const distance = hammingDistance(target.dhash, v.dhash);
    if (distance <= threshold) {
      similar.push({ 
        key: k, 
        imageId: v.imageId, 
        galleryPath: v.galleryPath, 
        distance
      });
    }
  }
  
  similar.sort((a, b) => a.distance - b.distance);
  return { success: true, similar };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  
  try {
    const { action, imageId, imageUrl, galleryPath, threshold } = JSON.parse(event.body || "{}");
    
    switch (action) {
      case "index":
        if (!imageId || !imageUrl || !galleryPath) {
          return { statusCode: 400, body: "Missing imageId, imageUrl, or galleryPath" };
        }
        const indexResult = await indexImage(imageId, imageUrl, galleryPath);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(indexResult)
        };
        
      case "remove":
        if (!imageId || !galleryPath) {
          return { statusCode: 400, body: "Missing imageId or galleryPath" };
        }
        const removeResult = await removeImage(imageId, galleryPath);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(removeResult)
        };
        
      case "findSimilar":
        if (!imageId || !galleryPath) {
          return { statusCode: 400, body: "Missing imageId or galleryPath" };
        }
        const similarResult = await findSimilar(imageId, galleryPath, threshold || 10);
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(similarResult)
        };
        
      case "getAll":
        const all = await getAllHashes();
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ success: true, images: all })
        };
        
      default:
        return { statusCode: 400, body: "Unknown action. Use: index, remove, findSimilar, getAll" };
    }
  } catch (err) {
    console.error("[visualIndex] Error:", err);
    return { statusCode: 500, body: String(err.stack || err) };
  }
};

// Export for direct require from other functions
exports.indexImage = indexImage;
exports.removeImage = removeImage;
exports.getAllHashes = getAllHashes;
exports.hammingDistance = hammingDistance;
exports.visualDistance = visualDistance;
