import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { insertPendingOrder } from "../src/database.js";
import { emailOrderTracking, getOrderProcessingSummary, listTrackedOrders, markOrderProcessed } from "../src/orderProcessing.js";
import { isAdminAuthorized, isOrderTrackerAuthorized } from "../src/admin.js";

const migrations = new URL("../migrations/", import.meta.url);
const processingMigration = readFileSync(new URL("0009_order_processing.sql", migrations), "utf8");

function database({ migrateProcessing = true } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  for (const name of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    if (name === "0009_order_processing.sql" && !migrateProcessing) continue;
    sqlite.exec(readFileSync(new URL(name, migrations), "utf8"));
  }
  const db = {
    sqlite,
    prepare(sql) {
      return {
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() { return sqlite.prepare(sql).get(...this.values) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...this.values) }; },
        async run() { return { meta: sqlite.prepare(sql).run(...this.values) }; },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return db;
}

async function seed(db, id, { mode = "live", status = "paid", financial = "paid", fulfillment = "unfulfilled", createdAt = "2026-11-20T12:00:00.000Z" } = {}) {
  const item = { imageId: "i-V6hWQms", imageTitle: "Image 87", quantity: 1, size: '8" x 10"', finish: "Pearl" };
  await insertPendingOrder(db, {
    order: { id, mode, orderNumber: `K4-${id}`, buyerName: "Test Buyer", buyerEmail: "buyer@example.test" },
    rawCart: [item], verifiedItems: [item], shippingAddress: { addressLine1: "123 Test St", city: "Test", stateCode: "OH", postalCode: "44101" },
    quote: { merchandiseCents: 4500, shippingCents: 1000, taxCents: 0, totalCents: 5500,
      tax: { jurisdictionCountry: "US", jurisdictionState: "OH", jurisdictionCode: "US-OH", rateBasisPoints: 0, ruleLabel: "Test", configVersion: "test" },
      shipping: { methodLabel: "Test", configVersion: "test" } },
  });
  db.sqlite.prepare("UPDATE orders SET status=?, financial_status=?, fulfillment_status=?, created_at=?, paid_at=? WHERE id=?")
    .run(status, financial, fulfillment, createdAt, status === "paid" ? createdAt : null, id);
}

test("summary counts only actionable paid orders in the selected environment", async () => {
  const db = database();
  try {
    await seed(db, "waiting");
    await seed(db, "sandbox", { mode: "sandbox" });
    await seed(db, "unpaid", { status: "pending_approval", financial: "pending" });
    await seed(db, "refund", { financial: "partially_refunded" });
    await seed(db, "hold", { fulfillment: "on_hold" });
    await seed(db, "shipped", { fulfillment: "shipped" });
    assert.equal((await getOrderProcessingSummary(db, "live")).pendingCount, 1);
    assert.equal((await getOrderProcessingSummary(db, "sandbox")).pendingCount, 1);
    await markOrderProcessed(db, "waiting", "live");
    assert.equal((await getOrderProcessingSummary(db, "live")).pendingCount, 0);
  } finally { db.sqlite.close(); }
});

test("the Stats service credential authorizes tracker actions but not general commerce administration", async () => {
  const request = new Request("https://commerce.internal/admin/order-summary", { headers: { authorization: "Bearer scoped-test-token" } });
  const env = { STATS_ORDERS_TOKEN: "scoped-test-token", COMMERCE_ADMIN_PASSWORD: "separate-admin-password" };
  assert.equal(await isOrderTrackerAuthorized(request, env), true);
  assert.equal(await isAdminAuthorized(request, env), false);
  assert.equal(await isOrderTrackerAuthorized(new Request(request.url, { headers: { authorization: "Bearer wrong-token" } }), env), false);
});

test("the private EditorPro service credential authorizes commerce while unauthenticated and forged requests fail",async()=>{
  const env={EDITORPRO_COMMERCE_TOKEN:"editor-service-test-only",COMMERCE_ADMIN_PASSWORD:"existing-admin-password"};
  const request=(authorization)=>new Request("https://commerce.test/admin/promotions",{headers:authorization?{authorization}:{}});
  assert.equal(await isAdminAuthorized(request(),env),false);
  assert.equal(await isAdminAuthorized(request("Bearer wrong"),env),false);
  assert.equal(await isAdminAuthorized(request("Bearer editor-service-test-only"),env),true);
  assert.equal(await isAdminAuthorized(request(`Basic ${btoa("k4admin:existing-admin-password")}`),env),true);
});

test("processing saves the audit trail and a single customer email, including on retry", async () => {
  const db = database();
  try {
    await seed(db, "order-1");
    const result = await markOrderProcessed(db, "order-1", "live");
    assert.equal(result.processingEmailQueued, true);
    const row = db.sqlite.prepare("SELECT * FROM orders WHERE id='order-1'").get();
    assert.equal(row.fulfillment_status, "processing");
    assert.ok(row.processed_at);
    const email = db.sqlite.prepare("SELECT * FROM email_outbox").get();
    assert.equal(email.event_type, "customer_processed");
    assert.equal(email.status, "pending");
    const payload = JSON.parse(email.payload_json);
    assert.equal(payload.buyerEmail, "buyer@example.test");
    assert.equal(payload.items[0].imageId, "i-V6hWQms");
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM order_fulfillment_events").get().n, 1);
    const retry = await markOrderProcessed(db, "order-1", "live");
    assert.equal(retry.alreadyProcessed, true);
    assert.equal(retry.processingEmailQueued, false);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM email_outbox").get().n, 1);
    const history = await listTrackedOrders(db, "live", { view: "history" });
    assert.equal(history.orders[0].processingEmailStatus, "pending");
    assert.equal(history.orders[0].processedAt, row.processed_at);
  } finally { db.sqlite.close(); }
});

test("a concurrent second processing attempt cannot create another email or audit event", async () => {
  const db = database();
  try {
    await seed(db, "concurrent");
    // Both readers see the original order before the competing transaction runs.
    const originalPrepare = db.prepare;
    let reads = 0;
    db.prepare = (sql) => {
      const statement = originalPrepare(sql);
      if (sql === "SELECT * FROM orders WHERE id = ? AND mode = ?") {
        const first = statement.first.bind(statement);
        statement.first = async () => {
          const snapshot = await first();
          if (++reads === 1) await markOrderProcessed(db, "concurrent", "live");
          return snapshot;
        };
      }
      return statement;
    };
    const result = await markOrderProcessed(db, "concurrent", "live");
    assert.equal(result.alreadyProcessed, true);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM email_outbox").get().n, 1);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM order_fulfillment_events").get().n, 1);
  } finally { db.sqlite.close(); }
});

