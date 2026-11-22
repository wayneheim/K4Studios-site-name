const PENDING = "status = 'paid' AND financial_status = 'paid' AND fulfillment_status = 'unfulfilled' AND processed_at IS NULL";

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export async function getOrderProcessingSummary(db, mode) {
  const row = await db.prepare(`SELECT COUNT(*) AS pending_count FROM orders WHERE mode = ? AND ${PENDING}`)
    .bind(mode).first();
  return { mode, pendingCount: Number(row?.pending_count || 0) };
}

export async function listTrackedOrders(db, mode, { view = "pending", limit = 25, cursor = null } = {}) {
  if (!["pending", "history"].includes(view)) throw new Error("Invalid order view.");
  const pageSize = Math.max(1, Math.min(50, Math.trunc(Number(limit)) || 25));
  if (cursor && (typeof cursor.createdAt !== "string" || cursor.createdAt.length > 40
    || !/^[A-Za-z0-9-]{1,80}$/.test(cursor.id || ""))) throw new Error("Invalid order cursor.");
  const values = [mode];
  let after = "";
  if (cursor) {
    after = "AND (created_at < ? OR (created_at = ? AND id < ?))";
    values.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }
  const { results = [] } = await db.prepare(`
    SELECT id, order_number, status, financial_status, fulfillment_status, processed_at,
      buyer_name, buyer_email, buyer_phone, shipping_address_json, verified_items_json, quote_json,
      merchandise_cents, shipping_cents, tax_cents, total_cents, created_at, paid_at,
      tracking_carrier, tracking_number, shipped_at,
      (SELECT status FROM email_outbox WHERE id = 'customer-processed:' || orders.id) AS processing_email_status,
      (SELECT status FROM email_outbox WHERE id = 'customer-shipped:' || orders.id) AS shipment_email_status
    FROM orders
    WHERE mode = ? AND (paid_at IS NOT NULL OR status = 'paid')
      AND ${view === "pending" ? `(${PENDING})` : `NOT (${PENDING})`} ${after}
    ORDER BY created_at DESC, id DESC LIMIT ?
  `).bind(...values, pageSize + 1).all();
  const page = results.slice(0, pageSize);
  const last = page.at(-1);
  return {
    mode, view,
    nextCursor: results.length > pageSize ? { createdAt: last.created_at, id: last.id } : null,
    orders: page.map((row) => {
      const quote = parseJson(row.quote_json, {});
      return ({
      id: row.id, orderNumber: row.order_number,
      paymentStatus: row.status, financialStatus: row.financial_status,
      fulfillmentStatus: row.fulfillment_status, processedAt: row.processed_at,
      buyerName: row.buyer_name, buyerEmail: row.buyer_email, buyerPhone: row.buyer_phone,
      shippingAddress: parseJson(row.shipping_address_json, {}),
      items: parseJson(row.verified_items_json, []),
      merchandiseCents: row.merchandise_cents, shippingCents: row.shipping_cents,
      merchandiseSubtotalCents: quote.merchandiseSubtotalCents ?? row.merchandise_cents,
      merchandiseDiscountCents: quote.merchandiseDiscountCents || 0,
      shippingDiscountCents: quote.shippingDiscountCents || 0,
      promotion: quote.promotion || null,
      taxCents: row.tax_cents, totalCents: row.total_cents,
      createdAt: row.created_at, paidAt: row.paid_at,
      trackingCarrier: row.tracking_carrier, trackingNumber: row.tracking_number, shippedAt: row.shipped_at,
      processingEmailStatus: row.processing_email_status || null,
      shipmentEmailStatus: row.shipment_email_status || null,
    }); }),
  };
}

export async function markOrderProcessed(db, orderId, mode) {
  const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND mode = ?").bind(orderId, mode).first();
  if (!order) throw new Error("Order not found.");
  if (order.processed_at || ["processing", "shipped", "fulfilled"].includes(order.fulfillment_status)) {
    return { id: order.id, orderNumber: order.order_number, alreadyProcessed: true, processingEmailQueued: false };
  }
  if (order.status !== "paid" || order.financial_status !== "paid" || order.fulfillment_status !== "unfulfilled") {
    throw new Error("Only a paid, unfulfilled order without a hold, refund, or dispute can be marked processed.");
  }
  const now = new Date().toISOString();
  const payload = {
    notificationType: "customer_processed", mode: order.mode,
    orderId: order.id, orderNumber: order.order_number,
    buyerName: order.buyer_name, buyerEmail: order.buyer_email,
    items: parseJson(order.verified_items_json, []),
    paypalCaptureId: "PROCESSING", processedAt: now,
  };
  // The state change, audit event, and email queue entry commit together. The
  // conditional update and fixed IDs also protect retries and concurrent clicks.
  const result = await db.batch([
    db.prepare(`UPDATE orders SET fulfillment_status = 'processing', processed_at = ?, updated_at = ?
      WHERE id = ? AND mode = ? AND ${PENDING}`).bind(now, now, order.id, mode),
    db.prepare(`INSERT OR IGNORE INTO order_fulfillment_events
      (id, order_id, from_status, to_status, note, created_at)
      SELECT ?, id, 'unfulfilled', 'processing', 'Reviewed; production ordered.', ?
      FROM orders WHERE id = ? AND processed_at = ? AND fulfillment_status = 'processing'`)
      .bind(`processed:${order.id}`, now, order.id, now),
    db.prepare(`INSERT OR IGNORE INTO email_outbox
      (id, order_id, event_type, status, attempts, next_attempt_at, payload_json, created_at)
      SELECT ?, id, 'customer_processed', 'pending', 0, ?, ?, ?
      FROM orders WHERE id = ? AND processed_at = ? AND fulfillment_status = 'processing'`)
      .bind(`customer-processed:${order.id}`, now, JSON.stringify(payload), now, order.id, now),
  ]);
  if (!Number(result[0]?.meta?.changes)) {
    const current = await db.prepare("SELECT processed_at FROM orders WHERE id = ? AND mode = ?").bind(order.id, mode).first();
    if (!current?.processed_at) throw new Error("The order changed. Refresh the tracker before processing it.");
    return { id: order.id, orderNumber: order.order_number, alreadyProcessed: true, processingEmailQueued: false };
  }
  return { id: order.id, orderNumber: order.order_number, processedAt: now, processingEmailQueued: true };
}

