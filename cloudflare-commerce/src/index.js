import { verifyCartItems } from "../../src/lib/commerce/server/verifyCart.js";
import { calculateCheckoutQuote } from "../../src/lib/commerce/server/checkoutQuote.js";
import { commerceMode, resolveCommerceShippingConfig, resolveCommerceTaxFallback } from "../../src/lib/commerce/server/commerceConfig.js";
import {
  getOrderByPayPalId,
  getWebhookEvent,
  insertPendingOrder,
  markOrderCreationFailed,
  markApprovalReversed,
  markPayPalOrderCreated,
  markWebhookProcessed,
  recordWebhookEvent,
  savePaymentAndQueueEmail,
} from "./database.js";
import { flushEmailOutbox } from "./emailOutbox.js";
import {
  assertPayPalOrderMatches,
  capturePayPalOrder,
  createPayPalOrder,
  getPayPalOrder,
  verifyPayPalWebhook,
} from "./paypal.js";
import { resolveTaxConfigForDestination } from "./taxRuleStore.js";
import { resolveShippingConfig } from "./shippingRuleStore.js";
import { applyExpeditionPrices, resolveExpeditionPrices, saveExpeditionPriceRule } from "./expeditionPriceStore.js";
import {
  commitEditionReservations,
  releaseEditionReservations,
  reserveEditionInventory,
} from "./editionInventory.js";
import {
  addNexusAdjustment,
  buildAnnualNexusReport,
  cancelOrder,
  deleteSandboxOrder,
  isAdminAuthorized,
  listRecentOrders,
  saveOhioRate,
  saveNexusRule,
  saveShippingRates,
  updateOrderFulfillment,
} from "./admin.js";
import {
  recordCaptureReversal,
  recordDisputeEvent,
  recordRefundEvent,
} from "./financialEvents.js";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function allowedOrigins(env) {
  return new Set(String(env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean));
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = allowedOrigins(env);
  return origin && allowed.has(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,paypal-auth-algo,paypal-cert-url,paypal-transmission-id,paypal-transmission-sig,paypal-transmission-time",
    "access-control-max-age": "86400",
    vary: "Origin",
  } : {};
}

function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...corsHeaders(request, env) } });
}

