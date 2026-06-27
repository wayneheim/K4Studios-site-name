// API endpoint to serve Engrained gallery data for crosslink lookups
import { galleryData } from "../../data/Other/K4-Select-Series/Engrained/Engrained-Series.mjs";

export async function GET() {
  // Transform to the format expected by SeriesOrderModal
  const items = galleryData
    .filter(item => item.id !== "i-k4studios" && !['hidden', 'hide', 'ghost', 'non', 'none', ''].includes(String(item.visibility ?? 'show').trim().toLowerCase()))
    .map(item => ({
      id: item.id,
      title: item.title,
      linkedImageId: item.linkedImageId || null,
      linkedGalleryPath: item.linkedGalleryPath || null,
      visibility: item.visibility,
      price: item.price,
      imageSize: item.imageSize,
      inventory: item.inventory || {}
    }));

  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    }
  });
}
