import { getCurrentShippingRule, saveShippingRule } from "./shippingRuleStore.js";
import { getCurrentExpeditionPriceRule } from "./expeditionPriceStore.js";

function nowIso() {
  return new Date().toISOString();
}

function validYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2018 || year > 2100) throw new Error("Invalid report year.");
  return year;
}

export async function isAdminAuthorized(request, env) {
  const authorization = String(request.headers.get("authorization") || "");
  let configured = String(env.COMMERCE_ADMIN_PASSWORD || "");
  let supplied = "";
  if (/^Basic\s+/i.test(authorization)) {
    try {
      const decoded = atob(authorization.replace(/^Basic\s+/i, ""));
      const separator = decoded.indexOf(":");
      const username = separator >= 0 ? decoded.slice(0, separator) : "";
      supplied = separator >= 0 ? decoded.slice(separator + 1) : "";
      if (username !== "k4admin") return false;
    } catch {
      return false;
    }
    if (!configured && supplied) {
      try {
        const response = await fetch(String(env.ANALYTICS_AUTH_CHECK_URL || "https://edge.k4studios.com/__k4stats/recent?minutes=1&limit=1"), {
          headers: { authorization },
          redirect: "manual",
        });
        console.warn("Commerce admin stats-password verification", { status: response.status });
        return response.status === 200;
      } catch (error) {
        console.warn("Commerce admin stats-password verification failed", { message: error?.message || String(error) });
        return false;
      }
    }
  } else {
    configured = String(env.COMMERCE_ADMIN_TOKEN || "");
    supplied = authorization.replace(/^Bearer\s+/i, "");
  }
  if (!configured || !supplied) return false;
  const digest = async (value) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [expected, actual] = await Promise.all([digest(configured), digest(supplied)]);
  if (expected.length !== actual.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ actual[index];
  return difference === 0;
}

function thresholdState(row) {
  if (row.physical_activity) return "physical_activity_review";
  if (row.rule_type === "home_state") return "collecting_home_state";
  if (row.rule_type === "no_statewide_sales_tax") return "no_statewide_sales_tax";
  if (row.verification_status === "needs_review") return "rule_needs_review";

  const revenueRatio = row.revenue_threshold_cents
    ? row.reportable_sales_cents / row.revenue_threshold_cents
    : 0;
  const transactionRatio = row.transaction_threshold
    ? row.reportable_transactions / row.transaction_threshold
    : 0;
  const reachedRevenue = Boolean(row.revenue_threshold_cents) && revenueRatio >= 1;
  const reachedTransactions = Boolean(row.transaction_threshold) && transactionRatio >= 1;
  const warningRevenue = Boolean(row.revenue_threshold_cents) && revenueRatio >= 0.75;
  const warningTransactions = Boolean(row.transaction_threshold) && transactionRatio >= 0.75;

  const reached = row.threshold_logic === "both"
    ? reachedRevenue && reachedTransactions
    : reachedRevenue || reachedTransactions;
  const warning = row.threshold_logic === "both"
    ? warningRevenue && warningTransactions
    : warningRevenue || warningTransactions;
  if (reached) return "threshold_reached_review_required";
  if (warning) return "approaching_threshold";
  return "below_configured_threshold";
}

export async function buildAnnualNexusReport(db, requestedYear, mode = "sandbox") {
  const year = validYear(requestedYear);
  const { results = [] } = await db.prepare(`
    WITH direct AS (
      SELECT tax_jurisdiction_state AS state_code,
        COUNT(*) AS direct_order_count,
        COALESCE(SUM(merchandise_cents + shipping_cents), 0) AS direct_sales_cents,
        COALESCE(SUM(tax_cents), 0) AS tax_collected_cents
      FROM orders
      WHERE mode = ? AND status = 'paid' AND substr(paid_at, 1, 4) = ?
      GROUP BY tax_jurisdiction_state
    ), adjustments AS (
      SELECT state_code,
        COALESCE(SUM(sales_cents), 0) AS adjustment_sales_cents,
        COALESCE(SUM(transaction_count), 0) AS adjustment_transactions
      FROM nexus_adjustments WHERE calendar_year = ? GROUP BY state_code
    )
    SELECT rules.*,
      COALESCE(direct.direct_order_count, 0) AS direct_order_count,
      COALESCE(direct.direct_sales_cents, 0) AS direct_sales_cents,
      COALESCE(direct.tax_collected_cents, 0) AS tax_collected_cents,
      COALESCE(adjustments.adjustment_sales_cents, 0) AS adjustment_sales_cents,
      COALESCE(adjustments.adjustment_transactions, 0) AS adjustment_transactions,
      COALESCE(activity.physical_activity, 0) AS physical_activity,
      activity.activity_note, activity.review_status AS activity_review_status
    FROM nexus_rules rules
    LEFT JOIN direct ON direct.state_code = rules.state_code
    LEFT JOIN adjustments ON adjustments.state_code = rules.state_code
    LEFT JOIN state_activity activity ON activity.state_code = rules.state_code
    ORDER BY rules.state_name
  `).bind(mode, String(year), year).all();

  const rows = results.map((raw) => {
    const row = {
      ...raw,
      reportable_sales_cents: Number(raw.direct_sales_cents) + Number(raw.adjustment_sales_cents),
      reportable_transactions: Number(raw.direct_order_count) + Number(raw.adjustment_transactions),
    };
    return {
      ...row,
      revenue_progress_percent: row.revenue_threshold_cents
        ? Math.round((row.reportable_sales_cents / row.revenue_threshold_cents) * 10000) / 100
        : null,
      transaction_progress_percent: row.transaction_threshold
        ? Math.round((row.reportable_transactions / row.transaction_threshold) * 10000) / 100
        : null,
      alert_status: thresholdState(row),
    };
  });

  const ohioRule = await db.prepare(`
    SELECT * FROM tax_jurisdiction_rules
    WHERE mode = ? AND country_code = 'US' AND state_code = 'OH' AND enabled = 1
    ORDER BY effective_from DESC LIMIT 1
  `).bind(mode).first();
  const shippingRule = await getCurrentShippingRule(db, mode);
  const expeditionPriceRule = await getCurrentExpeditionPriceRule(db, mode);

  return {
    year,
    mode,
    generatedAt: nowIso(),
    rows,
    ohioTaxRule: ohioRule,
    shippingRule,
    expeditionPriceRule,
    totals: {
      directSalesCents: rows.reduce((sum, row) => sum + Number(row.direct_sales_cents), 0),
      adjustedSalesCents: rows.reduce((sum, row) => sum + Number(row.adjustment_sales_cents), 0),
      reportableSalesCents: rows.reduce((sum, row) => sum + Number(row.reportable_sales_cents), 0),
      directOrders: rows.reduce((sum, row) => sum + Number(row.direct_order_count), 0),
      adjustedTransactions: rows.reduce((sum, row) => sum + Number(row.adjustment_transactions), 0),
      taxCollectedCents: rows.reduce((sum, row) => sum + Number(row.tax_collected_cents), 0),
    },
  };
}

export async function saveShippingRates(db, payload, mode = "sandbox") {
  return saveShippingRule(db, payload, mode);
}

export async function saveOhioRate(db, payload, mode = "sandbox") {
  const rateBasisPoints = Number(payload?.rateBasisPoints);
  const effectiveFrom = String(payload?.effectiveFrom || "");
  const label = String(payload?.label || "").trim().slice(0, 160);
  const sourceUrl = String(payload?.sourceUrl || "").trim().slice(0, 500);
  if (!Number.isInteger(rateBasisPoints) || rateBasisPoints < 0 || rateBasisPoints > 10000) throw new Error("Rate must be integer basis points.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) throw new Error("An effective date is required.");
  if (!label) throw new Error("A descriptive rate label is required.");
  const id = `${mode}-us-oh-${effectiveFrom}-${rateBasisPoints}`;
  const now = nowIso();
  await db.prepare(`
    INSERT INTO tax_jurisdiction_rules (
      id, mode, country_code, state_code, rate_basis_points, tax_shipping,
      label, source_url, effective_from, enabled, updated_at
    ) VALUES (?, ?, 'US', 'OH', ?, ?, ?, ?, ?, 1, ?)
    ON CONFLICT(mode, country_code, state_code, effective_from) DO UPDATE SET
      rate_basis_points = excluded.rate_basis_points,
      tax_shipping = excluded.tax_shipping,
      label = excluded.label,
      source_url = excluded.source_url,
      enabled = 1,
      updated_at = excluded.updated_at
  `).bind(id, mode, rateBasisPoints, payload?.taxShipping === false ? 0 : 1, label, sourceUrl || null, effectiveFrom, now).run();
  return { id, mode, rateBasisPoints, effectiveFrom, label, sourceUrl, taxShipping: payload?.taxShipping !== false, updatedAt: now };
}

export async function addNexusAdjustment(db, payload) {
  const calendarYear = validYear(payload?.calendarYear);
  const stateCode = String(payload?.stateCode || "").toUpperCase();
  const sourceType = String(payload?.sourceType || "manual").trim().slice(0, 50);
  const salesCents = Number(payload?.salesCents || 0);
  const transactionCount = Number(payload?.transactionCount || 0);
  if (!/^[A-Z]{2}$/.test(stateCode)) throw new Error("A valid state code is required.");
  if (!Number.isInteger(salesCents) || salesCents < 0) throw new Error("Sales must be non-negative integer cents.");
  if (!Number.isInteger(transactionCount) || transactionCount < 0) throw new Error("Transaction count must be a non-negative integer.");
  if (!salesCents && !transactionCount) throw new Error("Enter sales or transactions to record.");
  const exists = await db.prepare("SELECT state_code FROM nexus_rules WHERE state_code = ?").bind(stateCode).first();
  if (!exists) throw new Error("Unknown state code.");
  const id = crypto.randomUUID();
  const now = nowIso();
  await db.prepare(`
    INSERT INTO nexus_adjustments (
      id, calendar_year, state_code, source_type, sales_cents,
      transaction_count, note, occurred_on, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, calendarYear, stateCode, sourceType, salesCents, transactionCount,
    String(payload?.note || "").trim().slice(0, 500) || null,
    /^\d{4}-\d{2}-\d{2}$/.test(String(payload?.occurredOn || "")) ? payload.occurredOn : null,
    now, now,
  ).run();
  return { id, calendarYear, stateCode, sourceType, salesCents, transactionCount };
}

export async function saveNexusRule(db, stateCodeInput, payload) {
  const stateCode = String(stateCodeInput || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(stateCode)) throw new Error("A valid state code is required.");
  const existing = await db.prepare("SELECT * FROM nexus_rules WHERE state_code = ?").bind(stateCode).first();
  if (!existing) throw new Error("Unknown state rule.");

  const optionalInteger = (value, label) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) throw new Error(`${label} must be a non-negative integer or blank.`);
    return number;
  };
  const revenueThresholdCents = optionalInteger(payload?.revenueThresholdCents, "Revenue threshold");
  const transactionThreshold = optionalInteger(payload?.transactionThreshold, "Transaction threshold");
  const thresholdLogic = String(payload?.thresholdLogic || existing.threshold_logic).trim();
  const measurementPeriod = String(payload?.measurementPeriod || existing.measurement_period).trim().slice(0, 100);
  const salesBasis = String(payload?.salesBasis || existing.sales_basis).trim().slice(0, 300);
  const verificationStatus = String(payload?.verificationStatus || "needs_review").trim().slice(0, 80);
  const sourceUrl = String(payload?.sourceUrl || "").trim().slice(0, 500) || null;
  const notes = String(payload?.notes || "").trim().slice(0, 1000) || null;
  const effectiveFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(payload?.effectiveFrom || "")) ? payload.effectiveFrom : null;
  if (!['revenue_only', 'transactions_only', 'either', 'both', 'none'].includes(thresholdLogic)) throw new Error("Select a valid threshold rule logic.");
  if (!measurementPeriod || !salesBasis || !verificationStatus) throw new Error("Measurement period, sales basis, and review status are required.");

  const updatedAt = nowIso();
  await db.prepare(`
    UPDATE nexus_rules SET
      revenue_threshold_cents = ?, transaction_threshold = ?, threshold_logic = ?,
      measurement_period = ?, sales_basis = ?, verification_status = ?,
      source_url = ?, notes = ?, effective_from = ?, updated_at = ?
    WHERE state_code = ?
  `).bind(
    revenueThresholdCents, transactionThreshold, thresholdLogic,
    measurementPeriod, salesBasis, verificationStatus,
    sourceUrl, notes, effectiveFrom, updatedAt, stateCode,
  ).run();
  return { stateCode, revenueThresholdCents, transactionThreshold, thresholdLogic, measurementPeriod, salesBasis, verificationStatus, sourceUrl, notes, effectiveFrom, updatedAt };
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function cleanText(value, maxLength) {
  return String(value || "").normalize("NFKC").replace(/[<>\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function listRecentOrders(db, requestedLimit = 50, mode = "sandbox") {
  const limit = Math.max(1, Math.min(100, Number(requestedLimit) || 50));
  const { results = [] } = await db.prepare(`
    SELECT id, order_number, status, financial_status, refunded_cents, disputed_cents,
      last_financial_event_at, currency, merchandise_cents, shipping_cents,
      tax_cents, total_cents, buyer_name, buyer_email, buyer_phone,
      shipping_address_json, verified_items_json, paypal_order_id,
      (SELECT provider_capture_id FROM payments WHERE payments.order_id = orders.id LIMIT 1) AS paypal_capture_id,
      fulfillment_status, tracking_carrier, tracking_number,
      created_at, paid_at, shipped_at, fulfilled_at
    FROM orders
    WHERE mode = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(mode, limit).all();

  return {
    mode,
    generatedAt: nowIso(),
    orders: results.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      paymentStatus: row.status,
      financialStatus: row.financial_status,
      refundedCents: Number(row.refunded_cents || 0),
      disputedCents: Number(row.disputed_cents || 0),
      lastFinancialEventAt: row.last_financial_event_at,
      fulfillmentStatus: row.fulfillment_status,
      currency: row.currency,
      merchandiseCents: Number(row.merchandise_cents),
      shippingCents: Number(row.shipping_cents),
      taxCents: Number(row.tax_cents),
      totalCents: Number(row.total_cents),
      buyerName: row.buyer_name,
      buyerEmail: row.buyer_email,
      buyerPhone: row.buyer_phone,
      shippingAddress: parseJson(row.shipping_address_json, {}),
      items: parseJson(row.verified_items_json, []),
      paypalOrderId: row.paypal_order_id,
      paypalCaptureId: row.paypal_capture_id,
      trackingCarrier: row.tracking_carrier,
      trackingNumber: row.tracking_number,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      shippedAt: row.shipped_at,
      fulfilledAt: row.fulfilled_at,
    })),
  };
}

