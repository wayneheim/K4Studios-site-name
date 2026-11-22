import { useEffect, useState } from "react";
import { easternDate, promotionCatalogMatchesItem, PROMOTION_CATALOG_OPTIONS } from "../../lib/commerce/server/promotions.js";

const inputClass = "mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm";
const series = ["sketch", "foundation", "chronicle", "legend", "engrained"];
const fresh = () => ({ name: "", code: "", discountType: "free_shipping", value: "10", startsOn: easternDate(), expiresOn: "", minimum: "0", maxUses: "", maxUsesPerEmail: "", enabled: false, eligibility: "all", catalogScope: "", seriesKeys: [], productKeys: [] });

export default function PromotionSettings({ mode, request }) {
  const [data, setData] = useState({ promotions: [], products: [] });
  const [draft, setDraft] = useState(fresh);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    request("/admin/promotions").then((next) => { if (active) setData(next); })
      .catch((e) => { if (active) { setError(true); setMessage(e.message); } });
    return () => { active = false; };
  }, [mode, request]);
  const field = (event) => setDraft((current) => ({ ...current, [event.target.name]: event.target.type === "checkbox" ? event.target.checked : event.target.value, ...(event.target.name === "catalogScope" ? { seriesKeys: [], productKeys: [] } : {}) }));
  const qualifyingProducts = data.products.filter((product) => promotionCatalogMatchesItem(draft.catalogScope, product));
  const qualifyingSeries = series.filter((seriesKey) => qualifyingProducts.some((product) => product.seriesKey === seriesKey));
  const toggle = (key, value) => setDraft((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value] }));
  const edit = (p) => {
    setDraft({ id: p.id, name: p.name, code: p.code || "", discountType: p.discountType, value: String(p.discountValue / 100), startsOn: p.startsOn, expiresOn: p.expiresOn || "", minimum: (p.minimumCents / 100).toFixed(2), maxUses: p.maxUses ?? "", maxUsesPerEmail: p.maxUsesPerEmail ?? "", enabled: p.enabled, catalogScope: p.scope.catalogScope || "", seriesKeys: p.scope.seriesKeys || [], productKeys: p.scope.productKeys || [], eligibility: p.scope.productKeys?.length ? "products" : p.scope.seriesKeys?.length ? "series" : "all" });
    document.getElementById("promotion-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const save = async (event) => {
    event.preventDefault();setBusy(true);setMessage("");setError(false);
    try {
      if (draft.eligibility === "series" && !draft.seriesKeys.length) throw new Error("Select at least one qualifying series.");
      if (draft.eligibility === "products" && !draft.productKeys.length) throw new Error("Select at least one qualifying product.");
      await request("/admin/promotions", { method: "POST", body: JSON.stringify({
        id: draft.id, name: draft.name, code: draft.code, discountType: draft.discountType,
        discountValue: Math.round(Number(draft.value) * 100), startsOn: draft.startsOn, expiresOn: draft.expiresOn || null,
        minimumCents: Math.round(Number(draft.minimum) * 100), maxUses: draft.maxUses || null, maxUsesPerEmail: draft.maxUsesPerEmail || null, enabled: draft.enabled,
        scope: { catalogScope: draft.catalogScope, seriesKeys: draft.eligibility === "series" ? draft.seriesKeys : [], productKeys: draft.eligibility === "products" ? draft.productKeys : [] },
      }) });
      setData(await request("/admin/promotions"));
      setMessage(draft.enabled ? "Promotion saved. Its dates, product rules, and use limits now control availability." : "Promotion saved disabled. Enable it when you are ready.");setDraft(fresh());
    } catch (e) { setError(true);setMessage(e.message); } finally { setBusy(false); }
  };
  const status = (p) => !p.enabled ? "Disabled" : p.startsOn > easternDate() ? "Scheduled" : p.expiresOn && p.expiresOn < easternDate() ? "Expired" : p.maxUses && p.redeemedCount + p.reservedCount >= p.maxUses ? "Used up / in payment" : "Active";
  return <section className="mt-6 rounded-lg border border-stone-300 bg-[#fbfaf7] p-5" aria-labelledby="promotions-heading">
    <h2 id="promotions-heading" className="text-lg font-semibold">Coupons &amp; shipping offers</h2>
    <p className="mt-1 text-sm text-stone-600">{mode === "live" ? "Live" : "Sandbox"} promotions. Automatic offers need no code; coupons require a code at checkout. One offer per order: entering a coupon replaces automatic offers.</p>
    <div className="mt-4 space-y-2">{data.promotions.length ? data.promotions.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-3">
      <div><strong className="text-sm">{p.name}</strong><span className="ml-2 text-xs text-stone-500">{status(p)}</span><p className="text-xs text-stone-600">{p.code || "Automatic offer"} · {p.startsOn} through {p.expiresOn || "no expiration"} · {p.redeemedCount} used, {p.reservedCount} in payment{p.maxUses ? ` / ${p.maxUses} total` : ""}{p.maxUsesPerEmail ? ` · ${p.maxUsesPerEmail} per customer email` : ""}</p></div>
      <button type="button" disabled={busy} onClick={() => edit(p)} className="rounded border border-stone-300 px-3 py-2 text-sm">Edit / disable</button>
    </div>) : <p className="text-sm text-stone-500">No promotions configured.</p>}</div>
    <form id="promotion-editor" onSubmit={save} className="mt-5 scroll-mt-6 border-t border-stone-200 pt-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{draft.id ? "Edit promotion" : "New promotion"}</h3><button type="button" onClick={() => setDraft(fresh())} className="text-sm text-[#8a3d2b] underline">Clear / new</button></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">Offer name<input required maxLength={160} name="name" value={draft.name} onChange={field} className={inputClass} /></label>
        <label className="text-sm">Coupon code (blank = automatic)<input name="code" value={draft.code} onChange={field} maxLength={40} placeholder="e.g. THANKYOU10" className={inputClass} /></label>
        <label className="text-sm">Offer type<select aria-label="Offer type" name="discountType" value={draft.discountType} onChange={field} className={inputClass}><option value="free_shipping">Free shipping</option><option value="percent_off">Percentage off prints</option><option value="amount_off">Dollar amount off prints</option></select></label>
        {draft.discountType !== "free_shipping" && <label className="text-sm">{draft.discountType === "percent_off" ? "Discount percent (up to 99%)" : "Discount dollars"}<input required type="number" min="0.01" max={draft.discountType === "percent_off" ? "99" : "1000000"} step="0.01" name="value" value={draft.value} onChange={field} className={inputClass} /></label>}
        <label className="text-sm">Minimum qualifying prints ($)<input required type="number" min="0" step="0.01" name="minimum" value={draft.minimum} onChange={field} className={inputClass} /></label>
        <label className="text-sm">Starts on (Eastern)<input required type="date" name="startsOn" value={draft.startsOn} onChange={field} className={inputClass} /></label>
        <div><label className="text-sm">Expires at end of date (Eastern)<input type="date" name="expiresOn" min={draft.startsOn} value={draft.expiresOn} onChange={field} className={inputClass} /></label><button type="button" disabled={!draft.startsOn} onClick={() => { const end = new Date(`${draft.startsOn}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+9);setDraft({ ...draft, expiresOn: end.toISOString().slice(0,10) }); }} className="mt-1 text-xs text-[#8a3d2b] underline">Set a 10-day offer</button></div>
        <div><label className="text-sm">Total paid orders allowed (blank = unlimited)<input type="number" min="1" step="1" name="maxUses" value={draft.maxUses} onChange={field} className={inputClass} /></label><button type="button" onClick={() => setDraft({ ...draft, maxUses: "1" })} className="mt-1 text-xs text-[#8a3d2b] underline">One use total</button></div>
        <label className="text-sm">Uses per customer email (blank = unlimited)<input type="number" min="1" step="1" name="maxUsesPerEmail" value={draft.maxUsesPerEmail} onChange={field} className={inputClass} /></label>
        <label className="text-sm">Catalog<select aria-label="Catalog" name="catalogScope" value={draft.catalogScope} onChange={field} className={inputClass}>{PROMOTION_CATALOG_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}{draft.catalogScope === "collection" && <option value="collection">Main collection only (existing offer)</option>}</select></label>
        <label className="text-sm">Qualifying products<select aria-label="Qualifying products" name="eligibility" value={draft.eligibility} onChange={field} className={inputClass}><option value="all">All products in selected catalog</option><option value="series">Selected print series</option><option value="products">Selected sizes / products</option></select></label>
      </div>
      {draft.eligibility === "series" && <fieldset className="mt-4 flex flex-wrap gap-4"><legend className="mb-2 text-sm font-semibold">Qualifying series</legend>{qualifyingSeries.map((key) => <label key={key} className="flex items-center gap-2 text-sm capitalize"><input type="checkbox" checked={draft.seriesKeys.includes(key)} onChange={() => toggle("seriesKeys",key)} />{key}</label>)}</fieldset>}
      {draft.eligibility === "products" && <fieldset className="mt-4 max-h-52 space-y-2 overflow-y-auto rounded border border-stone-200 bg-white p-3"><legend className="text-sm font-semibold">Qualifying products</legend>{qualifyingProducts.map((p) => <label key={p.productKey} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={draft.productKeys.includes(p.productKey)} onChange={() => toggle("productKeys",p.productKey)} />{p.label}</label>)}</fieldset>}
      <p className="mt-4 text-xs leading-relaxed text-stone-600">The minimum is the qualifying merchandise subtotal before tax, shipping, or discounts. Free shipping covers qualifying items; other products keep their shipping charges. Usage is counted per paid order, not per print. Payments in progress hold a use; refunds do not restore a redeemed coupon.</p>
      <label className="mt-4 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="enabled" checked={draft.enabled} onChange={field} />Enable this promotion within its dates and limits</label>
      <button type="submit" disabled={busy} className="mt-4 rounded-md bg-[#8a3d2b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save promotion"}</button>
    </form>
    {message && <p role="status" className={`mt-3 text-sm ${error ? "text-red-700" : "text-emerald-800"}`}>{message}</p>}
  </section>;
}
