function nowIso() {
  return new Date().toISOString();
}

export async function insertPendingOrder(db, { order, rawCart, verifiedItems, quote, shippingAddress }) {
  const now = nowIso();
  await db.prepare(`
    INSERT INTO orders (
      id, order_number, mode, status, currency,
      merchandise_cents, shipping_cents, tax_cents, total_cents,
      tax_jurisdiction_country, tax_jurisdiction_state, tax_jurisdiction_code,
      tax_rate_basis_points, tax_rule_label, tax_config_version,
      shipping_method_label, shipping_config_version,
      buyer_name, buyer_email, buyer_phone, shipping_address_json,
      raw_cart_json, verified_items_json, quote_json, created_at, updated_at
    ) VALUES (?, ?, ?, 'creating_payment', 'USD', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    order.id, order.orderNumber, order.mode,
    quote.merchandiseCents, quote.shippingCents, quote.taxCents, quote.totalCents,
    quote.tax.jurisdictionCountry, quote.tax.jurisdictionState, quote.tax.jurisdictionCode,
    quote.tax.rateBasisPoints, quote.tax.ruleLabel, quote.tax.configVersion,
    quote.shipping.methodLabel, quote.shipping.configVersion,
    order.buyerName, order.buyerEmail, order.buyerPhone || null,
    JSON.stringify(shippingAddress), JSON.stringify(rawCart), JSON.stringify(verifiedItems), JSON.stringify(quote),
    now, now,
  ).run();
}

export async function markPayPalOrderCreated(db, localOrderId, paypalOrderId, paypalStatus, debugId) {
  await db.prepare(`
    UPDATE orders
    SET status = 'pending_approval', paypal_order_id = ?, paypal_order_status = ?, paypal_debug_id = ?, updated_at = ?
    WHERE id = ?
  `).bind(paypalOrderId, paypalStatus, debugId || null, nowIso(), localOrderId).run();
}

export async function markOrderCreationFailed(db, localOrderId, message) {
  await db.prepare(`
    UPDATE orders SET status = 'payment_creation_failed', paypal_debug_id = ?, updated_at = ? WHERE id = ?
  `).bind(String(message || "").slice(0, 200), nowIso(), localOrderId).run();
}

export async function getOrderByPayPalId(db, paypalOrderId) {
  return db.prepare("SELECT * FROM orders WHERE paypal_order_id = ?")
    .bind(paypalOrderId).first();
}

export async function markApprovalReversed(db, order) {
  const now = nowIso();
  await db.batch([
    db.prepare(`
      UPDATE orders
      SET status = 'payment_approval_reversed', financial_status = 'approval_reversed',
          fulfillment_status = CASE
            WHEN fulfillment_status IN ('shipped', 'fulfilled') THEN fulfillment_status
            ELSE 'on_hold'
          END,
          last_financial_event_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(now, now, order.id),
    db.prepare(`
      INSERT OR IGNORE INTO order_financial_events (
        id, order_id, event_type, provider_event_id, provider_resource_id,
        from_status, to_status, amount_cents, note, created_at
      ) VALUES (?, ?, 'CHECKOUT.PAYMENT-APPROVAL.REVERSED', NULL, ?, ?, 'approval_reversed', 0, ?, ?)
    `).bind(
      `approval-reversed:${order.id}`, order.id, order.paypal_order_id,
      order.financial_status, 'PayPal reversed checkout approval before capture.', now,
    ),
  ]);
}

