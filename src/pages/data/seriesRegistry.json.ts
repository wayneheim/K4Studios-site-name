// API endpoint to serve seriesRegistry.json
import registry from "../../data/seriesRegistry.json";

export async function GET() {
  return new Response(JSON.stringify(registry), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
  });
}
