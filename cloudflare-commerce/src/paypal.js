import { centsToDecimal } from "../../src/lib/commerce/server/money.js";
import { buildPayPalLineItems } from "./paypalLineItems.js";

const PAYPAL_APIS = Object.freeze({
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
});

function paypalMode(env) {
  const mode = String(env.PAYPAL_ENV || "sandbox").toLowerCase();
  if (!PAYPAL_APIS[mode]) throw new Error("PAYPAL_ENV must be sandbox or live.");
  if (mode === "live" && env.LIVE_CONFIGURATION_APPROVED !== "true") {
    throw new Error("Live PayPal is locked until the reviewed live configuration is approved.");
  }
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
    throw new Error(`PayPal ${mode} credentials are not configured.`);
  }
  return mode;
}

async function parsePayPalResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || body?.name || `PayPal request failed (${response.status}).`);
    error.status = response.status;
    error.debugId = response.headers.get("paypal-debug-id") || "";
    error.details = body;
    throw error;
  }
  return { body, debugId: response.headers.get("paypal-debug-id") || "" };
}

export async function getPayPalAccessToken(env) {
  const mode = paypalMode(env);
  const response = await fetch(`${PAYPAL_APIS[mode]}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const { body } = await parsePayPalResponse(response);
  return body.access_token;
}

async function paypalFetch(env, pathname, options = {}) {
  const mode = paypalMode(env);
  const accessToken = await getPayPalAccessToken(env);
  const response = await fetch(`${PAYPAL_APIS[mode]}${pathname}`, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  return parsePayPalResponse(response);
}

export async function createPayPalOrder(env, localOrder, quote, shippingAddress) {
  paypalMode(env);
  const body = {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: localOrder.id,
      custom_id: localOrder.id,
      invoice_id: localOrder.orderNumber,
      description: "Physical K4 Studios fine art prints",
      amount: {
        currency_code: "USD",
        value: centsToDecimal(quote.totalCents),
        breakdown: {
          item_total: { currency_code: "USD", value: centsToDecimal(quote.merchandiseCents) },
          shipping: { currency_code: "USD", value: centsToDecimal(quote.shippingCents) },
          tax_total: { currency_code: "USD", value: centsToDecimal(quote.taxCents) },
        },
      },
      items: buildPayPalLineItems(quote.items, quote.taxCents),
      shipping: {
        name: { full_name: localOrder.buyerName },
        address: {
          address_line_1: shippingAddress.addressLine1,
          ...(shippingAddress.addressLine2 ? { address_line_2: shippingAddress.addressLine2 } : {}),
          admin_area_2: shippingAddress.city,
          admin_area_1: shippingAddress.stateCode,
          postal_code: shippingAddress.postalCode,
          country_code: "US",
        },
      },
    }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "K4 Studios",
          landing_page: "GUEST_CHECKOUT",
          shipping_preference: "SET_PROVIDED_ADDRESS",
          user_action: "PAY_NOW",
        },
      },
    },
  };

  return paypalFetch(env, "/v2/checkout/orders", {
    method: "POST",
    headers: { "paypal-request-id": `create-${localOrder.id}` },
    body: JSON.stringify(body),
  });
}

export function assertPayPalOrderMatches(paypalOrder, localOrder) {
  const purchaseUnit = paypalOrder?.purchase_units?.[0];
  const expected = centsToDecimal(localOrder.total_cents);
  if (!purchaseUnit || purchaseUnit.custom_id !== localOrder.id || purchaseUnit.invoice_id !== localOrder.order_number) {
    throw new Error("PayPal order identity does not match the saved K4 order.");
  }
  if (purchaseUnit.amount?.currency_code !== "USD" || purchaseUnit.amount?.value !== expected) {
    throw new Error("PayPal order total does not match the saved K4 order.");
  }
  const breakdown = purchaseUnit.amount?.breakdown || {};
  const expectedBreakdown = {
    item_total: centsToDecimal(localOrder.merchandise_cents),
    shipping: centsToDecimal(localOrder.shipping_cents),
    tax_total: centsToDecimal(localOrder.tax_cents),
  };
  for (const [key, value] of Object.entries(expectedBreakdown)) {
    if (breakdown[key]?.currency_code !== "USD" || breakdown[key]?.value !== value) {
      throw new Error(`PayPal ${key} does not match the server-calculated K4 order.`);
    }
  }

  const expectedAddress = JSON.parse(localOrder.shipping_address_json);
  const paypalAddress = purchaseUnit.shipping?.address || {};
  const normalized = (value) => String(value || "").trim().toUpperCase();
  const addressChecks = [
    [paypalAddress.address_line_1, expectedAddress.addressLine1],
    [paypalAddress.address_line_2, expectedAddress.addressLine2],
    [paypalAddress.admin_area_2, expectedAddress.city],
    [paypalAddress.admin_area_1, expectedAddress.stateCode],
    [paypalAddress.postal_code, expectedAddress.postalCode],
    [paypalAddress.country_code, "US"],
  ];
  if (addressChecks.some(([actual, stored]) => normalized(actual) !== normalized(stored))) {
    throw new Error("PayPal shipping address does not match the address used for shipping and tax calculation.");
  }
}

export async function getPayPalOrder(env, paypalOrderId) {
  return paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`, { method: "GET" });
}

export async function capturePayPalOrder(env, paypalOrderId, localOrderId) {
  return paypalFetch(env, `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: "POST",
    headers: { "paypal-request-id": `capture-${localOrderId}` },
    body: "{}",
  });
}

export async function verifyPayPalWebhook(env, request, event) {
  if (!env.PAYPAL_WEBHOOK_ID) throw new Error("PAYPAL_WEBHOOK_ID is not configured.");
  const verification = await paypalFetch(env, "/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: request.headers.get("paypal-auth-algo"),
      cert_url: request.headers.get("paypal-cert-url"),
      transmission_id: request.headers.get("paypal-transmission-id"),
      transmission_sig: request.headers.get("paypal-transmission-sig"),
      transmission_time: request.headers.get("paypal-transmission-time"),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    }),
  });
  return verification.body?.verification_status === "SUCCESS";
}