export async function savePaymentAndQueueEmail(db, order, capture, rawTransaction) {
  const now = nowIso();
  const captureId = String(capture?.id || "");
  const status = String(capture?.status || "UNKNOWN");
  const amountCents = Math.round(Number(capture?.amount?.value || 0) * 100);
  const paymentId = `paypal:${captureId}`;
  const outboxId = `order-paid:${order.id}`;
  const customerOutboxId = `customer-confirmation:${order.id}`;
  const emailPayload = {
    orderId: order.id,
    orderNumber: order.order_number,
    mode: order.mode,
    buyerName: order.buyer_name,
    buyerEmail: order.buyer_email,
    buyerPhone: order.buyer_phone,
    shippingAddress: JSON.parse(order.shipping_address_json),
    items: JSON.parse(order.verified_items_json),
    quote: JSON.parse(order.quote_json),
    paypalOrderId: order.paypal_order_id,
    paypalCaptureId: captureId,
    paymentStatus: status,
    paidAt: now,
  };
  const merchantPayload = { ...emailPayload, notificationType: "merchant_order_paid" };
  const customerPayload = { ...emailPayload, notificationType: "customer_confirmation" };

  const statements = [
    db.prepare(`
      INSERT INTO payments (
        id, order_id, provider, provider_order_id, provider_capture_id, status,
        amount_cents, currency, payer_id, payer_email, raw_transaction_json, created_at, updated_at
      ) VALUES (?, ?, 'paypal', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider_capture_id) DO UPDATE SET
        status = excluded.status, raw_transaction_json = excluded.raw_transaction_json, updated_at = excluded.updated_at
    `).bind(
      paymentId, order.id, order.paypal_order_id, captureId, status,
      amountCents, String(capture?.amount?.currency_code || "USD"),
      rawTransaction?.payer?.payer_id || null, rawTransaction?.payer?.email_address || null,
      JSON.stringify(rawTransaction), now, now,
    ),
    db.prepare(`
      UPDATE orders
      SET status = ?, paypal_order_status = ?,
          financial_status = CASE WHEN ? = 'COMPLETED' THEN 'paid' WHEN ? = 'DENIED' THEN 'denied' ELSE financial_status END,
          paid_at = CASE WHEN ? = 'COMPLETED' THEN COALESCE(paid_at, ?) ELSE paid_at END, updated_at = ?
      WHERE id = ?
    `).bind(
      status === "COMPLETED" ? "paid" : `payment_${status.toLowerCase()}`,
      status, status, status, status, now, now, order.id,
    ),
  ];

  // Pending and denied payments are retained in the transaction ledger, but a
  // paid-order notification is queued only after PayPal says COMPLETED.
  if (status === "COMPLETED") {
    statements.push(db.prepare(`
        INSERT OR IGNORE INTO email_outbox (
          id, order_id, event_type, status, attempts, next_attempt_at, payload_json, created_at
        ) VALUES (?, ?, 'order_paid', 'pending', 0, ?, ?, ?)
      `).bind(outboxId, order.id, now, JSON.stringify(merchantPayload), now));
    statements.push(db.prepare(`
        INSERT OR IGNORE INTO email_outbox (
          id, order_id, event_type, status, attempts, next_attempt_at, payload_json, created_at
        ) VALUES (?, ?, 'customer_confirmation', 'pending', 0, ?, ?, ?)
      `).bind(customerOutboxId, order.id, now, JSON.stringify(customerPayload), now));
  }

  await db.batch(statements);

  return {
    paymentId,
    outboxId: status === "COMPLETED" ? outboxId : null,
    customerOutboxId: status === "COMPLETED" ? customerOutboxId : null,
    outboxIds: status === "COMPLETED" ? [outboxId, customerOutboxId] : [],
    status,
    amountCents,
  };
}

export async function recordWebhookEvent(db, event, verificationStatus) {
  const now = nowIso();
  const resource = event?.resource || {};
  const relatedOrderId = resource?.supplementary_data?.related_ids?.order_id || null;
  const result = await db.prepare(`
    INSERT OR IGNORE INTO paypal_webhook_events (
      event_id, event_type, provider_order_id, provider_capture_id,
      verification_status, payload_json, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event.id, event.event_type, relatedOrderId, resource.id || null,
    verificationStatus, JSON.stringify(event), now,
  ).run();
  return Boolean(result.meta?.changes);
}

export async function getWebhookEvent(db, eventId) {
  return db.prepare("SELECT event_id, processed_at, processing_error FROM paypal_webhook_events WHERE event_id = ?")
    .bind(eventId).first();
}

export async function markWebhookProcessed(db, eventId, error = null) {
  await db.prepare(`
    UPDATE paypal_webhook_events SET processed_at = ?, processing_error = ? WHERE event_id = ?
  `).bind(nowIso(), error ? String(error).slice(0, 500) : null, eventId).run();
}

export async function getPendingOutbox(db, id = null) {
  if (id) return db.prepare("SELECT * FROM email_outbox WHERE id = ? AND status != 'sent'").bind(id).first();
  return db.prepare(`
    SELECT * FROM email_outbox
    WHERE status IN ('pending', 'retry') AND next_attempt_at <= ?
    ORDER BY created_at ASC LIMIT 20
  `).bind(nowIso()).all();
}

export async function markOutboxSent(db, id) {
  await db.prepare("UPDATE email_outbox SET status = 'sent', sent_at = ?, last_error = NULL WHERE id = ?")
    .bind(nowIso(), id).run();
}

export async function markOutboxRetry(db, row, error) {
  const attempts = Number(row.attempts || 0) + 1;
  const delayMinutes = Math.min(60, 2 ** Math.min(attempts, 6));
  const next = new Date(Date.now() + delayMinutes * 60_000).toISOString();
  await db.prepare(`
    UPDATE email_outbox SET status = 'retry', attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?
  `).bind(attempts, next, String(error?.message || error || "Email delivery failed").slice(0, 500), row.id).run();
}

