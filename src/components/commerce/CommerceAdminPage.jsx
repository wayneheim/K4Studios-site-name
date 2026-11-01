import { useEffect, useMemo, useState } from "react";
import { Ban, Download, KeyRound, LoaderCircle, PlusCircle, RefreshCw, Save, Trash2, TriangleAlert } from "lucide-react";
import { getCommerceApiBase } from "../../lib/commerce/checkoutApi.js";
import { formatCurrency } from "../../lib/commerce/cart.js";

const STATUS_LABELS = {
  physical_activity_review: "Physical activity review",
  collecting_home_state: "Home state",
  no_statewide_sales_tax: "No statewide sales tax",
  rule_needs_review: "Rule needs review",
  threshold_reached_review_required: "Threshold reached",
  approaching_threshold: "Approaching threshold",
  below_configured_threshold: "Below threshold",
};

const SHIPPING_FIELDS = [
  ["sketch-5x7-pearl", 'Sketch 5" × 7"'],
  ["foundation-8x10-pearl", 'Foundation 8" × 10"'],
  ["foundation-11x14-lustre", 'Foundation 11" × 14"'],
  ["chronicle-16x20-cotton-rag", 'Chronicle 16" × 20"'],
  ["chronicle-20x24-cotton-rag", 'Chronicle 20" × 24"'],
  ["legend-30x40-cotton-rag", 'Legend 30" × 40"'],
  ["legend-40x60-cotton-rag", 'Legend 40" × 60"'],
];

const DEFAULT_SHIPPING = {
  effectiveFrom: "2026-10-29",
  label: "SANDBOX TEST SHIPPING — NOT FOR LIVE SALES",
  methodLabel: "Sandbox test shipping",
  productRates: Object.fromEntries(SHIPPING_FIELDS.map(([key]) => [key, ["sketch-5x7-pearl", "foundation-8x10-pearl", "foundation-11x14-lustre"].includes(key) ? "10.00" : "35.00"])),
  engrainedBands: { upTo24: "150.00", upTo36: "150.00", upTo50: "150.00" },
};

const EXPEDITION_PRICE_FIELDS = [
  ["sketch-5x7-pearl", 'Sketch 5" × 7" Pearl'],
  ["foundation-8x10-gloss", 'Foundation 8" × 10" Gloss'],
  ["foundation-8x10-pearl", 'Foundation 8" × 10" Pearl'],
  ["foundation-11x14-lustre", 'Foundation 11" × 14" Lustre'],
  ["foundation-11x14-pearl", 'Foundation 11" × 14" Pearl'],
];

const DEFAULT_EXPEDITION_PRICING = {
  effectiveFrom: "2026-10-31",
  label: "Expedition pre-release print pricing",
  prices: {
    "sketch-5x7-pearl": "10.00",
    "foundation-8x10-gloss": "40.00",
    "foundation-8x10-pearl": "45.00",
    "foundation-11x14-lustre": "70.00",
    "foundation-11x14-pearl": "75.00",
  },
};

function statusClass(status) {
  if (["threshold_reached_review_required", "physical_activity_review"].includes(status)) return "bg-red-100 text-red-800";
  if (["approaching_threshold", "rule_needs_review"].includes(status)) return "bg-amber-100 text-amber-900";
  if (status === "collecting_home_state") return "bg-blue-100 text-blue-800";
  return "bg-emerald-50 text-emerald-800";
}

function financialStatusClass(status) {
  if (status === "paid") return "text-emerald-700";
  if (["pending", "pending_approval"].includes(status)) return "text-amber-700";
  if (["canceled", "refunded", "partially_refunded", "reversed", "approval_reversed", "disputed", "denied"].includes(status)) return "text-red-700";
  return "text-stone-700";
}

