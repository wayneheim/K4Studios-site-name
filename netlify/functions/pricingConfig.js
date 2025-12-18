// pricingConfig.js — Netlify function to read/write pricing configuration
// Stores pricing in local JSON file (same pattern as editionState.js)
// pricingConfig.json is the SINGLE SOURCE OF TRUTH for pricing

const fs = require("fs/promises");
const path = require("path");

const PRICING_PATH = path.join(process.cwd(), "src/data/pricingConfig.json");

async function readPricing() {
  try {
    const data = await fs.readFile(PRICING_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      // No file = no pricing, frontend will show "Call"
      return { pricing: {}, updatedAt: null };
    }
    throw err;
  }
}

async function writePricing(data) {
  data.updatedAt = new Date().toISOString();
  await fs.writeFile(PRICING_PATH, JSON.stringify(data, null, 2), "utf8");
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // GET - Read pricing
  if (event.httpMethod === "GET") {
    try {
      const data = await readPricing();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    } catch (err) {
      console.error("Error reading pricing:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to read pricing" }),
      };
    }
  }

  // POST - Save pricing, descriptions, cardCopy, and infoCopy
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { pricing, descriptions, cardCopy, infoCopy } = body;

      if (!pricing) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing pricing data" }),
        };
      }

      await writePricing({ pricing, descriptions, cardCopy, infoCopy });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    } catch (err) {
      console.error("Error saving pricing:", err);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Failed to save pricing" }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" }),
  };
};