function cleanText(value, maxLength) {
  return String(value || "").normalize("NFKC").replace(/[<>\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function validateCheckoutContact(payload) {
  const buyer = payload?.buyer || {};
  const address = payload?.shippingAddress || {};
  const buyerName = cleanText(buyer.name, 100);
  const buyerEmail = cleanText(buyer.email, 200).toLowerCase();
  const buyerPhone = cleanText(buyer.phone, 40);
  const phoneDigits = buyerPhone.replace(/\D/g, "");
  const shippingAddress = {
    addressLine1: cleanText(address.addressLine1, 120),
    addressLine2: cleanText(address.addressLine2, 120),
    city: cleanText(address.city, 80),
    stateCode: cleanText(address.stateCode, 2).toUpperCase(),
    postalCode: cleanText(address.postalCode, 10).toUpperCase(),
    countryCode: cleanText(address.countryCode || "US", 2).toUpperCase(),
  };
  if (!buyerName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) throw new Error("A valid buyer name and email are required.");
  if (!/^(?:1)?\d{10}$/.test(phoneDigits)) throw new Error("A valid U.S. phone number is required for delivery and order questions.");
  if (!shippingAddress.addressLine1 || !shippingAddress.city || !/^[A-Z]{2}$/.test(shippingAddress.stateCode)) throw new Error("A complete U.S. shipping address is required.");
  if (!/^\d{5}(?:-\d{4})?$/.test(shippingAddress.postalCode)) throw new Error("A valid U.S. ZIP code is required.");
  if (shippingAddress.countryCode !== "US") throw new Error("K4 checkout currently ships only within the United States.");
  return { buyerName, buyerEmail, buyerPhone, shippingAddress };
}

async function calculateServerQuote(rawItems, shippingAddress, env) {
  const catalogItems = verifyCartItems(rawItems);
  const mode = commerceMode(env);
  const verifiedItems = applyExpeditionPrices(catalogItems, await resolveExpeditionPrices(env.DB, mode));
  const shippingConfig = env.DB
    ? await resolveShippingConfig(env.DB, env)
    : resolveCommerceShippingConfig(env);
  const taxConfig = env.DB
    ? await resolveTaxConfigForDestination(env.DB, env, shippingAddress.stateCode)
    : resolveCommerceTaxFallback(env);
  return calculateCheckoutQuote({ verifiedItems, destination: shippingAddress, shippingConfig, taxConfig });
}

function assertQuoteMatchesStored(quote, order) {
  const fields = ["merchandiseCents", "shippingCents", "taxCents", "totalCents"];
  const stored = {
    merchandiseCents: order.merchandise_cents,
    shippingCents: order.shipping_cents,
    taxCents: order.tax_cents,
    totalCents: order.total_cents,
  };
  if (fields.some((field) => quote[field] !== stored[field])) {
    throw new Error("The server-calculated checkout total changed before capture. Payment was not captured.");
  }
  if (quote.tax.jurisdictionCode !== order.tax_jurisdiction_code || quote.tax.rateBasisPoints !== order.tax_rate_basis_points) {
    throw new Error("The tax jurisdiction or rate changed before capture. Payment was not captured.");
  }
}

function extractCapture(paypalResult) {
  return paypalResult?.purchase_units?.flatMap((unit) => unit?.payments?.captures || [])?.[0] || null;
}

function assertCaptureMatches(capture, order) {
  const amountCents = Math.round(Number(capture?.amount?.value || 0) * 100);
  if (!capture?.id || capture?.amount?.currency_code !== "USD" || amountCents !== order.total_cents) {
    throw new Error("Captured PayPal amount does not match the verified K4 order total.");
  }
}

async function handleQuote(request, env) {
  const payload = await request.json();
  const { shippingAddress } = validateCheckoutContact(payload);
  const quote = await calculateServerQuote(payload.items, shippingAddress, env);
  return json(request, env, quote);
}

async function handleCreateOrder(request, env) {
  const mode = commerceMode(env);
  if (env.CHECKOUT_ENABLED !== "true" || !env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    return json(request, env, { error: `PayPal ${mode} checkout is not configured.` }, 503);
  }
  const payload = await request.json();
  const { buyerName, buyerEmail, buyerPhone, shippingAddress } = validateCheckoutContact(payload);
  const quote = await calculateServerQuote(payload.items, shippingAddress, env);
  const id = crypto.randomUUID();
  const order = {
    id,
    orderNumber: `${mode === "sandbox" ? "K4-SBX" : "K4"}-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 6).toUpperCase()}`,
    mode,
    buyerName,
    buyerEmail,
    buyerPhone,
  };

  // The K4 order exists durably before PayPal is called or any email is attempted.
  await insertPendingOrder(env.DB, {
    order,
    rawCart: payload.items,
    verifiedItems: quote.items,
    quote,
    shippingAddress,
  });

  try {
    const { body, debugId } = await createPayPalOrder(env, order, quote, shippingAddress);
    await markPayPalOrderCreated(env.DB, id, body.id, body.status, debugId);
    return json(request, env, {
      orderId: body.id,
      localOrderId: id,
      orderNumber: order.orderNumber,
      mode,
      quote,
    }, 201);
  } catch (error) {
    await markOrderCreationFailed(env.DB, id, error?.debugId || error?.message);
    throw error;
  }
}

async function handleCapture(request, env, paypalOrderId, ctx) {
  const mode = commerceMode(env);
  const order = await getOrderByPayPalId(env.DB, paypalOrderId);
  if (!order) return json(request, env, { error: "The K4 order was not found." }, 404);
  if (order.mode !== mode) throw new Error("The stored order belongs to a different commerce environment.");
  const confirmationItems = (items) => items.map((item) => ({
    imageId: item.imageId,
    imageTitle: item.imageTitle,
    artworkUrl: String(item.artworkUrl || "").replace(/-sketch$/, ""),
    collectorNotes: item.collectorNotes || "",
  }));
  if (order.status === "paid") return json(request, env, {
    orderNumber: order.order_number,
    status: "COMPLETED",
    mode,
    alreadyCaptured: true,
    confirmationItems: confirmationItems(JSON.parse(order.verified_items_json)),
  });

  // Recalculate from the authoritative catalog/rules immediately before capture.
  const freshQuote = await calculateServerQuote(JSON.parse(order.raw_cart_json), JSON.parse(order.shipping_address_json), env);
  assertQuoteMatchesStored(freshQuote, order);

  const { body: paypalOrder } = await getPayPalOrder(env, paypalOrderId);
  assertPayPalOrderMatches(paypalOrder, order);
  if (paypalOrder.status !== "APPROVED") throw new Error(`PayPal order is ${paypalOrder.status}, not APPROVED.`);

  // Reserve scarce editions immediately before capture. The D1 constraint and
  // transactional batch make concurrent checkout attempts fail before money moves.
  await reserveEditionInventory(env.DB, order.id, freshQuote.items);
  const { body: captureResult } = await capturePayPalOrder(env, paypalOrderId, order.id);
  const capture = extractCapture(captureResult);
  assertCaptureMatches(capture, order);
  if (capture.status === "COMPLETED") await commitEditionReservations(env.DB, order.id);
  if (capture.status === "DENIED") await releaseEditionReservations(env.DB, order.id);
  const saved = await savePaymentAndQueueEmail(env.DB, order, capture, captureResult);
  if (saved.outboxIds?.length) {
    ctx.waitUntil(Promise.all(saved.outboxIds.map((outboxId) => flushEmailOutbox(env, outboxId))));
  }

  return json(request, env, {
    orderNumber: order.order_number,
    status: capture.status,
    captureId: capture.id,
    mode,
    confirmationItems: confirmationItems(freshQuote.items),
  });
}

async function handleWebhook(request, env, ctx) {
  const event = await request.json();
  const verified = await verifyPayPalWebhook(env, request, event);
  if (!verified) return json(request, env, { error: "PayPal webhook signature verification failed." }, 400);

  const inserted = await recordWebhookEvent(env.DB, event, "SUCCESS");
  if (!inserted) {
    const existing = await getWebhookEvent(env.DB, event.id);
    if (existing?.processed_at && !existing?.processing_error) {
      return json(request, env, { received: true, duplicate: true });
    }
  }
  try {
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" || event.event_type === "PAYMENT.CAPTURE.PENDING" || event.event_type === "PAYMENT.CAPTURE.DENIED") {
      const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id;
      const order = paypalOrderId ? await getOrderByPayPalId(env.DB, paypalOrderId) : null;
      if (order) {
        assertCaptureMatches(event.resource, order);
        const verifiedItems = JSON.parse(order.verified_items_json);
        if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
          await reserveEditionInventory(env.DB, order.id, verifiedItems);
          await commitEditionReservations(env.DB, order.id);
        }
        if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
          await releaseEditionReservations(env.DB, order.id);
        }
        const saved = await savePaymentAndQueueEmail(env.DB, order, event.resource, event);
        if (event.event_type === "PAYMENT.CAPTURE.COMPLETED" && saved.outboxIds?.length) {
          ctx.waitUntil(Promise.all(saved.outboxIds.map((outboxId) => flushEmailOutbox(env, outboxId))));
        }
      }
    }
    if (event.event_type === "CHECKOUT.PAYMENT-APPROVAL.REVERSED") {
      const paypalOrderId = String(
        event.resource?.order_id
        || event.resource?.id
        || event.resource?.supplementary_data?.related_ids?.order_id
        || "",
      );
      const order = paypalOrderId ? await getOrderByPayPalId(env.DB, paypalOrderId) : null;
      if (order) {
        await releaseEditionReservations(env.DB, order.id);
        await markApprovalReversed(env.DB, order);
      }
    }
    if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
      const result = await recordRefundEvent(env.DB, event);
      if (result.outboxIds?.length) {
        ctx.waitUntil(Promise.all(result.outboxIds.map((outboxId) => flushEmailOutbox(env, outboxId))));
      }
    }
    if (event.event_type === "PAYMENT.CAPTURE.REVERSED") {
      const result = await recordCaptureReversal(env.DB, event);
      if (result.outboxIds?.length) {
        ctx.waitUntil(Promise.all(result.outboxIds.map((outboxId) => flushEmailOutbox(env, outboxId))));
      }
    }
    if (["CUSTOMER.DISPUTE.CREATED", "CUSTOMER.DISPUTE.UPDATED", "CUSTOMER.DISPUTE.RESOLVED"].includes(event.event_type)) {
      const result = await recordDisputeEvent(env.DB, event);
      if (result.outboxIds?.length) {
        ctx.waitUntil(Promise.all(result.outboxIds.map((outboxId) => flushEmailOutbox(env, outboxId))));
      }
    }
    await markWebhookProcessed(env.DB, event.id);
  } catch (error) {
    await markWebhookProcessed(env.DB, event.id, error);
    throw error;
  }
  return json(request, env, { received: true });
}

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const mode = commerceMode(env);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  if (request.method === "GET" && url.pathname === "/health") {
    return json(request, env, {
      service: "k4-commerce",
      mode,
      livePaymentsEnabled: mode === "live" && env.CHECKOUT_ENABLED === "true" && env.LIVE_CONFIGURATION_APPROVED === "true",
    });
  }
  if (request.method === "GET" && url.pathname === "/config") {
    const liveApproved = mode !== "live" || env.LIVE_CONFIGURATION_APPROVED === "true";
    const configured = env.CHECKOUT_ENABLED === "true" && liveApproved && Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
    return json(request, env, {
      mode,
      configured,
      clientId: configured ? env.PAYPAL_CLIENT_ID : null,
      sdkUrl: mode === "sandbox" ? "https://www.sandbox.paypal.com/web-sdk/v6/core" : "https://www.paypal.com/web-sdk/v6/core",
      livePaymentsEnabled: mode === "live" && configured,
      expeditionPricesCents: await resolveExpeditionPrices(env.DB, mode),
      notice: mode === "sandbox" ? "PayPal Sandbox only — no live payment can be collected." : "Secure live PayPal checkout.",
    });
  }
  if (request.method === "POST" && url.pathname === "/quote") return handleQuote(request, env);
  if (request.method === "POST" && url.pathname === "/orders") return handleCreateOrder(request, env);
  const captureMatch = url.pathname.match(/^\/orders\/([A-Za-z0-9-]+)\/capture$/);
  if (request.method === "POST" && captureMatch) return handleCapture(request, env, captureMatch[1], ctx);
  if (request.method === "POST" && url.pathname === "/webhooks/paypal") return handleWebhook(request, env, ctx);
  if (url.pathname.startsWith("/admin/")) {
    if (!(await isAdminAuthorized(request, env))) return json(request, env, { error: "Admin authorization required." }, 401);
    if (request.method === "GET" && url.pathname === "/admin/report") {
      return json(request, env, await buildAnnualNexusReport(env.DB, url.searchParams.get("year") || new Date().getFullYear(), mode));
    }
    if (request.method === "GET" && url.pathname === "/admin/orders") {
      return json(request, env, await listRecentOrders(env.DB, url.searchParams.get("limit") || 50, mode));
    }
    const fulfillmentMatch = url.pathname.match(/^\/admin\/orders\/([A-Za-z0-9-]+)\/fulfillment$/);
    if (request.method === "POST" && fulfillmentMatch) {
      const result = await updateOrderFulfillment(env.DB, fulfillmentMatch[1], await request.json());
      if (result.shipmentEmailQueued) ctx.waitUntil(flushEmailOutbox(env, `customer-shipped:${result.id}`));
      return json(request, env, result);
    }
    const cancelOrderMatch = url.pathname.match(/^\/admin\/orders\/([A-Za-z0-9-]+)\/cancel$/);
    if (request.method === "POST" && cancelOrderMatch) {
      const payload = await request.json().catch(() => ({}));
      return json(request, env, await cancelOrder(env.DB, cancelOrderMatch[1], mode, payload?.note), 200);
    }
    const deleteOrderMatch = url.pathname.match(/^\/admin\/orders\/([A-Za-z0-9-]+)$/);
    if (request.method === "DELETE" && deleteOrderMatch) {
      return json(request, env, await deleteSandboxOrder(env.DB, deleteOrderMatch[1], mode), 200);
    }
    const deleteOrderPostMatch = url.pathname.match(/^\/admin\/orders\/([A-Za-z0-9-]+)\/delete$/);
    if (request.method === "POST" && deleteOrderPostMatch) {
      return json(request, env, await deleteSandboxOrder(env.DB, deleteOrderPostMatch[1], mode), 200);
    }
    if (request.method === "POST" && url.pathname === "/admin/ohio-tax-rate") {
      return json(request, env, await saveOhioRate(env.DB, await request.json(), mode), 201);
    }
    if (request.method === "POST" && url.pathname === "/admin/shipping-rates") {
      return json(request, env, await saveShippingRates(env.DB, await request.json(), mode), 201);
    }
    if (request.method === "POST" && url.pathname === "/admin/expedition-prices") {
      return json(request, env, await saveExpeditionPriceRule(env.DB, await request.json(), mode), 201);
    }
    if (request.method === "POST" && url.pathname === "/admin/nexus-adjustments") {
      return json(request, env, await addNexusAdjustment(env.DB, await request.json()), 201);
    }
    const nexusRuleMatch = url.pathname.match(/^\/admin\/nexus-rules\/([A-Za-z]{2})$/);
    if (request.method === "POST" && nexusRuleMatch) {
      return json(request, env, await saveNexusRule(env.DB, nexusRuleMatch[1], await request.json()), 200);
    }
  }
  return json(request, env, { error: "Not found." }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("origin");
    if (origin && !allowedOrigins(env).has(origin)) return json(request, env, { error: "Origin not allowed." }, 403);
    try {
      return await route(request, env, ctx);
    } catch (error) {
      console.error("K4 commerce request failed", error);
      const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 400;
      return json(request, env, { error: error?.message || "Checkout request failed.", mode: String(env.PAYPAL_ENV || "sandbox") }, status);
    }
  },
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(flushEmailOutbox(env));
  },
};

