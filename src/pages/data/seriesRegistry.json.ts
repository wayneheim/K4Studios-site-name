// API endpoint to serve seriesRegistry.json
import registry from "../../data/seriesRegistry.json";

export async function GET() {
  return new Response(JSON.stringify(registry), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Avoid edge/CDN caching issues (including cached 404s).
      // no-store is the safest behavior for this frequently changing registry.
      "Cache-Control": "no-store, max-age=0",
      "CDN-Cache-Control": "no-store",
      "Netlify-CDN-Cache-Control": "no-store"
    }
  });
}
