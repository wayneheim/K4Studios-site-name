import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transformSync } from "esbuild";

// Netlify compiles this function's ES imports despite its legacy .cjs suffix.
const source = readFileSync(new URL("../../netlify/functions/order-email.cjs", import.meta.url), "utf8");
const { code } = transformSync(source, { format: "cjs", platform: "node" });
const gallery = "https://wayne-heim.smugmug.com/Other/Photo-Shoots/South-Dakota/Fiddlers-Green-26-E";
const artworkUrl = "https://www.k4studios.com/Other/Expeditions/fiddlers-green-2026";

async function renderEmail(items, notificationType = "merchant_order_paid", details = {}) {
  const sent = [];
  const module = { exports: {} };
  const secret = "local-order-email-test-secret";
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(name) {
      if (name === "node:crypto") return crypto;
      if (name === "nodemailer") return {
        createTransport: () => ({ sendMail: async (message) => { sent.push(message); } }),
      };
      throw new Error(`Unexpected dependency: ${name}`);
    },
    process: { env: {
      ORDER_EMAIL_SHARED_SECRET: secret,
      NOTIFY_EMAIL: "merchant@example.test",
      NOTIFY_EMAIL_PASS: "test-password",
      ORDER_EMAIL_TO: "merchant@example.test",
    } },
    Buffer,
    URL,
  });
  const body = JSON.stringify({
    mode: "live",
    orderNumber: "K4-TEST",
    paypalCaptureId: "capture-test",
    buyerEmail: "buyer@example.test",
    notificationType,
    items,
    ...details,
  });
  const timestamp = String(Date.now());
  const result = await module.exports.handler({
    httpMethod: "POST",
    body,
    headers: {
      "x-k4-timestamp": timestamp,
      "x-k4-signature": crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex"),
    },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(sent.length, 1);
  return sent[0];
}

function item(imageId, fulfillmentUrl = `${gallery}/${imageId}/buy`) {
  return {
    imageId,
    imageTitle: `Print ${imageId}`,
    seriesLabel: "Expedition Sketch Print",
    quantity: 1,
    fulfillment: "smugmug-manual",
    artworkUrl,
    fulfillmentUrl,
  };
}

test("merchant order email includes a distinct SmugMug buy link for every Expedition image", async () => {
  const imageIds = ["i-test90", "i-test89", "i-test88", "i-test87", "i-test46"];
  const email = await renderEmail(imageIds.map((imageId) => item(imageId)));
  for (const imageId of imageIds) {
    assert.ok(email.text.includes(`Order on SmugMug: ${gallery}/${imageId}/buy`));
  }
  assert.equal(email.text.includes(artworkUrl), false);
});

test("merchant order email converts saved /A fulfillment links to /buy", async () => {
  for (const suffix of ["A", "A/", "buy/"]) {
    const email = await renderEmail([item("i-legacy", `${gallery}/i-legacy/${suffix}#old`)]);
    assert.ok(email.text.includes(`Order on SmugMug: ${gallery}/i-legacy/buy`));
    assert.equal(email.text.includes("#old"), false);
    assert.equal(email.text.includes("/i-legacy/A"), false);
  }
});

test("merchant email rejects untrusted or malformed fulfillment links", async () => {
  for (const url of [
    "https://example.test/i-test/buy",
    "https://wayne-heim.smugmug.com.example.test/i-test/buy",
    "http://wayne-heim.smugmug.com/i-test/buy",
    `${gallery}/buy`,
    "not-a-url",
  ]) {
    const email = await renderEmail([item("i-test", url)]);
    assert.equal(email.text.includes("Order on SmugMug:"), false);
    assert.ok(email.text.includes(`View on K4 Studios: ${artworkUrl}`));
  }
});

test("K4 fulfilled products retain their artwork link", async () => {
  const email = await renderEmail([{ ...item("i-test"), fulfillment: "k4-manual" }]);
  assert.equal(email.text.includes("Order on SmugMug:"), false);
  assert.ok(email.text.includes(`View on K4 Studios: ${artworkUrl}`));
});

test("customer confirmations and shipping emails retain K4 artwork links", async () => {
  for (const type of ["customer_confirmation", "customer_shipped"]) {
    const email = await renderEmail([item("i-test")], type);
    assert.equal(email.to, "buyer@example.test");
    assert.ok(email.text.includes(`View artwork: ${artworkUrl}`));
    assert.equal(email.text.includes("smugmug.com"), false);
  }
});

test("processed orders send a production thank-you to the customer with exact image IDs", async () => {
  const email = await renderEmail([item("i-V6hWQms")], "customer_processed");
  assert.equal(email.to, "buyer@example.test");
  assert.match(email.subject, /is in production/);
  assert.match(email.text, /Thank you again/);
  assert.match(email.text, /has been reviewed, and production of your prints has been ordered/);
  assert.ok(email.text.includes("Image ID: i-V6hWQms"));
  assert.ok(email.text.includes("Order number: K4-TEST"));
  assert.equal(email.text.includes("tracking"), false);
  assert.equal(email.text.includes("shipping update"), false);
  assert.equal(email.text.includes("smugmug.com"), false);
});

test("the optional shipped email includes the saved carrier and exact tracking number", async () => {
  const email = await renderEmail([item("i-V6hWQms")], "customer_shipped", { trackingCarrier: "UPS", trackingNumber: "1Z-AbC012345" });
  assert.equal(email.to, "buyer@example.test");
  assert.match(email.subject, /has shipped/);
  assert.ok(email.text.includes("Carrier: UPS"));
  assert.ok(email.text.includes("Tracking number: 1Z-AbC012345"));
  assert.ok(email.text.includes("Order number: K4-TEST"));
});

test("merchant and customer receipts explain discounts without subtracting shipping savings twice", async () => {
  const quote = { merchandiseSubtotalCents: 5000, merchandiseCents: 4500, merchandiseDiscountCents: 500, shippingCents: 0, shippingDiscountCents: 1100, taxCents: 304, totalCents: 4804, promotion: { name: "Test savings", code: "SAVE" } };
  for (const type of ["merchant_order_paid", "customer_confirmation"]) {
    const email = await renderEmail([item("i-V6hWQms")], type, { quote });
    assert.ok(email.text.includes("Merchandise: $50.00"));
    assert.ok(email.text.includes("Print discount: -$5.00"));
    assert.ok(email.text.includes("Shipping savings: $11.00 (included in shipping below)"));
    assert.ok(email.text.includes("Test savings (SAVE)"));
    assert.ok(email.text.includes("$48.04"));
  }
});