export async function updateOrderFulfillment(db, orderId, payload) {
  const allowed = new Set(["unfulfilled", "processing", "on_hold", "shipped", "fulfilled"]);
  const status = cleanText(payload?.status, 30).toLowerCase();
  const trackingCarrier = cleanText(payload?.trackingCarrier, 80);
  const trackingNumber = cleanText(payload?.trackingNumber, 120);
  const note = cleanText(payload?.note, 500);
  if (!allowed.has(status)) throw new Error("Invalid fulfillment status.");

  const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!order) throw new Error("Order not found.");
  if (["processing", "shipped", "fulfilled"].includes(status)
    && (order.status !== "paid" || order.financial_status !== "paid")) {
    throw new Error("Only a fully paid order without a refund, reversal, or open dispute can enter fulfillment.");
  }
  if (["shipped", "fulfilled"].includes(status) && (!trackingCarrier || !trackingNumber)) {
    throw new Error("Carrier and tracking number are required before marking an order shipped.");
  }

  const now = nowIso();
  const firstShipment = ["shipped", "fulfilled"].includes(status)
    && !["shipped", "fulfilled"].includes(order.fulfillment_status);
  const shippedAt = ["shipped", "fulfilled"].includes(status) ? (order.shipped_at || now) : order.shipped_at;
  const fulfilledAt = status === "fulfilled" ? (order.fulfilled_at || now) : order.fulfilled_at;
  const statements = [
    db.prepare(`
      UPDATE orders
      SET fulfillment_status = ?, tracking_carrier = ?, tracking_number = ?,
          shipped_at = ?, fulfilled_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(status, trackingCarrier || null, trackingNumber || null, shippedAt || null, fulfilledAt || null, now, order.id),
    db.prepare(`
      INSERT INTO order_fulfillment_events (
        id, order_id, from_status, to_status, tracking_carrier, tracking_number, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), order.id, order.fulfillment_status, status,
      trackingCarrier || null, trackingNumber || null, note || null, now,
    ),
  ];

  if (firstShipment) {
    const emailPayload = {
      notificationType: "customer_shipped",
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
      paypalCaptureId: "FULFILLMENT",
      trackingCarrier,
      trackingNumber,
      shippedAt,
    };
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO email_outbox (
        id, order_id, event_type, status, attempts, next_attempt_at, payload_json, created_at
      ) VALUES (?, ?, 'customer_shipped', 'pending', 0, ?, ?, ?)
    `).bind(`customer-shipped:${order.id}`, order.id, now, JSON.stringify(emailPayload), now));
  }

  await db.batch(statements);
  return {
    id: order.id,
    orderNumber: order.order_number,
    fulfillmentStatus: status,
    trackingCarrier: trackingCarrier || null,
    trackingNumber: trackingNumber || null,
    shippedAt: shippedAt || null,
    fulfilledAt: fulfilledAt || null,
    shipmentEmailQueued: firstShipment,
  };
}

function editionRestorationStatements(db, allocations, now) {
  const statements = [];
  for (const allocation of allocations) {
    const quantity = Math.max(0, Number(allocation.quantity) || 0);
    if (!quantity || !["reserved", "sold"].includes(allocation.status)) continue;
    const counter = allocation.status === "sold" ? "checkout_sold" : "reserved_quantity";
    statements.push(db.prepare(`
      UPDATE edition_inventory
      SET ${counter} = MAX(0, ${counter} - ?), updated_at = ?
      WHERE inventory_key = ?
    `).bind(quantity, now, allocation.inventory_key));
    statements.push(db.prepare(`
      UPDATE edition_allocations
      SET status = 'released', updated_at = ?
      WHERE id = ? AND status = ?
    `).bind(now, allocation.id, allocation.status));
  }
  return statements;
}

export async function cancelOrder(db, orderId, mode, noteInput = "") {
  const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!order || order.mode !== mode) throw new Error("Order not found.");
  if (order.status === "canceled") {
    return { id: order.id, orderNumber: order.order_number, canceled: true, alreadyCanceled: true };
  }
  if (["shipped", "fulfilled"].includes(order.fulfillment_status)) {
    throw new Error("A shipped or fulfilled order cannot be canceled from this screen.");
  }
  if (mode === "live" && ["paid", "partially_refunded", "disputed"].includes(order.financial_status)) {
    throw new Error("Refund or reverse the live payment before canceling this order.");
  }

  const { results: allocations = [] } = await db.prepare(`
    SELECT id, inventory_key, quantity, status
    FROM edition_allocations
    WHERE order_id = ? AND status IN ('reserved', 'sold')
  `).bind(order.id).all();
  const now = nowIso();
  const note = cleanText(noteInput, 500) || (mode === "sandbox" ? "Sandbox test order canceled by administrator." : "Order canceled by administrator.");
  const statements = editionRestorationStatements(db, allocations, now);
  statements.push(
    db.prepare(`
      UPDATE orders
      SET status = 'canceled', financial_status = 'canceled', fulfillment_status = 'canceled', updated_at = ?
      WHERE id = ?
    `).bind(now, order.id),
    db.prepare(`
      INSERT INTO order_fulfillment_events (
        id, order_id, from_status, to_status, tracking_carrier, tracking_number, note, created_at
      ) VALUES (?, ?, ?, 'canceled', ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), order.id, order.fulfillment_status,
      order.tracking_carrier || null, order.tracking_number || null, note, now,
    ),
  );
  await db.batch(statements);
  return {
    id: order.id,
    orderNumber: order.order_number,
    canceled: true,
    restoredEditionUnits: allocations.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
  };
}

