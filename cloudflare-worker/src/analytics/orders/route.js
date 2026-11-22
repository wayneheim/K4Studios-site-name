import { renderOrderTracker } from "./renderer.js";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {
    "content-type": "application/json; charset=utf-8", "cache-control": "no-store", vary: "Authorization",
  } });
}

// Called only after the Stats worker's existing administrator authentication.
export async function handleOrderTrackerRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");
  if (path === "/__k4stats/orders" && request.method === "GET") {
    return new Response(renderOrderTracker(), { headers: {
      "content-type": "text/html; charset=utf-8", "cache-control": "no-store", vary: "Authorization",
      "x-robots-tag": "noindex, nofollow, noarchive", "referrer-policy": "same-origin",
    } });
  }
  let upstreamPath;
  let upstreamBody = "{}";
  if (path === "/__k4stats/orders/summary" && request.method === "GET") {
    upstreamPath = "/admin/order-summary";
  } else if (path === "/__k4stats/orders/data" && request.method === "GET") {
    const params = new URLSearchParams();
    for (const key of ["view", "limit", "cursor"]) {
      if (url.searchParams.has(key)) params.set(key, url.searchParams.get(key));
    }
    upstreamPath = `/admin/order-tracker?${params}`;
  } else {
    const match = path.match(/^\/__k4stats\/orders\/([A-Za-z0-9-]+)\/(processed|shipped)$/);
    if (!match || request.method !== "POST") return json({ error: "Not found." }, 404);
    const origin = request.headers.get("origin");
    if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") {
      return json({ error: "Open the tracker on the Stats site before updating an order." }, 403);
    }
    upstreamPath = `/admin/orders/${match[1]}/${match[2]}`;
    if (match[2] === "shipped") {
      try {
        const raw = await request.text();
        if (raw.length > 2048) return json({ error: "Tracking details are too long." }, 413);
        const payload = JSON.parse(raw);
        upstreamBody = JSON.stringify({ trackingCarrier: payload?.trackingCarrier, trackingNumber: payload?.trackingNumber });
      } catch { return json({ error: "Invalid tracking details." }, 400); }
    }
  }
  if (!env.K4_COMMERCE?.fetch) return json({ error: "The order tracker connection is not configured." }, 503);
  try {
    // The scoped service secret stays server-side. Forward the Stats login only
    // for local setups without a service secret; never use a client-supplied URL.
    const upstream = await env.K4_COMMERCE.fetch(new Request(`https://commerce.internal${upstreamPath}`, {
      method: request.method,
      headers: {
        authorization: env.STATS_ORDERS_TOKEN ? `Bearer ${env.STATS_ORDERS_TOKEN}` : request.headers.get("authorization") || "",
        "content-type": "application/json",
      },
      ...(request.method === "POST" ? { body: upstreamBody } : {}),
      redirect: "manual",
    }));
    const body = await upstream.json();
    return json(body, upstream.status);
  } catch {
    return json({ error: "The order service could not be reached. Please retry." }, 502);
  }
}
