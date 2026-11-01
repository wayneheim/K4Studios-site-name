import { getPendingOutbox, markOutboxRetry, markOutboxSent } from "./database.js";

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sign(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function deliverRow(env, row) {
  if (!env.ORDER_EMAIL_ENDPOINT || !env.ORDER_EMAIL_SHARED_SECRET) {
    throw new Error("The signed order email service is not configured.");
  }
  const body = row.payload_json;
  const timestamp = String(Date.now());
  const signature = await sign(env.ORDER_EMAIL_SHARED_SECRET, `${timestamp}.${body}`);
  const response = await fetch(env.ORDER_EMAIL_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-k4-timestamp": timestamp,
      "x-k4-signature": signature,
    },
    body,
  });
  if (!response.ok) throw new Error(`Order email service returned ${response.status}.`);
}

export async function flushEmailOutbox(env, specificId = null) {
  const result = await getPendingOutbox(env.DB, specificId);
  const rows = specificId ? (result ? [result] : []) : (result?.results || []);
  for (const row of rows) {
    try {
      await deliverRow(env, row);
      await markOutboxSent(env.DB, row.id);
    } catch (error) {
      await markOutboxRetry(env.DB, row, error);
    }
  }
}

