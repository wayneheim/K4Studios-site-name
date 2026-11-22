import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import worker from "../src/analytics/worker.js";
import { handleOrderTrackerRequest } from "../src/analytics/orders/route.js";
import { renderOpenOrdersButton, renderOrderTracker } from "../src/analytics/orders/renderer.js";

const authorization = `Basic ${btoa("k4admin:local-stats-test")}`;
const base = "https://edge.k4studios.com/__k4stats/orders";

test("all tracker routes require existing Stats authentication before contacting commerce", async () => {
  for (const path of ["", "/summary", "/data", "/order-1/processed", "/order-1/shipped"]) {
    const response = await worker.fetch(new Request(base + path), {
      ANALYTICS_PASSWORD: "local-stats-test",
      K4_COMMERCE: { fetch() { throw new Error("Must not contact commerce without auth"); } },
    }, {});
    assert.equal(response.status, 401);
  }
});

test("summary forwards administrator auth only to the commerce binding and disables caching", async () => {
  let forwarded;
  const response = await worker.fetch(new Request(base + "/summary", { headers: { authorization } }), {
    ANALYTICS_PASSWORD: "local-stats-test",
    K4_COMMERCE: { async fetch(request) { forwarded = request; return Response.json({ mode: "live", pendingCount: 2 }); } },
  }, {});
  assert.equal(response.status, 200);
  assert.equal(forwarded.url, "https://commerce.internal/admin/order-summary");
  assert.equal(forwarded.headers.get("authorization"), authorization);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { mode: "live", pendingCount: 2 });
});

test("tracker HTML is separate from Stats and contains no order data or embedded credentials", async () => {
  const response = await worker.fetch(new Request(base, { headers: { authorization } }), {
    ANALYTICS_PASSWORD: "local-stats-test",
    K4_COMMERCE: { fetch() { throw new Error("HTML must not query orders"); } },
  }, {});
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Awaiting processing/);
  assert.match(html, /Order history/);
  assert.equal(html.includes(authorization), false);
  assert.equal(html.includes("local-stats-test"), false);
});

test("configured service credentials replace the Stats login only on the private commerce request", async () => {
  let forwarded;
  const response = await worker.fetch(new Request(base + "/summary", { headers: { authorization } }), {
    ANALYTICS_PASSWORD: "local-stats-test",
    STATS_ORDERS_TOKEN: "local-service-test-token",
    K4_COMMERCE: { async fetch(request) { forwarded = request; return Response.json({ pendingCount: 1 }); } },
  }, {});
  assert.equal(response.status, 200);
  assert.equal(forwarded.headers.get("authorization"), "Bearer local-service-test-token");
  assert.equal((await response.text()).includes("local-service-test-token"), false);
});

test("processing rejects cross-site requests and cannot proxy arbitrary API routes", async () => {
  const env = { K4_COMMERCE: { fetch() { throw new Error("Unexpected upstream request"); } } };
  const response = await handleOrderTrackerRequest(new Request(base + "/order-1/processed", {
    method: "POST", headers: { origin: "https://example.test", authorization },
  }), env);
  assert.equal(response.status, 403);
  assert.equal((await handleOrderTrackerRequest(new Request(base + "/order-1/delete", { method: "POST" }), env)).status, 404);
});

test("processing uses a fixed service endpoint and strips the browser Origin after validation", async () => {
  let forwarded;
  const response = await handleOrderTrackerRequest(new Request(base + "/order-1/processed", {
    method: "POST", headers: { authorization, origin: "https://edge.k4studios.com" }, body: "{}",
  }), { K4_COMMERCE: { async fetch(request) { forwarded = request; return Response.json({ processingEmailQueued: true }); } } });
  assert.equal(response.status, 200);
  assert.equal(forwarded.url, "https://commerce.internal/admin/orders/order-1/processed");
  assert.equal(forwarded.method, "POST");
  assert.equal(forwarded.headers.has("origin"), false);
});

test("shipping forwards only tracking fields, keeping recipient and order status under commerce control", async () => {
  let forwarded;
  const response = await handleOrderTrackerRequest(new Request(base + "/order-1/shipped", {
    method: "POST", headers: { authorization, origin: "https://edge.k4studios.com" },
    body: JSON.stringify({ trackingCarrier: "UPS", trackingNumber: "1Z-AbC012345", buyerEmail: "other@example.test", status: "fulfilled", mode: "sandbox" }),
  }), { K4_COMMERCE: { async fetch(request) { forwarded = request; return Response.json({ shipmentEmailQueued: true }); } } });
  assert.equal(response.status, 200);
  assert.equal(forwarded.url, "https://commerce.internal/admin/orders/order-1/shipped");
  assert.deepEqual(await forwarded.json(), { trackingCarrier: "UPS", trackingNumber: "1Z-AbC012345" });
  assert.equal(forwarded.headers.has("origin"), false);
});

test("shipping rejects cross-site and malformed requests before contacting commerce", async () => {
  const env = { K4_COMMERCE: { fetch() { throw new Error("Unexpected upstream request"); } } };
  assert.equal((await handleOrderTrackerRequest(new Request(base + "/order-1/shipped", {
    method: "POST", headers: { origin: "https://example.test" }, body: "{}",
  }), env)).status, 403);
  assert.equal((await handleOrderTrackerRequest(new Request(base + "/order-1/shipped", {
    method: "POST", body: "not-json",
  }), env)).status, 400);
  assert.equal((await handleOrderTrackerRequest(new Request(base + "/order-1/shipped", {
    method: "POST", body: "x".repeat(2049),
  }), env)).status, 413);
});

test("a missing or unavailable commerce service returns an error, never a false zero count", async () => {
  assert.equal((await handleOrderTrackerRequest(new Request(base + "/summary"), {})).status, 503);
  const response = await handleOrderTrackerRequest(new Request(base + "/summary"), {
    K4_COMMERCE: { fetch() { throw new Error("offline"); } },
  });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).pendingCount, undefined);
});

test("both rendered interfaces contain valid browser JavaScript", () => {
  for (const html of [renderOpenOrdersButton(), renderOrderTracker()]) {
    for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  }
});