test("queue failures roll back processing so the order remains visible as pending", async () => {
  const db = database();
  try {
    await seed(db, "rollback");
    db.sqlite.exec("CREATE TRIGGER reject_queue BEFORE INSERT ON email_outbox BEGIN SELECT RAISE(ABORT, 'queue failed'); END;");
    await assert.rejects(markOrderProcessed(db, "rollback", "live"), /queue failed/);
    assert.equal((await getOrderProcessingSummary(db, "live")).pendingCount, 1);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM order_fulfillment_events").get().n, 0);
  } finally { db.sqlite.close(); }
});

test("processing rejects unpaid, held, disputed, refunded, and other-environment orders", async () => {
  const db = database();
  try {
    for (const [id, options] of [
      ["unpaid", { status: "pending_approval", financial: "pending" }],
      ["held", { fulfillment: "on_hold" }],
      ["disputed", { financial: "disputed" }],
      ["refunded", { financial: "refunded" }],
      ["test-order", { mode: "sandbox" }],
    ]) {
      await seed(db, id, options);
      await assert.rejects(markOrderProcessed(db, id, "live"));
    }
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM email_outbox").get().n, 0);
  } finally { db.sqlite.close(); }
});

test("tracker paginates history without skipping orders with identical timestamps", async () => {
  const db = database();
  try {
    for (const id of ["a", "b", "c"]) {
      await seed(db, id);
      await markOrderProcessed(db, id, "live");
    }
    await seed(db, "waiting");
    await seed(db, "abandoned", { status: "pending_approval", financial: "pending" });
    const seen = [];
    let cursor = null;
    do {
      const page = await listTrackedOrders(db, "live", { view: "history", limit: 1, cursor });
      seen.push(...page.orders.map((order) => order.id));
      cursor = page.nextCursor;
    } while (cursor);
    assert.deepEqual(seen, ["c", "b", "a"]);
    assert.deepEqual((await listTrackedOrders(db, "live")).orders.map((order) => order.id), ["waiting"]);
  } finally { db.sqlite.close(); }
});

test("migration recognizes production and shipped orders without queuing historical emails", async () => {
  const db = database({ migrateProcessing: false });
  try {
    await seed(db, "new");
    await seed(db, "old-production", { fulfillment: "processing" });
    await seed(db, "old-shipped", { fulfillment: "shipped" });
    db.sqlite.exec(processingMigration);
    assert.equal((await getOrderProcessingSummary(db, "live")).pendingCount, 1);
    assert.ok(db.sqlite.prepare("SELECT processed_at FROM orders WHERE id='old-production'").get().processed_at);
    assert.equal((await markOrderProcessed(db, "old-shipped", "live")).processingEmailQueued, false);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM email_outbox").get().n, 0);
  } finally { db.sqlite.close(); }
});

