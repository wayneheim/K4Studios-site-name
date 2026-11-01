import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus, ShieldCheck, ShoppingBag, Trash2 } from "lucide-react";
import { normalizeImageSrc } from "../../utils/imageProxyCore.js";
import {
  formatCurrency,
  getCartCount,
  getCartSubtotal,
  loadCart,
  removeCartItem,
  updateCartQuantity,
} from "../../lib/commerce/cart.js";
import PayPalSandboxCheckout from "./PayPalSandboxCheckout.jsx";

export default function NativeCartPage() {
  const [cart, setCart] = useState(() => loadCart());
  const [returnHref, setReturnHref] = useState("/Galleries");
  const [checkoutQuote, setCheckoutQuote] = useState(null);

  useEffect(() => {
    if (document.referrer?.startsWith(window.location.origin)) {
      setReturnHref(document.referrer);
    }

    const refresh = () => setCart(loadCart());
    window.addEventListener("k4:cart-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("k4:cart-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const itemCount = getCartCount(cart);
  const localSubtotal = getCartSubtotal(cart);
  const subtotal = localSubtotal;
  const updateQuantity = (lineId, quantity) => setCart(updateCartQuantity(cart, lineId, quantity));
  const removeItem = (lineId) => setCart(removeCartItem(cart, lineId));

  return (
    <main className="mx-auto min-h-[80vh] max-w-6xl px-4 py-8 sm:px-6 sm:py-12" data-k4-cart-page>
      <a href={returnHref} className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-[#8a3d2b]">
        <ArrowLeft className="h-4 w-4" /> Continue viewing the collection
      </a>

      <div className="mt-6 flex flex-col gap-2 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8a3d2b]">K4 Studios</p>
          <h1 className="mt-1 text-3xl font-semibold text-stone-900">Your Collection Cart</h1>
        </div>
        <p className="text-sm text-stone-500">{itemCount} print{itemCount === 1 ? "" : "s"}</p>
      </div>

      {cart.items.length === 0 ? (
        <section className="mt-8 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-6 py-16 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-stone-300" />
          <h2 className="mt-4 text-lg font-semibold text-stone-700">Your cart is waiting for a story.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">Return to the collection and choose a physical K4 Studios print.</p>
        </section>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4" aria-label="Cart items">
            {cart.items.map((item) => (
              <article key={item.lineId} className="grid gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:grid-cols-[140px_1fr]">
                <img src={item.catalogScope === "expedition" ? item.imageSrc : normalizeImageSrc(item.imageSrc, "m")} alt="" className="aspect-[4/3] w-full rounded-lg bg-stone-100 object-contain" />
                <div className="flex min-w-0 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a3d2b]">{item.seriesLabel}</p>
                      <h2 className="mt-1 text-lg font-semibold leading-snug text-stone-900">{item.imageTitle}</h2>
                      <p className="mt-1 text-sm text-stone-500">{item.size} · {item.finish} · {item.seriesKey === "engrained" ? "Physical Baltic Birch wood-panel print" : "Physical photographic print"}</p>
                    </div>
                    <button type="button" onClick={() => removeItem(item.lineId)} className="rounded p-2 text-stone-400 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${item.imageTitle}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-5">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => updateQuantity(item.lineId, item.quantity - 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 hover:bg-stone-50" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                      <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(item.lineId, item.quantity + 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 hover:bg-stone-50" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                    </div>
                    <p className="text-lg font-semibold text-stone-900">{formatCurrency(item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-xl border border-stone-300 bg-[#fbfaf7] p-5 shadow-md lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold text-stone-900">Order Summary</h2>
            <div className="mt-4 space-y-2 border-b border-stone-200 pb-4 text-sm">
              <div className="flex justify-between text-stone-600"><span>Print subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-stone-500"><span>Shipping</span><span>{checkoutQuote ? formatCurrency(checkoutQuote.shippingCents / 100) : "Calculated at checkout"}</span></div>
              <div className="flex justify-between text-stone-500"><span>Applicable tax</span><span>{checkoutQuote ? formatCurrency(checkoutQuote.taxCents / 100) : "Calculated at checkout"}</span></div>
            </div>
            <div className="mt-4 flex items-center justify-between"><span className="font-semibold text-stone-700">{checkoutQuote ? "Order total" : "Current subtotal"}</span><span className="text-2xl font-semibold text-stone-900">{formatCurrency(checkoutQuote ? checkoutQuote.totalCents / 100 : subtotal)}</span></div>

            <PayPalSandboxCheckout cart={cart} onQuote={setCheckoutQuote} />

            <div className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-stone-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#63776a]" />
              <span>
                {checkoutQuote
                  ? "Pricing, shipping, tax, and the order total were verified by K4's server."
                  : "Pricing, shipping, tax, and the order total are verified before payment."}
              </span>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