export async function deleteSandboxOrder(db, orderId, mode) {
  if (mode !== "sandbox") throw new Error("Order deletion is restricted to Sandbox.");
  let order = await db.prepare("SELECT * FROM orders WHERE id = ? AND mode = 'sandbox'").bind(orderId).first();
  if (!order) throw new Error("Sandbox order not found.");
  if (order.status !== "canceled") {
    await cancelOrder(db, order.id, mode, "Sandbox test order canceled before deletion.");
    order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  }

  await db.batch([
    db.prepare(`DELETE FROM paypal_webhook_events WHERE provider_order_id = ? OR provider_capture_id IN (SELECT provider_capture_id FROM payments WHERE order_id = ?)`)
      .bind(order.paypal_order_id || "", order.id),
    db.prepare("DELETE FROM payment_refunds WHERE order_id = ?").bind(order.id),
    db.prepare("DELETE FROM payment_disputes WHERE order_id = ?").bind(order.id),
    db.prepare("DELETE FROM order_financial_events WHERE order_id = ?").bind(order.id),
    db.prepare("DELETE FROM order_fulfillment_events WHERE order_id = ?").bind(order.id),
    db.prepare("DELETE FROM email_outbox WHERE order_id = ?").bind(order.id),
    db.prepare("DELETE FROM edition_allocations WHERE order_id = ?").bind(order.id),
    db.prepare("DELETE FROM payments WHERE order_id = ?").bind(order.id),
    db.prepare("DELETE FROM orders WHERE id = ? AND mode = 'sandbox'").bind(order.id),
  ]);
  return { id: order.id, orderNumber: order.order_number, deleted: true };
}