async function adminRequest(password, pathname, options = {}) {
  const base = getCommerceApiBase();
  if (!base) throw new Error("The commerce service is not connected to this environment.");
  const response = await fetch(`${base}${pathname}`, {
    ...options,
    headers: {
      authorization: `Basic ${window.btoa(`k4admin:${password}`)}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Admin service returned ${response.status}.`);
  return body;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadReport(report) {
  const headers = [
    "Year", "State", "State Name", "Direct Sales", "Manual Sales", "Reportable Sales",
    "Direct Orders", "Manual Transactions", "Reportable Transactions", "Tax Collected",
    "Revenue Threshold", "Transaction Threshold", "Logic", "Measurement Period",
    "Rule Status", "Alert", "Physical Activity", "Notes", "Source",
  ];
  const rows = report.rows.map((row) => [
    report.year, row.state_code, row.state_name, (row.direct_sales_cents / 100).toFixed(2),
    (row.adjustment_sales_cents / 100).toFixed(2), (row.reportable_sales_cents / 100).toFixed(2),
    row.direct_order_count, row.adjustment_transactions, row.reportable_transactions,
    (row.tax_collected_cents / 100).toFixed(2),
    row.revenue_threshold_cents == null ? "" : (row.revenue_threshold_cents / 100).toFixed(2),
    row.transaction_threshold ?? "", row.threshold_logic, row.measurement_period,
    row.verification_status, row.alert_status, row.physical_activity ? "Yes" : "No",
    [row.notes, row.activity_note].filter(Boolean).join(" | "), row.source_url || "",
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `k4-state-sales-nexus-${report.year}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function CommerceAdminPage() {
  const [password, setPassword] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);
  const [orders, setOrders] = useState([]);
  const [orderDrafts, setOrderDrafts] = useState({});
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [ohioRate, setOhioRate] = useState({ ratePercent: "6.75", effectiveFrom: "2026-10-01", taxShipping: true, label: "Geauga County, Ohio rate (confirm before live use)", sourceUrl: "https://tax.ohio.gov/business/sales-and-use-tax/rate-tables/by-county-q4-2026" });
  const [shippingRates, setShippingRates] = useState(DEFAULT_SHIPPING);
  const [expeditionPricing, setExpeditionPricing] = useState(DEFAULT_EXPEDITION_PRICING);
  const [adjustment, setAdjustment] = useState({ stateCode: "", salesDollars: "", transactionCount: "", sourceType: "manual", note: "", occurredOn: "" });
  const [nexusRule, setNexusRule] = useState({ stateCode: "", revenueThresholdDollars: "", transactionThreshold: "", thresholdLogic: "revenue_only", measurementPeriod: "calendar_year", salesBasis: "", verificationStatus: "needs_review", sourceUrl: "", notes: "", effectiveFrom: "" });

  useEffect(() => setPassword(window.sessionStorage.getItem("k4-commerce-admin-password") || ""), []);

  const loadReport = async (event) => {
    event?.preventDefault?.();
    setStatus("loading");
    setMessage("");
    try {
      window.sessionStorage.setItem("k4-commerce-admin-password", password);
      const [next, orderData] = await Promise.all([
        adminRequest(password, `/admin/report?year=${year}`),
        adminRequest(password, "/admin/orders?limit=50"),
      ]);
      setReport(next);
      setOrders(orderData.orders || []);
      setOrderDrafts(Object.fromEntries((orderData.orders || []).map((order) => [order.id, {
        status: order.fulfillmentStatus || "unfulfilled",
        trackingCarrier: order.trackingCarrier || "FedEx",
        trackingNumber: order.trackingNumber || "",
        note: "",
      }])));
      if (next.ohioTaxRule) {
        setOhioRate({
          ratePercent: (Number(next.ohioTaxRule.rate_basis_points) / 100).toFixed(2),
          effectiveFrom: next.ohioTaxRule.effective_from,
          taxShipping: Boolean(next.ohioTaxRule.tax_shipping),
          label: next.ohioTaxRule.label,
          sourceUrl: next.ohioTaxRule.source_url || "",
        });
      }
      if (next.shippingRule?.rates) {
        setShippingRates({
          effectiveFrom: next.shippingRule.effective_from,
          label: next.shippingRule.label,
          methodLabel: next.shippingRule.method_label,
          productRates: Object.fromEntries(Object.entries(next.shippingRule.rates.productRatesCents || {}).map(([key, cents]) => [key, (Number(cents) / 100).toFixed(2)])),
          engrainedBands: Object.fromEntries(Object.entries(next.shippingRule.rates.engrainedBandsCents || {}).map(([key, cents]) => [key, (Number(cents) / 100).toFixed(2)])),
        });
      }
      if (next.expeditionPriceRule?.prices) {
        setExpeditionPricing({
          effectiveFrom: next.expeditionPriceRule.effective_from,
          label: next.expeditionPriceRule.label,
          prices: Object.fromEntries(Object.entries(next.expeditionPriceRule.prices).map(([key, cents]) => [key, (Number(cents) / 100).toFixed(2)])),
        });
      }
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const saveOhio = async (event) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      await adminRequest(password, "/admin/ohio-tax-rate", {
        method: "POST",
        body: JSON.stringify({
          rateBasisPoints: Math.round(Number(ohioRate.ratePercent) * 100),
          effectiveFrom: ohioRate.effectiveFrom,
          taxShipping: ohioRate.taxShipping,
          label: ohioRate.label,
          sourceUrl: ohioRate.sourceUrl,
        }),
      });
      setMessage(`Ohio ${report?.mode === "live" ? "live" : "sandbox"} tax rule saved with its effective date.`);
      await loadReport();
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const addAdjustment = async (event) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      await adminRequest(password, "/admin/nexus-adjustments", {
        method: "POST",
        body: JSON.stringify({
          calendarYear: year,
          stateCode: adjustment.stateCode,
          salesCents: Math.round(Number(adjustment.salesDollars || 0) * 100),
          transactionCount: Number(adjustment.transactionCount || 0),
          sourceType: adjustment.sourceType,
          note: adjustment.note,
          occurredOn: adjustment.occurredOn,
        }),
      });
      setAdjustment((current) => ({ ...current, salesDollars: "", transactionCount: "", note: "", occurredOn: "" }));
      setMessage("Manual state sales adjustment added.");
      await loadReport();
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const selectNexusRule = (stateCode) => {
    const row = (report?.rows || []).find((candidate) => candidate.state_code === stateCode);
    setNexusRule({
      stateCode,
      revenueThresholdDollars: row?.revenue_threshold_cents == null ? "" : (Number(row.revenue_threshold_cents) / 100).toFixed(2),
      transactionThreshold: row?.transaction_threshold ?? "",
      thresholdLogic: row?.threshold_logic || "revenue_only",
      measurementPeriod: row?.measurement_period || "calendar_year",
      salesBasis: row?.sales_basis || "",
      verificationStatus: row?.verification_status || "needs_review",
      sourceUrl: row?.source_url || "",
      notes: row?.notes || "",
      effectiveFrom: row?.effective_from || "",
    });
  };

  const editNexusRule = (stateCode) => {
    selectNexusRule(stateCode);
    window.requestAnimationFrame(() => {
      const editor = document.getElementById("nexus-rule-editor");
      if (!editor) return;
      editor.open = true;
      editor.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const nexusRulePayload = (rule, verificationStatus = rule.verificationStatus) => ({
    revenueThresholdCents: rule.revenueThresholdDollars === "" ? null : Math.round(Number(rule.revenueThresholdDollars) * 100),
    transactionThreshold: rule.transactionThreshold === "" ? null : Number(rule.transactionThreshold),
    thresholdLogic: rule.thresholdLogic,
    measurementPeriod: rule.measurementPeriod,
    salesBasis: rule.salesBasis,
    verificationStatus,
    sourceUrl: rule.sourceUrl,
    notes: rule.notes,
    effectiveFrom: rule.effectiveFrom,
  });

  const saveNexusRuleForm = async (event) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      await adminRequest(password, `/admin/nexus-rules/${nexusRule.stateCode}`, {
        method: "POST",
        body: JSON.stringify(nexusRulePayload(nexusRule)),
      });
      setMessage(`${nexusRule.stateCode} nexus rule updated.`);
      await loadReport();
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const markNexusReviewed = async () => {
    if (!nexusRule.stateCode) return;
    const verificationStatus = `verified_${year}`;
    setStatus("saving");
    setMessage("");
    try {
      await adminRequest(password, `/admin/nexus-rules/${nexusRule.stateCode}`, {
        method: "POST",
        body: JSON.stringify(nexusRulePayload(nexusRule, verificationStatus)),
      });
      setNexusRule((current) => ({ ...current, verificationStatus }));
      setMessage(`${nexusRule.stateCode} marked verified for ${year}.`);
      await loadReport();
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const saveShipping = async (event) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    const dollarsToCents = (value) => Math.round(Number(value) * 100);
    try {
      await adminRequest(password, "/admin/shipping-rates", {
        method: "POST",
        body: JSON.stringify({
          effectiveFrom: shippingRates.effectiveFrom,
          label: shippingRates.label,
          methodLabel: shippingRates.methodLabel,
          rates: {
            productRatesCents: Object.fromEntries(Object.entries(shippingRates.productRates).map(([key, value]) => [key, dollarsToCents(value)])),
            engrainedBandsCents: Object.fromEntries(Object.entries(shippingRates.engrainedBands).map(([key, value]) => [key, dollarsToCents(value)])),
          },
        }),
      });
      setMessage(`${report?.mode === "live" ? "Live" : "Sandbox"} shipping rates saved with their effective date.`);
      await loadReport();
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const saveExpeditionPricing = async (event) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      await adminRequest(password, "/admin/expedition-prices", {
        method: "POST",
        body: JSON.stringify({
          effectiveFrom: expeditionPricing.effectiveFrom,
          label: expeditionPricing.label,
          pricesCents: Object.fromEntries(Object.entries(expeditionPricing.prices).map(([key, value]) => [key, Math.round(Number(value) * 100)])),
        }),
      });
      setMessage(`${report?.mode === "live" ? "Live" : "Sandbox"} Expedition prices saved.`);
      await loadReport();
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const saveFulfillment = async (event, order) => {
    event.preventDefault();
    const draft = orderDrafts[order.id] || {};
    setStatus("saving");
    setMessage("");
    try {
      const result = await adminRequest(password, `/admin/orders/${encodeURIComponent(order.id)}/fulfillment`, {
        method: "POST",
        body: JSON.stringify(draft),
      });
      await loadReport();
      setMessage(result.shipmentEmailQueued
        ? `Order ${order.orderNumber} marked shipped; customer email queued.`
        : `Order ${order.orderNumber} fulfillment updated.`);
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const cancelAdminOrder = async (order) => {
    if (!window.confirm(`Cancel ${order.orderNumber}? Any reserved or sold edition units from this order will be restored.`)) return;
    setStatus("saving");
    setMessage("");
    try {
      const result = await adminRequest(password, `/admin/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: "POST",
        body: JSON.stringify({ note: report?.mode === "sandbox" ? "Sandbox test order canceled in Commerce Admin." : "Order canceled in Commerce Admin." }),
      });
      await loadReport();
      setMessage(`${order.orderNumber} canceled. ${result.restoredEditionUnits || 0} edition unit(s) restored.`);
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const deleteAdminOrder = async (order) => {
    if (report?.mode !== "sandbox") return;
    if (!window.confirm(`Permanently delete sandbox test order ${order.orderNumber}? This removes its test payment, email, fulfillment, and edition-allocation records.`)) return;
    setStatus("saving");
    setMessage("");
    try {
      await adminRequest(password, `/admin/orders/${encodeURIComponent(order.id)}/delete`, {
        method: "POST",
        body: JSON.stringify({ confirmSandboxDelete: true }),
      });
      await loadReport();
      setMessage(`${order.orderNumber} and its related Sandbox test records were deleted.`);
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  const visibleRows = useMemo(() => report?.rows || [], [report]);

  return (
    <main className="mx-auto min-h-[80vh] max-w-[1500px] px-4 py-8 sm:px-6" data-k4-commerce-admin>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-300 pb-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a3d2b]">Private · {report?.mode === "live" ? "Live" : "Sandbox"}</p>
          <h1 className="mt-1 text-3xl font-semibold text-stone-900">State Sales & Nexus Report</h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">Administrative monitoring only. A threshold warning is not an automatic tax-registration decision.</p>
        </div>
        {report && <button type="button" onClick={() => downloadReport(report)} className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold"><Download className="h-4 w-4" /> Export CSV</button>}
      </div>

      <form onSubmit={loadReport} className="mt-6 grid gap-3 rounded-lg border border-stone-300 bg-[#fbfaf7] p-4 sm:grid-cols-[1fr_140px_auto]">
        <label className="text-xs font-semibold text-stone-700"><span className="mb-1 flex items-center gap-1"><KeyRound className="h-3.5 w-3.5" /> Admin password</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-stone-700"><span className="mb-1 block">Report year</span><input type="number" min="2018" max="2100" required value={year} onChange={(event) => setYear(Number(event.target.value))} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
        <button type="submit" disabled={status === "loading"} className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[#63776a] px-4 text-sm font-semibold text-white"><RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} /> Load report</button>
      </form>

      {message && <div className={`mt-4 flex items-start gap-2 rounded-md p-3 text-sm ${status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}

      {report && (
        <>
          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["Reportable sales", formatCurrency(report.totals.reportableSalesCents / 100)],
              ["Direct checkout", formatCurrency(report.totals.directSalesCents / 100)],
              ["Manual additions", formatCurrency(report.totals.adjustedSalesCents / 100)],
              ["Transactions", report.totals.directOrders + report.totals.adjustedTransactions],
              ["Tax collected", formatCurrency(report.totals.taxCollectedCents / 100)],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-stone-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-stone-500">{label}</p><p className="mt-1 text-xl font-semibold text-stone-900">{value}</p></div>)}
          </section>

          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Recent orders</h2>
                <p className="mt-1 text-xs text-stone-600">Payment records, delivery details, and fulfillment controls for the latest 50 orders.</p>
              </div>
              <span className="text-xs font-semibold text-stone-500">{orders.length} orders</span>
            </div>
            <div className="mt-4 space-y-4">
              {orders.length === 0 && <div className="rounded-lg border border-stone-300 bg-white p-5 text-sm text-stone-600">No orders have been recorded.</div>}
              {orders.map((order) => {
                const draft = orderDrafts[order.id] || {};
                const address = order.shippingAddress || {};
                return (
                  <article key={order.id} className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap justify-between gap-3 border-b border-stone-200 pb-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#8a3d2b]">{order.orderNumber}</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900">{order.buyerName} · {formatCurrency(order.totalCents / 100)}</p>
                        <p className="mt-1 text-xs text-stone-500">{order.buyerEmail} · {order.buyerPhone}</p>
                      </div>
                      <div className="text-right text-xs">
                        <p><span className="font-semibold">Payment:</span> {order.paymentStatus}</p>
                        <p className={`mt-1 font-semibold ${financialStatusClass(order.financialStatus)}`}>
                          Financial: {order.financialStatus || "pending"}
                        </p>
                        {order.refundedCents > 0 && <p className="mt-1 text-red-700">Refunded: {formatCurrency(order.refundedCents / 100)}</p>}
                        {order.disputedCents > 0 && <p className="mt-1 text-red-700">Disputed: {formatCurrency(order.disputedCents / 100)}</p>}
                        <p className="mt-1"><span className="font-semibold">Fulfillment:</span> {order.fulfillmentStatus}</p>
                        <p className="mt-1 text-stone-500">{order.paidAt ? new Date(order.paidAt).toLocaleString() : new Date(order.createdAt).toLocaleString()}</p>
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          {order.paymentStatus !== "canceled" && <button type="button" disabled={status === "saving"} onClick={() => cancelAdminOrder(order)} className="inline-flex items-center gap-1 rounded-md border border-amber-700 bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-900 disabled:opacity-50"><Ban className="h-3.5 w-3.5" /> Cancel order</button>}
                          {report.mode === "sandbox" && <button type="button" disabled={status === "saving"} onClick={() => deleteAdminOrder(order)} className="inline-flex items-center gap-1 rounded-md border border-red-700 bg-red-50 px-2.5 py-1.5 font-semibold text-red-800 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> Delete test order</button>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                      <div className="text-xs text-stone-700">
                        <p className="font-semibold text-stone-900">Items</p>
                        <ul className="mt-1 space-y-1">{(order.items || []).map((item) => <li key={`${item.imageId}:${item.productKey}`}>{item.quantity} × {item.imageTitle} · {item.seriesLabel} · {item.size}</li>)}</ul>
                        <p className="mt-3 font-semibold text-stone-900">Ship to</p>
                        <p className="mt-1">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ""}<br />{address.city}, {address.stateCode} {address.postalCode}</p>
                      </div>
                      {order.paymentStatus === "canceled" ? (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><strong>Order canceled.</strong><p className="mt-1">Edition inventory has been restored. Sandbox orders can now be deleted permanently.</p></div>
                      ) : <form onSubmit={(event) => saveFulfillment(event, order)} className="grid gap-2 rounded-md bg-stone-50 p-3 sm:grid-cols-2">
                        <label className="text-xs font-semibold">Status<select value={draft.status || "unfulfilled"} onChange={(event) => setOrderDrafts({ ...orderDrafts, [order.id]: { ...draft, status: event.target.value } })} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2 text-sm"><option value="unfulfilled">Unfulfilled</option><option value="processing">Processing</option><option value="on_hold">On hold</option><option value="shipped">Shipped</option><option value="fulfilled">Fulfilled</option></select></label>
                        <label className="text-xs font-semibold">Carrier<select value={draft.trackingCarrier || "FedEx"} onChange={(event) => setOrderDrafts({ ...orderDrafts, [order.id]: { ...draft, trackingCarrier: event.target.value } })} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2 text-sm"><option value="FedEx">FedEx</option><option value="UPS">UPS</option><option value="USPS">USPS</option><option value="SmugMug">SmugMug</option></select></label>
                        <label className="text-xs font-semibold sm:col-span-2">Tracking number<input value={draft.trackingNumber || ""} onChange={(event) => setOrderDrafts({ ...orderDrafts, [order.id]: { ...draft, trackingNumber: event.target.value } })} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2 text-sm" /></label>
                        <label className="text-xs font-semibold sm:col-span-2">Internal note<input value={draft.note || ""} onChange={(event) => setOrderDrafts({ ...orderDrafts, [order.id]: { ...draft, note: event.target.value } })} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2 text-sm" /></label>
                        <button type="submit" disabled={status === "saving"} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#63776a] px-3 py-2 text-xs font-semibold text-white sm:col-span-2"><Save className="h-3.5 w-3.5" /> Save fulfillment</button>
                      </form>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <details className="mt-6 rounded-lg border border-stone-300 bg-white shadow-sm">
            <summary className="cursor-pointer select-none px-4 py-4 text-base font-semibold text-stone-900">
              State sales and nexus rules <span className="ml-2 text-xs font-normal text-stone-500">({visibleRows.length} jurisdictions; {visibleRows.filter((row) => row.verification_status === "needs_review").length} need review)</span>
            </summary>
            <div className="overflow-x-auto border-t border-stone-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-stone-100 text-stone-700"><tr>{["State", "Reportable sales", "Transactions", "Revenue threshold", "Transaction threshold", "Progress", "Status", "Rule", "Action"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-stone-200">
                {visibleRows.map((row) => (
                  <tr key={row.state_code} className={row.reportable_sales_cents || row.physical_activity ? "bg-amber-50/30" : ""}>
                    <td className="whitespace-nowrap px-3 py-3"><strong>{row.state_code}</strong> · {row.state_name}</td>
                    <td className="whitespace-nowrap px-3 py-3">{formatCurrency(row.reportable_sales_cents / 100)}</td>
                    <td className="px-3 py-3">{row.reportable_transactions}</td>
                    <td className="whitespace-nowrap px-3 py-3">{row.revenue_threshold_cents == null ? "—" : formatCurrency(row.revenue_threshold_cents / 100)}</td>
                    <td className="px-3 py-3">{row.transaction_threshold ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3">{row.revenue_progress_percent == null ? "—" : `${row.revenue_progress_percent}%`}</td>
                    <td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 font-semibold ${statusClass(row.alert_status)}`}>{STATUS_LABELS[row.alert_status] || row.alert_status}</span></td>
                    <td className="max-w-sm px-3 py-3 text-stone-600"><div>{row.verification_status.replaceAll("_", " ")}</div>{row.activity_note && <div className="mt-1 text-red-700">{row.activity_note}</div>}</td>
                    <td className="whitespace-nowrap px-3 py-3"><button type="button" onClick={() => editNexusRule(row.state_code)} className="rounded-md border border-[#63776a] bg-white px-3 py-1.5 font-semibold text-[#4d6255] hover:bg-emerald-50">Edit / review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </details>

          <details className="mt-8 rounded-lg border border-stone-300 bg-[#fbfaf7] shadow-sm">
            <summary className="cursor-pointer select-none px-5 py-4 text-lg font-semibold text-stone-900">Expedition print pricing</summary>
            <form onSubmit={saveExpeditionPricing} className="border-t border-stone-200 p-5">
              <p className="text-xs text-stone-600">These prices drive the Expedition chart, native order window, and server-verified PayPal total. SmugMug pricing is not used.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold">Effective date<input required type="date" value={expeditionPricing.effectiveFrom} onChange={(event) => setExpeditionPricing({ ...expeditionPricing, effectiveFrom: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
                <label className="text-xs font-semibold">Rule label<input required value={expeditionPricing.label} onChange={(event) => setExpeditionPricing({ ...expeditionPricing, label: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {EXPEDITION_PRICE_FIELDS.map(([key, label]) => <label key={key} className="text-xs font-semibold">{label}<span className="relative mt-1 block"><span className="absolute left-3 top-2 text-stone-500">$</span><input required type="number" min="0.01" max="10000" step="0.01" value={expeditionPricing.prices[key] ?? ""} onChange={(event) => setExpeditionPricing({ ...expeditionPricing, prices: { ...expeditionPricing.prices, [key]: event.target.value } })} className="w-full rounded-md border border-stone-300 py-2 pl-7 pr-3 text-sm" /></span></label>)}
              </div>
              <button type="submit" disabled={status === "saving"} className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#8a3d2b] px-4 py-2 text-sm font-semibold text-white"><Save className="h-4 w-4" /> Save Expedition pricing</button>
            </form>
          </details>

          <form onSubmit={saveShipping} className="mt-8 rounded-lg border border-stone-300 bg-[#fbfaf7] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">U.S. {report.mode === "live" ? "live" : "sandbox"} shipping rates</h2>
                <p className="mt-1 max-w-4xl text-xs text-stone-600">Sketch/Foundation: highest shipping rate at 100%, then 50% of each additional print's rate. Signed Chronicle/Legend: highest at 100%, then 75% of each additional print's rate. Separate routes are added together. Engrained panels are charged at 100% per panel using the longest-side band.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">{report.mode === "live" ? "Live rules" : "Sandbox test rules"}</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-semibold">Effective date<input required type="date" value={shippingRates.effectiveFrom} onChange={(event) => setShippingRates({ ...shippingRates, effectiveFrom: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold">Rule label<input required value={shippingRates.label} onChange={(event) => setShippingRates({ ...shippingRates, label: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold">Checkout method label<input required value={shippingRates.methodLabel} onChange={(event) => setShippingRates({ ...shippingRates, methodLabel: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
            </div>
            <h3 className="mt-5 text-sm font-semibold text-stone-900">Paper print shipping</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SHIPPING_FIELDS.map(([key, label]) => <label key={key} className="text-xs font-semibold">{label}<span className="relative mt-1 block"><span className="absolute left-3 top-2 text-stone-500">$</span><input required type="number" min="0" max="10000" step="0.01" value={shippingRates.productRates[key] ?? ""} onChange={(event) => setShippingRates({ ...shippingRates, productRates: { ...shippingRates.productRates, [key]: event.target.value } })} className="w-full rounded-md border border-stone-300 py-2 pl-7 pr-3 text-sm" /></span></label>)}
            </div>
            <h3 className="mt-5 text-sm font-semibold text-stone-900">Engrained panel shipping (per panel)</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              {[["upTo24", 'Longest side up to 24"'], ["upTo36", 'Longest side 25"–36"'], ["upTo50", 'Longest side 37"–50"']].map(([key, label]) => <label key={key} className="text-xs font-semibold">{label}<span className="relative mt-1 block"><span className="absolute left-3 top-2 text-stone-500">$</span><input required type="number" min="0" max="10000" step="0.01" value={shippingRates.engrainedBands[key] ?? ""} onChange={(event) => setShippingRates({ ...shippingRates, engrainedBands: { ...shippingRates.engrainedBands, [key]: event.target.value } })} className="w-full rounded-md border border-stone-300 py-2 pl-7 pr-3 text-sm" /></span></label>)}
            </div>
            <button type="submit" disabled={status === "saving"} className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#8a3d2b] px-4 py-2 text-sm font-semibold text-white"><Save className="h-4 w-4" /> Save effective shipping rates</button>
          </form>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <form onSubmit={saveOhio} className="rounded-lg border border-stone-300 bg-[#fbfaf7] p-5">
              <h2 className="text-lg font-semibold">Ohio {report.mode === "live" ? "live" : "sandbox"} tax rule</h2>
              <p className="mt-1 text-xs text-amber-800">Changing this affects new {report.mode === "live" ? "live" : "sandbox"} quotes only. It does not by itself enable checkout.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold">Rate percent<input required type="number" min="0" max="100" step="0.01" value={ohioRate.ratePercent} onChange={(event) => setOhioRate({ ...ohioRate, ratePercent: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
                <label className="text-xs font-semibold">Effective date<input required type="date" value={ohioRate.effectiveFrom} onChange={(event) => setOhioRate({ ...ohioRate, effectiveFrom: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              </div>
              <label className="mt-3 block text-xs font-semibold">Label<input required value={ohioRate.label} onChange={(event) => setOhioRate({ ...ohioRate, label: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <label className="mt-3 block text-xs font-semibold">Official source URL<input type="url" value={ohioRate.sourceUrl} onChange={(event) => setOhioRate({ ...ohioRate, sourceUrl: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={ohioRate.taxShipping} onChange={(event) => setOhioRate({ ...ohioRate, taxShipping: event.target.checked })} /> Include shipping in taxable basis</label>
              <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#8a3d2b] px-4 py-2 text-sm font-semibold text-white"><Save className="h-4 w-4" /> Save effective rule</button>
            </form>

            <form onSubmit={addAdjustment} className="rounded-lg border border-stone-300 bg-[#fbfaf7] p-5">
              <h2 className="text-lg font-semibold">Add outside sales activity</h2>
              <p className="mt-1 text-xs text-stone-600">Use for SmugMug, marketplaces, shows, or historical amounts not recorded by native checkout.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold">State<select required value={adjustment.stateCode} onChange={(event) => setAdjustment({ ...adjustment, stateCode: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"><option value="">Select</option>{visibleRows.map((row) => <option key={row.state_code} value={row.state_code}>{row.state_code} · {row.state_name}</option>)}</select></label>
                <label className="text-xs font-semibold">Source<select value={adjustment.sourceType} onChange={(event) => setAdjustment({ ...adjustment, sourceType: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"><option value="manual">Manual</option><option value="smugmug">SmugMug</option><option value="marketplace">Marketplace</option><option value="show">In-person show</option><option value="other">Other</option></select></label>
                <label className="text-xs font-semibold">Sales dollars<input type="number" min="0" step="0.01" value={adjustment.salesDollars} onChange={(event) => setAdjustment({ ...adjustment, salesDollars: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
                <label className="text-xs font-semibold">Transactions<input type="number" min="0" step="1" value={adjustment.transactionCount} onChange={(event) => setAdjustment({ ...adjustment, transactionCount: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              </div>
              <label className="mt-3 block text-xs font-semibold">Date (optional)<input type="date" value={adjustment.occurredOn} onChange={(event) => setAdjustment({ ...adjustment, occurredOn: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <label className="mt-3 block text-xs font-semibold">Note<input value={adjustment.note} onChange={(event) => setAdjustment({ ...adjustment, note: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#63776a] px-4 py-2 text-sm font-semibold text-white"><PlusCircle className="h-4 w-4" /> Add to {year} report</button>
            </form>
          </div>

          <details id="nexus-rule-editor" className="mt-8 scroll-mt-6 rounded-lg border border-stone-300 bg-[#fbfaf7] shadow-sm">
            <summary className="cursor-pointer select-none px-5 py-4 text-lg font-semibold text-stone-900">Review or update a state nexus rule</summary>
            <form onSubmit={saveNexusRuleForm} className="border-t border-stone-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">State rule details</h2>
                <p className="mt-1 max-w-4xl text-xs text-stone-600">Update K4's monitoring threshold record and document the source used. Marking a rule reviewed does not register K4, enable collection, or replace tax advice.</p>
              </div>
              {nexusRule.stateCode && <button type="button" disabled={status === "saving"} onClick={markNexusReviewed} className="rounded-md border border-emerald-700 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-50">Mark verified for {year}</button>}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold">State<select required value={nexusRule.stateCode} onChange={(event) => selectNexusRule(event.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"><option value="">Select a state</option>{visibleRows.map((row) => <option key={row.state_code} value={row.state_code}>{row.state_code} · {row.state_name}</option>)}</select></label>
              <label className="text-xs font-semibold">Revenue threshold ($)<input type="number" min="0" step="0.01" value={nexusRule.revenueThresholdDollars} onChange={(event) => setNexusRule({ ...nexusRule, revenueThresholdDollars: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold">Transaction threshold<input type="number" min="0" step="1" value={nexusRule.transactionThreshold} onChange={(event) => setNexusRule({ ...nexusRule, transactionThreshold: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold">Threshold logic<select value={nexusRule.thresholdLogic} onChange={(event) => setNexusRule({ ...nexusRule, thresholdLogic: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm"><option value="revenue_only">Revenue only</option><option value="transactions_only">Transactions only</option><option value="either">Either threshold</option><option value="both">Both thresholds</option><option value="none">No threshold</option></select></label>
              <label className="text-xs font-semibold">Measurement period<input required value={nexusRule.measurementPeriod} onChange={(event) => setNexusRule({ ...nexusRule, measurementPeriod: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold">Effective date<input type="date" value={nexusRule.effectiveFrom || ""} onChange={(event) => setNexusRule({ ...nexusRule, effectiveFrom: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold lg:col-span-2">Review status<input required value={nexusRule.verificationStatus} onChange={(event) => setNexusRule({ ...nexusRule, verificationStatus: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
            </div>
            <label className="mt-3 block text-xs font-semibold">Sales basis<input required value={nexusRule.salesBasis} onChange={(event) => setNexusRule({ ...nexusRule, salesBasis: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
            <label className="mt-3 block text-xs font-semibold">Official source URL<input type="url" value={nexusRule.sourceUrl} onChange={(event) => setNexusRule({ ...nexusRule, sourceUrl: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
            <label className="mt-3 block text-xs font-semibold">Review notes<textarea rows="3" value={nexusRule.notes} onChange={(event) => setNexusRule({ ...nexusRule, notes: event.target.value })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /></label>
            <button type="submit" disabled={!nexusRule.stateCode || status === "saving"} className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#63776a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" /> Save state rule review</button>
            </form>
          </details>
        </>
      )}

      {status === "loading" && <div className="mt-10 flex items-center justify-center gap-2 text-stone-600"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading private report…</div>}
    </main>
  );
}

