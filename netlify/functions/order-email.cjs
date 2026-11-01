import crypto from "node:crypto";
import nodemailer from "nodemailer";

function response(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json", "cache-control": "no-store" }, body: JSON.stringify(body) };
}

function getHeader(headers, name) {
  const expected = name.toLowerCase();
  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === expected) return String(value || "");
  }
  return "";
}

function verifySignature(event, secret) {
  const timestamp = getHeader(event.headers, "x-k4-timestamp");
  const supplied = getHeader(event.headers, "x-k4-signature");
  if (!/^\d{13}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(supplied) || Math.abs(Date.now() - Number(timestamp)) > 5 * 60_000) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${event.body || ""}`).digest("hex");
  if (supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}

function money(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((Number(cents) || 0) / 100);
}

function clean(value, max = 200) {
  return String(value || "").replace(/[<>\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function orderText(order) {
  const address = order.shippingAddress || {};
  const quote = order.quote || {};
  const itemLines = (order.items || []).map((item) => (
    `${item.quantity} × ${clean(item.imageTitle)}\n` +
    `    ${clean(item.seriesLabel)} · ${clean(item.size)} · ${clean(item.finish)}\n` +
    `    ${clean(item.imageId)} / ${clean(item.productKey)} — ${money(item.lineTotalCents)}`
  )).join("\n\n");

  return `${order.mode === "sandbox" ? "PAYPAL SANDBOX ORDER — NOT A LIVE TRANSACTION" : "K4 STUDIOS ORDER"}

Order: ${clean(order.orderNumber)}
Status: ${clean(order.paymentStatus)}
Paid: ${clean(order.paidAt)}
PayPal Order: ${clean(order.paypalOrderId)}
PayPal Capture: ${clean(order.paypalCaptureId)}

CUSTOMER
${clean(order.buyerName)}
${clean(order.buyerEmail)}
${clean(order.buyerPhone)}

SHIP TO
${clean(address.addressLine1)}
${address.addressLine2 ? `${clean(address.addressLine2)}\n` : ""}${clean(address.city)}, ${clean(address.stateCode)} ${clean(address.postalCode)}
United States

ITEMS
${itemLines}

Merchandise: ${money(quote.merchandiseCents)}
Shipping:    ${money(quote.shippingCents)}
Tax:         ${money(quote.taxCents)}
TOTAL:       ${money(quote.totalCents)}

Tax jurisdiction: ${clean(quote.tax?.jurisdictionCode)}
Tax rate: ${Number(quote.tax?.ratePercent || 0).toFixed(2)}%
Tax rule: ${clean(quote.tax?.ruleLabel)}
Tax config: ${clean(quote.tax?.configVersion)}
Shipping config: ${clean(quote.shipping?.configVersion)}

This notification was sent from the durable K4 order outbox after the order and payment transaction were saved.`;
}

function cleanArtworkUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || !["www.k4studios.com", "k4studios.com"].includes(url.hostname.toLowerCase())) return "";
    url.hostname = "www.k4studios.com";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function cleanSmugMugFulfillmentUrl(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "wayne-heim.smugmug.com") return "";
    if (!/\/i-[A-Za-z0-9]+\/A\/?$/.test(url.pathname)) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function detailedOrderText(order) {
  const address = order.shippingAddress || {};
  const quote = order.quote || {};
  const itemLines = (order.items || []).map((item, index) => {
    const artworkUrl = cleanArtworkUrl(item.artworkUrl);
    const fulfillmentUrl = item.fulfillment === "smugmug-manual"
      ? cleanSmugMugFulfillmentUrl(item.fulfillmentUrl)
      : "";
    return `${index + 1}. ${clean(item.imageTitle)}\n` +
      `   Series: ${clean(item.seriesLabel)}\n` +
      `   Size: ${clean(item.size)}\n` +
      `   Finish: ${clean(item.finish)}\n` +
      `   Quantity: ${Number(item.quantity) || 0}\n` +
      `   Line total: ${money(item.lineTotalCents)}\n` +
      `   Image ID: ${clean(item.imageId)}\n` +
      `   Product: ${clean(item.productKey)}` +
      (artworkUrl ? `\n   View on K4 Studios: ${artworkUrl}` : "") +
      (fulfillmentUrl ? `\n   Open SmugMug fulfillment page: ${fulfillmentUrl}` : "");
  }).join("\n\n");

  return `${order.mode === "sandbox" ? "PAYPAL SANDBOX ORDER - NOT A LIVE TRANSACTION" : "K4 STUDIOS ORDER"}

Order: ${clean(order.orderNumber)}
Status: ${clean(order.paymentStatus)}
Paid: ${clean(order.paidAt)}
PayPal Order: ${clean(order.paypalOrderId)}
PayPal Capture: ${clean(order.paypalCaptureId)}

CUSTOMER
Name: ${clean(order.buyerName)}
Email: ${clean(order.buyerEmail)}
Phone: ${clean(order.buyerPhone)}

SHIP TO
${clean(address.addressLine1)}
${address.addressLine2 ? `${clean(address.addressLine2)}\n` : ""}${clean(address.city)}, ${clean(address.stateCode)} ${clean(address.postalCode)}
United States

ITEMS ORDERED
${itemLines || "No item details were supplied."}

Merchandise: ${money(quote.merchandiseCents)}
Shipping:    ${money(quote.shippingCents)}
Tax:         ${money(quote.taxCents)}
TOTAL:       ${money(quote.totalCents)}

Tax jurisdiction: ${clean(quote.tax?.jurisdictionCode)}
Tax rate: ${Number(quote.tax?.ratePercent || 0).toFixed(2)}%
Tax rule: ${clean(quote.tax?.ruleLabel)}
Tax config: ${clean(quote.tax?.configVersion)}
Shipping config: ${clean(quote.shipping?.configVersion)}

This notification was sent from the durable K4 order outbox after the order and payment transaction were saved.`;
}

function customerConfirmationText(order) {
  const address = order.shippingAddress || {};
  const quote = order.quote || {};
  const itemLines = (order.items || []).map((item, index) => {
    const artworkUrl = cleanArtworkUrl(item.artworkUrl);
    return `${index + 1}. ${clean(item.imageTitle)}\n` +
      `   ${clean(item.seriesLabel)} - ${clean(item.size)} - ${clean(item.finish)}\n` +
      `   Quantity: ${Number(item.quantity) || 0}\n` +
      `   Line total: ${money(item.lineTotalCents)}` +
      (artworkUrl ? `\n   View artwork: ${artworkUrl}` : "");
  }).join("\n\n");

  return `Thank you for your K4 Studios order.

Your payment was received and your physical print order is now in our records.

Order number: ${clean(order.orderNumber)}

ITEMS ORDERED
${itemLines || "No item details were supplied."}

Merchandise: ${money(quote.merchandiseCents)}
Shipping:    ${money(quote.shippingCents)}
Tax:         ${money(quote.taxCents)}
TOTAL:       ${money(quote.totalCents)}

SHIP TO
${clean(order.buyerName)}
${clean(address.addressLine1)}
${address.addressLine2 ? `${clean(address.addressLine2)}\n` : ""}${clean(address.city)}, ${clean(address.stateCode)} ${clean(address.postalCode)}
United States
Phone: ${clean(order.buyerPhone)}

WHAT HAPPENS NEXT
K4 Studios will review the order and begin fulfillment. We will use the phone number above only if the carrier or K4 Studios needs to contact you about delivery or an order question.

If you need help, reply to this email and include your order number.

Visit K4 Studios: https://www.k4studios.com
Order policy: https://www.k4studios.com/Returns-and-Refunds

Thank you for collecting K4 Studios artwork.`;
}

function customerShippedText(order) {
  const itemLines = (order.items || []).map((item, index) => {
    const artworkUrl = cleanArtworkUrl(item.artworkUrl);
    return `${index + 1}. ${clean(item.imageTitle)} - ${clean(item.seriesLabel)} - ${clean(item.size)}`
      + (artworkUrl ? `\n   View artwork: ${artworkUrl}` : "");
  }).join("\n\n");
  return `Your K4 Studios order has shipped.

Order number: ${clean(order.orderNumber)}
Carrier: ${clean(order.trackingCarrier)}
Tracking number: ${clean(order.trackingNumber)}

ITEMS
${itemLines || "No item details were supplied."}

Please allow time for the carrier's tracking system to recognize a newly created shipment.

If you need help, reply to this email and include your order number.

Visit K4 Studios: https://www.k4studios.com
Order policy: https://www.k4studios.com/Returns-and-Refunds`;
}

