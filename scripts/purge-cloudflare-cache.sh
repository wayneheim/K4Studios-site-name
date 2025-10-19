#!/bin/bash
# ──────────────────────────────────────────────
# 🚀 K4 Studios | Cloudflare Cache Auto-Purge
# Purpose: Automatically clear Cloudflare cache
# after each Netlify deploy (Astro build)
# ──────────────────────────────────────────────

echo "🚀 Starting Cloudflare cache purge for k4studios.com..."

# Check environment variables
if [ -z "$CLOUDFLARE_API_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE_ID" ]; then
  echo "❌ Missing Cloudflare credentials. Skipping cache purge."
  exit 0
fi

# Call Cloudflare API
response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')

# Parse response for success
if echo "$response" | grep -q '"success":true'; then
  echo "✅ Cloudflare cache purged successfully!"
else
  echo "⚠️ Cloudflare purge may have failed. Response:"
  echo "$response"
fi
