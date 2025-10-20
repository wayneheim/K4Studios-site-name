// scripts/purge-cloudflare.js
import fetch from "node-fetch";

const zone = process.env.CF_ZONE_ID;
const token = process.env.CF_API_TOKEN;

if (!zone || !token) {
  console.error("❌ Missing CF_ZONE_ID or CF_API_TOKEN environment variables");
  process.exit(0);
}

(async () => {
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ purge_everything: true }),
    });

    const data = await res.json();
    if (data.success) {
      console.log("✅ Cloudflare cache successfully purged for zone:", zone);
    } else {
      console.error("❌ Cloudflare purge failed:", JSON.stringify(data.errors || data, null, 2));
    }
  } catch (err) {
    console.error("🔥 Cloudflare purge script error:", err.message);
  }
})();