function merchantFinancialAlertText(order) {
  const amount = money(order.financialAmountCents);
  const reason = clean(order.disputeReason, 500);
  return `${order.mode === "sandbox" ? "PAYPAL SANDBOX FINANCIAL ALERT" : "PAYPAL FINANCIAL ALERT"}

Immediate review is required before this order moves through fulfillment.

Order: ${clean(order.orderNumber)}
Event: ${clean(order.financialEventType)}
Financial status: ${clean(order.financialStatus)}
Event amount: ${amount}
PayPal Order: ${clean(order.paypalOrderId)}
PayPal Capture: ${clean(order.paypalCaptureId)}
PayPal Resource: ${clean(order.providerResourceId)}
${reason ? `Reason: ${reason}\n` : ""}
Customer: ${clean(order.buyerName)}
Email: ${clean(order.buyerEmail)}
Phone: ${clean(order.buyerPhone)}

Review the order in K4 Commerce Admin:
https://www.k4studios.com/admin/commerce

Do not fulfill an order marked on hold until the PayPal event has been reviewed.`;
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed." });
  const signingSecrets = [
    process.env.ORDER_EMAIL_SHARED_SECRET,
    process.env.ORDER_EMAIL_SHARED_SECRET_LIVE,
  ].filter(Boolean);
  if (!signingSecrets.length || !signingSecrets.some((secret) => verifySignature(event, secret))) {
    return response(401, { error: "Invalid signature." });
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "Invalid JSON." });
  }
  if (!["sandbox", "live"].includes(order?.mode) || !order?.orderNumber || !order?.paypalCaptureId) {
    return response(400, { error: "Invalid order payload." });
  }

  const {
    NOTIFY_EMAIL,
    NOTIFY_EMAIL_PASS,
    NOTIFY_TO,
    ORDER_EMAIL_TO,
    ORDER_NOTIFY_FROM = "K4 Studios Sale Notification",
  } = process.env;
  if (!NOTIFY_EMAIL || !NOTIFY_EMAIL_PASS) return response(503, { error: "Order email credentials are not configured." });

  const recipients = [...new Set([
    clean(ORDER_EMAIL_TO || "wayneheim@aol.com", 200),
    clean(NOTIFY_TO, 200),
    clean(NOTIFY_EMAIL, 200),
  ].filter(Boolean))];

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: NOTIFY_EMAIL, pass: NOTIFY_EMAIL_PASS },
  });
  const customerConfirmation = order.notificationType === "customer_confirmation";
  const customerShipped = order.notificationType === "customer_shipped";
  const merchantFinancialAlert = order.notificationType === "merchant_financial_alert";
  const customerMessage = customerConfirmation || customerShipped;
  const buyerEmail = clean(order.buyerEmail, 200);
  const subjectPrefix = order.mode === "sandbox" ? "[SANDBOX] " : "";
  if (customerMessage && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
    return response(400, { error: "A valid customer email is required." });
  }

  await transporter.sendMail(customerMessage ? {
    from: `"${customerShipped ? "K4 Studios Shipping Update" : "K4 Studios Order Confirmation"}" <${NOTIFY_EMAIL}>`,
    to: buyerEmail,
    replyTo: clean(ORDER_EMAIL_TO || "wayneheim@aol.com", 200),
    subject: customerShipped
      ? `${subjectPrefix}Your K4 Studios order has shipped - ${clean(order.orderNumber, 80)}`
      : `${subjectPrefix}K4 Studios order confirmation - ${clean(order.orderNumber, 80)}`,
    text: customerShipped ? customerShippedText(order) : customerConfirmationText(order),
  } : merchantFinancialAlert ? {
    from: `"K4 Studios Payment Alert" <${NOTIFY_EMAIL}>`,
    to: recipients,
    replyTo: clean(ORDER_EMAIL_TO || "wayneheim@aol.com", 200),
    subject: `${order.mode === "sandbox" ? "[SANDBOX " : "["}ACTION REQUIRED] ${clean(order.financialStatus, 60)} - ${clean(order.orderNumber, 80)}`,
    text: merchantFinancialAlertText(order),
  } : {
    from: `"${clean(ORDER_NOTIFY_FROM, 80)}" <${NOTIFY_EMAIL}>`,
    to: recipients,
    replyTo: buyerEmail,
    subject: `${subjectPrefix}K4 order ${clean(order.orderNumber, 80)} - ${money(order.quote?.totalCents)}`,
    text: detailedOrderText(order),
  });
  return response(200, {
    success: true,
    orderNumber: order.orderNumber,
    notificationType: merchantFinancialAlert
      ? "merchant_financial_alert"
      : (customerShipped ? "customer_shipped" : (customerConfirmation ? "customer_confirmation" : "merchant_order_paid")),
  });
}

