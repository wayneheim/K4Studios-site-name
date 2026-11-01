import type { APIRoute } from "astro";
import { verifyCartItems } from "../../../lib/commerce/server/verifyCart.js";
import { getExpeditionPriceKey } from "../../../data/commerce/catalog.js";

export const prerender = false;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
});

export const POST: APIRoute = async ({ request }) => {
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  let verifiedItems;
  try {
    verifiedItems = verifyCartItems(payload?.items);
  } catch (error: any) {
    return json({ error: error?.message || "The cart could not be verified." }, 400);
  }

  const commerceApiBase = String(import.meta.env.PUBLIC_K4_COMMERCE_API_BASE || "").replace(/\/$/, "");
  if (commerceApiBase && verifiedItems.some((item) => item.catalogScope === "expedition")) {
    try {
      const configResponse = await fetch(`${commerceApiBase}/config`, { headers: { accept: "application/json" } });
      const config = configResponse.ok ? await configResponse.json() : null;
      verifiedItems = verifiedItems.map((item) => {
        if (item.catalogScope !== "expedition") return item;
        const cents = Number(config?.expeditionPricesCents?.[getExpeditionPriceKey(item.productKey)]);
        return Number.isInteger(cents) && cents > 0
          ? { ...item, unitPriceCents: cents, lineTotalCents: cents * item.quantity }
          : item;
      });
    } catch {
      // Catalog defaults remain authoritative when the live configuration service is unavailable.
    }
  }

  const subtotalCents = verifiedItems.reduce((total, item) => total + item.lineTotalCents, 0);

  return json({
    quoteVersion: 1,
    currency: verifiedItems[0].currency,
    subtotal: subtotalCents / 100,
    subtotalCents,
    shipping: null,
    tax: null,
    total: null,
    items: verifiedItems,
    verifiedAt: new Date().toISOString(),
  });
};

export const ALL: APIRoute = () => json({ error: "Method not allowed." }, 405);