test("optional tracking records shipment details and queues only one customer shipping email", async () => {
  const db = database();
  try {
    await seed(db, "shipment");
    await markOrderProcessed(db, "shipment", "live");
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE event_type='customer_shipped'").get().n, 0);
    const tracking = { trackingCarrier: "UPS", trackingNumber: "1Z-AbC012345" };
    const result = await emailOrderTracking(db, "shipment", "live", tracking);
    assert.equal(result.shipmentEmailQueued, true);
    const row = db.sqlite.prepare("SELECT * FROM orders WHERE id='shipment'").get();
    assert.equal(row.fulfillment_status, "shipped");
    assert.equal(row.tracking_carrier, "UPS");
    assert.equal(row.tracking_number, "1Z-AbC012345");
    assert.ok(row.shipped_at);
    const email = JSON.parse(db.sqlite.prepare("SELECT payload_json FROM email_outbox WHERE event_type='customer_shipped'").get().payload_json);
    assert.equal(email.notificationType, "customer_shipped");
    assert.equal(email.buyerEmail, "buyer@example.test");
    assert.equal(email.trackingNumber, tracking.trackingNumber);
    const retry = await emailOrderTracking(db, "shipment", "live", tracking);
    assert.equal(retry.alreadyQueued, true);
    assert.equal(retry.shipmentEmailQueued, false);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE event_type='customer_shipped'").get().n, 1);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM order_fulfillment_events WHERE to_status='shipped'").get().n, 1);
    const history = await listTrackedOrders(db, "live", { view: "history" });
    assert.equal(history.orders[0].shipmentEmailStatus, "pending");
    assert.equal(history.orders[0].trackingNumber, tracking.trackingNumber);
  } finally { db.sqlite.close(); }
});

test("tracking rejects invalid input and orders that are unprocessed, held, refunded, or in another environment", async () => {
  const db = database();
  try {
    await seed(db, "ready");
    await markOrderProcessed(db, "ready", "live");
    for (const input of [
      { trackingCarrier: "UPS", trackingNumber: "" },
      { trackingCarrier: "UPS", trackingNumber: "abc\r\nbcc: other@example.test" },
      { trackingCarrier: "UPS", trackingNumber: "x".repeat(121) },
      { trackingCarrier: "Unknown", trackingNumber: "test" },
      { trackingCarrier: "UPS", trackingNumber: { value: "test" } },
    ]) await assert.rejects(emailOrderTracking(db, "ready", "live", input));
    for (const [id, options] of [
      ["unprocessed", {}], ["held", { fulfillment: "on_hold" }],
      ["refunded", { fulfillment: "processing", financial: "refunded" }],
      ["unpaid-shipping", { fulfillment: "processing", status: "pending_approval", financial: "pending" }],
      ["sandbox-shipping", { mode: "sandbox", fulfillment: "processing" }],
    ]) {
      await seed(db, id, options);
      await assert.rejects(emailOrderTracking(db, id, "live", { trackingCarrier: "FedEx", trackingNumber: "123456789" }));
    }
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE event_type='customer_shipped'").get().n, 0);
  } finally { db.sqlite.close(); }
});

test("shipping queue failures roll back the shipment and leave production history intact", async () => {
  const db = database();
  try {
    await seed(db, "ship-rollback");
    await markOrderProcessed(db, "ship-rollback", "live");
    db.sqlite.exec("CREATE TRIGGER reject_shipping BEFORE INSERT ON email_outbox WHEN NEW.event_type='customer_shipped' BEGIN SELECT RAISE(ABORT, 'shipping queue failed'); END;");
    await assert.rejects(emailOrderTracking(db, "ship-rollback", "live", { trackingCarrier: "FedEx", trackingNumber: "123456789" }), /shipping queue failed/);
    const row = db.sqlite.prepare("SELECT * FROM orders WHERE id='ship-rollback'").get();
    assert.equal(row.fulfillment_status, "processing");
    assert.equal(row.tracking_number, null);
    assert.equal(row.shipped_at, null);
    assert.ok(row.processed_at);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM order_fulfillment_events WHERE to_status='shipped'").get().n, 0);
  } finally { db.sqlite.close(); }
});

test("concurrent shipping requests cannot duplicate the shipping email or audit record", async () => {
  const db = database();
  try {
    await seed(db, "ship-concurrent");
    await markOrderProcessed(db, "ship-concurrent", "live");
    const tracking = { trackingCarrier: "USPS", trackingNumber: "9400123456789" };
    const originalPrepare = db.prepare;
    let reads = 0;
    db.prepare = (sql) => {
      const statement = originalPrepare(sql);
      if (sql === "SELECT * FROM orders WHERE id = ? AND mode = ?") {
        const first = statement.first.bind(statement);
        statement.first = async () => {
          const snapshot = await first();
          if (++reads === 1) await emailOrderTracking(db, "ship-concurrent", "live", tracking);
          return snapshot;
        };
      }
      return statement;
    };
    assert.equal((await emailOrderTracking(db, "ship-concurrent", "live", tracking)).alreadyQueued, true);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM email_outbox WHERE event_type='customer_shipped'").get().n, 1);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM order_fulfillment_events WHERE to_status='shipped'").get().n, 1);
  } finally { db.sqlite.close(); }
});
