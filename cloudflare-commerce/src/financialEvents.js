function nowIso() {
  return new Date().toISOString();
}

function cents(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

export function extractRefundCaptureId(resource) {
  const direct = resource?.supplementary_data?.related_ids?.capture_id;
  if (direct) return String(direct);
  const upLink = (resource?.links || []).find((link) => link?.rel === "up")?.href || "";
  const match = String(upLink).match(/\/v2\/payments\/captures\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

export function extractDisputeCaptureId(resource) {
  const transaction = Array.isArray(resource?.disputed_transactions) ? resource.disputed_transactions[0] : null;
  return String(
    transaction?.seller_transaction_id
    || transaction?.seller_transaction_information?.transaction_id
    || resource?.supplementary_data?.related_ids?.capture_id
    || "",
  );
}

async function getOrderByCaptureId(db, captureId) {
  if (!captureId) return null;
  return db.prepare(`
    SELECT o.*
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.provider_capture_id = ?
    LIMIT 1
  `).bind(captureId).first();
}

async function queueMerchantAlert(db, order, event, details) {
  const now = nowIso();
  const eventId = String(event?.id || crypto.randomUUID());
  const payload = {
    notificationType: "merchant_financial_alert",
    mode: order.mode,
    orderId: order.id,
    orderNumber: order.order_number,
    buyerName: order.buyer_name,
    buyerEmail: order.buyer_email,
    buyerPhone: order.buyer_phone,
    shippingAddress: parseJson(order.shipping_address_json, {}),
    items: parseJson(order.verified_items_json, []),
    quote: parseJson(order.quote_json, {}),
    paypalOrderId: order.paypal_order_id,
    paypalCaptureId: details.captureId || "FINANCIAL-EVENT",
    financialEventType: event.event_type,
    financialStatus: details.financialStatus,
    financialAmountCents: details.amountCents || 0,
    providerResourceId: details.resourceId || "",
    disputeReason: details.reason || "",
    eventAt: event.create_time || now,
  };
  const outboxId = `financial-alert:${eventId}`;
  await db.prepare(`
    INSERT OR IGNORE INTO email_outbox (
      id, order_id, event_type, status, attempts, next_attempt_at, payload_json, created_at
    ) VALUES (?, ?, ?, 'pending', 0, ?, ?, ?)
  `).bind(outboxId, order.id, `financial_alert:${eventId}`, now, JSON.stringify(payload), now).run();
  return outboxId;
}

function holdStatus(order) {
  return ["shipped", "fulfilled"].includes(order.fulfillment_status)
    ? order.fulfillment_status
    : "on_hold";
}

async function updateFinancialState(db, order, event, details) {
  const now = nowIso();
  const nextFulfillment = details.holdFulfillment ? holdStatus(order) : order.fulfillment_status;
  const statements = [
    db.prepare(`
      UPDATE orders
      SET financial_status = ?, refunded_cents = ?, disputed_cents = ?,
          fulfillment_status = ?, last_financial_event_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      details.financialStatus,
      details.refundedCents ?? Number(order.refunded_cents || 0),
      details.disputedCents ?? Number(order.disputed_cents || 0),
      nextFulfillment,
      now,
      now,
      order.id,
    ),
    db.prepare(`
      INSERT OR IGNORE INTO order_financial_events (
        id, order_id, event_type, provider_event_id, provider_resource_id,
        from_status, to_status, amount_cents, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      `paypal:${event.id}`,
      order.id,
      event.event_type,
      event.id,
      details.resourceId || null,
      order.financial_status,
      details.financialStatus,
      details.amountCents || 0,
      details.reason || null,
      now,
    ),
  ];
  if (nextFulfillment !== order.fulfillment_status) {
    statements.push(db.prepare(`
      INSERT INTO order_fulfillment_events (
        id, order_id, from_status, to_status, tracking_carrier, tracking_number, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), order.id, order.fulfillment_status, nextFulfillment,
      order.tracking_carrier || null, order.tracking_number || null,
      `Automatic hold: ${event.event_type}`, now,
    ));
  }
  await db.batch(statements);
}

export async function recordRefundEvent(db, event) {
  const resource = event.resource || {};
  const captureId = extractRefundCaptureId(resource);
  const order = await getOrderByCaptureId(db, captureId);
  if (!order) return { matched: false, outboxIds: [] };

  const amountCents = cents(resource?.amount?.value);
  const currency = String(resource?.amount?.currency_code || "USD");
  if (!resource.id || currency !== "USD" || amountCents <= 0) throw new Error("Invalid PayPal refund payload.");
  const now = nowIso();
  await db.prepare(`
    INSERT INTO payment_refunds (
      provider_refund_id, order_id, provider_capture_id, status, amount_cents,
      currency, note, raw_event_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider_refund_id) DO UPDATE SET
      status = excluded.status,
      amount_cents = excluded.amount_cents,
      raw_event_json = excluded.raw_event_json,
      updated_at = excluded.updated_at
  `).bind(
    resource.id, order.id, captureId, String(resource.status || "COMPLETED"),
    amountCents, currency, resource.note_to_payer || null, JSON.stringify(event), now, now,
  ).run();

  const totals = await db.prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) AS refunded_cents
    FROM payment_refunds
    WHERE order_id = ? AND UPPER(status) IN ('COMPLETED', 'SUCCESS')
  `).bind(order.id).first();
  const refundedCents = Number(totals?.refunded_cents || 0);
  const financialStatus = refundedCents >= Number(order.total_cents) ? "refunded" : "partially_refunded";
  await updateFinancialState(db, order, event, {
    financialStatus,
    refundedCents,
    amountCents,
    resourceId: resource.id,
    captureId,
    holdFulfillment: true,
  });
  const outboxId = await queueMerchantAlert(db, order, event, {
    financialStatus, amountCents, resourceId: resource.id, captureId,
  });
  return { matched: true, orderId: order.id, outboxIds: [outboxId] };
}

export async function recordCaptureReversal(db, event) {
  const resource = event.resource || {};
  const captureId = String(resource.id || resource?.supplementary_data?.related_ids?.capture_id || "");
  const order = await getOrderByCaptureId(db, captureId);
  if (!order) return { matched: false, outboxIds: [] };
  const amountCents = cents(resource?.amount?.value);
  await updateFinancialState(db, order, event, {
    financialStatus: "reversed",
    amountCents,
    resourceId: resource.id,
    captureId,
    holdFulfillment: true,
  });
  const outboxId = await queueMerchantAlert(db, order, event, {
    financialStatus: "reversed", amountCents, resourceId: resource.id, captureId,
  });
  return { matched: true, orderId: order.id, outboxIds: [outboxId] };
}

export async function recordDisputeEvent(db, event) {
  const resource = event.resource || {};
  const captureId = extractDisputeCaptureId(resource);
  const order = await getOrderByCaptureId(db, captureId);
  const amountCents = cents(resource?.dispute_amount?.value);
  const currency = String(resource?.dispute_amount?.currency_code || "USD");
  const disputeId = String(resource.dispute_id || resource.id || "");
  if (!disputeId) throw new Error("Invalid PayPal dispute payload.");
  const status = String(resource.status || event.event_type.replace("CUSTOMER.DISPUTE.", ""));
  const reason = String(resource.reason || "");
  const now = nowIso();
  await db.prepare(`
    INSERT INTO payment_disputes (
      provider_dispute_id, order_id, provider_capture_id, status, reason,
      amount_cents, currency, outcome_code, raw_event_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider_dispute_id) DO UPDATE SET
      order_id = COALESCE(excluded.order_id, payment_disputes.order_id),
      provider_capture_id = COALESCE(excluded.provider_capture_id, payment_disputes.provider_capture_id),
      status = excluded.status,
      reason = excluded.reason,
      amount_cents = excluded.amount_cents,
      outcome_code = excluded.outcome_code,
      raw_event_json = excluded.raw_event_json,
      updated_at = excluded.updated_at
  `).bind(
    disputeId, order?.id || null, captureId || null, status, reason || null,
    amountCents, currency || null, resource?.dispute_outcome?.outcome_code || null,
    JSON.stringify(event), now, now,
  ).run();
  if (!order) return { matched: false, outboxIds: [] };

  const resolved = event.event_type === "CUSTOMER.DISPUTE.RESOLVED";
  const financialStatus = resolved ? "dispute_resolved" : "disputed";
  await updateFinancialState(db, order, event, {
    financialStatus,
    disputedCents: resolved ? 0 : amountCents,
    amountCents,
    resourceId: disputeId,
    captureId,
    reason,
    holdFulfillment: !resolved,
  });
  const outboxId = await queueMerchantAlert(db, order, event, {
    financialStatus, amountCents, resourceId: disputeId, captureId, reason,
  });
  return { matched: true, orderId: order.id, outboxIds: [outboxId] };
}