export async function emailOrderTracking(db, orderId, mode, payload) {
  const trackingCarrier = typeof payload?.trackingCarrier === "string" ? payload.trackingCarrier.trim() : "";
  const trackingNumber = typeof payload?.trackingNumber === "string" ? payload.trackingNumber.trim() : "";
  if (!["FedEx", "UPS", "USPS", "DHL", "SmugMug"].includes(trackingCarrier)) throw new Error("Select a shipping carrier.");
  if (!trackingNumber || trackingNumber.length > 120 || /[<>\u0000-\u001F\u007F]/.test(trackingNumber)) {
    throw new Error("Enter a valid tracking number of up to 120 characters.");
  }
  const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND mode = ?").bind(orderId, mode).first();
  if (!order) throw new Error("Order not found.");
  if (order.status !== "paid" || order.financial_status !== "paid"
    || !["unfulfilled", "processing", "shipped", "fulfilled"].includes(order.fulfillment_status)
    || (!order.processed_at && order.fulfillment_status === "unfulfilled")) {
    throw new Error("Tracking can be emailed only for a processed, paid order without a hold, refund, or dispute.");
  }
  const outboxId = `customer-shipped:${order.id}`;
  const existing = await db.prepare("SELECT status FROM email_outbox WHERE id = ?").bind(outboxId).first();
  if (existing) return { id: order.id, alreadyQueued: true, shipmentEmailQueued: false, shipmentEmailStatus: existing.status };
  const now = new Date().toISOString();
  const shippedAt = order.shipped_at || now;
  const emailPayload = {
    notificationType: "customer_shipped", mode: order.mode,
    orderId: order.id, orderNumber: order.order_number,
    buyerName: order.buyer_name, buyerEmail: order.buyer_email,
    items: parseJson(order.verified_items_json, []),
    paypalCaptureId: "FULFILLMENT", trackingCarrier, trackingNumber, shippedAt,
  };
  const result = await db.batch([
    db.prepare(`UPDATE orders SET
      fulfillment_status = CASE WHEN fulfillment_status = 'fulfilled' THEN 'fulfilled' ELSE 'shipped' END,
      tracking_carrier = ?, tracking_number = ?, shipped_at = COALESCE(shipped_at, ?), updated_at = ?
      WHERE id = ? AND mode = ? AND status = 'paid' AND financial_status = 'paid'
        AND fulfillment_status IN ('unfulfilled', 'processing', 'shipped', 'fulfilled')
        AND (processed_at IS NOT NULL OR fulfillment_status <> 'unfulfilled')
        AND NOT EXISTS (SELECT 1 FROM email_outbox WHERE id = ?)`)
      .bind(trackingCarrier, trackingNumber, shippedAt, now, order.id, mode, outboxId),
    db.prepare(`INSERT OR IGNORE INTO order_fulfillment_events
      (id, order_id, from_status, to_status, tracking_carrier, tracking_number, note, created_at)
      SELECT ?, id, ?, fulfillment_status, tracking_carrier, tracking_number, 'Customer tracking email requested.', ?
      FROM orders WHERE id = ? AND updated_at = ? AND tracking_carrier = ? AND tracking_number = ?
        AND fulfillment_status IN ('shipped', 'fulfilled')`)
      .bind(`shipped:${order.id}`, order.fulfillment_status, now, order.id, now, trackingCarrier, trackingNumber),
    db.prepare(`INSERT OR IGNORE INTO email_outbox
      (id, order_id, event_type, status, attempts, next_attempt_at, payload_json, created_at)
      SELECT ?, id, 'customer_shipped', 'pending', 0, ?, ?, ?
      FROM orders WHERE id = ? AND updated_at = ? AND tracking_carrier = ? AND tracking_number = ?
        AND fulfillment_status IN ('shipped', 'fulfilled')`)
      .bind(outboxId, now, JSON.stringify(emailPayload), now, order.id, now, trackingCarrier, trackingNumber),
  ]);
  if (!Number(result[0]?.meta?.changes)) {
    const queued = await db.prepare("SELECT status FROM email_outbox WHERE id = ?").bind(outboxId).first();
    if (!queued) throw new Error("The order changed. Refresh the tracker before emailing tracking.");
    return { id: order.id, alreadyQueued: true, shipmentEmailQueued: false, shipmentEmailStatus: queued.status };
  }
  return { id: order.id, shippedAt, trackingCarrier, trackingNumber, shipmentEmailQueued: true, shipmentEmailStatus: "pending" };
}
