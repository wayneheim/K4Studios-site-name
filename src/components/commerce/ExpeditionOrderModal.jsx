import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { buildCartItem, getExpeditionProducts } from "../../data/commerce/catalog.js";
import { addCartItem, formatCurrency, getCartCount, loadCart } from "../../lib/commerce/cart.js";
import { getCommerceApiBase } from "../../lib/commerce/checkoutApi.js";
import { trackEvent } from "../../utils/analytics.ts";

export default function ExpeditionOrderModal({ expeditionSlug, expeditionTitle }) {
  const baseProducts = useMemo(() => getExpeditionProducts(expeditionSlug), [expeditionSlug]);
  const [products, setProducts] = useState(baseProducts);
  const [image, setImage] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [cartCount, setCartCount] = useState(() => getCartCount(loadCart()));

  useEffect(() => {
    const onOpen = (event) => setImage(event.detail || null);
    const onCart = () => setCartCount(getCartCount(loadCart()));
    window.addEventListener("k4:expedition-order-open", onOpen);
    window.addEventListener("k4:cart-updated", onCart);
    return () => {
      window.removeEventListener("k4:expedition-order-open", onOpen);
      window.removeEventListener("k4:cart-updated", onCart);
    };
  }, []);

  useEffect(() => {
    const base = getCommerceApiBase();
    if (!base) return;
    fetch(`${base}/config`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((config) => {
        const prices = config?.expeditionPricesCents;
        if (!prices) return;
        setProducts(baseProducts.map((product) => {
          const priceKey = product.productKey.replace(`expedition-${expeditionSlug}-`, "");
          const cents = Number(prices[priceKey]);
          return Number.isInteger(cents) && cents > 0 ? { ...product, unitPrice: cents / 100 } : product;
        }));
      })
      .catch(() => {});
  }, [baseProducts, expeditionSlug]);

  if (!image) return null;

  const quantityFor = (key) => quantities[key] || 1;
  const changeQuantity = (key, amount) => setQuantities((current) => ({
    ...current,
    [key]: Math.max(1, Math.min(10, quantityFor(key) + amount)),
  }));
  const addProduct = (product) => {
    addCartItem(loadCart(), buildCartItem(product, image, quantityFor(product.productKey)));
    setCartCount(getCartCount(loadCart()));
    trackEvent("native_cart_add", {
      imageId: image.id,
      pageType: "other",
      trigger: "expedition_modal",
    });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setImage(null)}>
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-[#fbfaf7] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="expedition-order-title">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-[#50392d] px-5 py-4 text-white">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ead8c9]">{expeditionTitle}</p>
            <h2 id="expedition-order-title" className="mt-1 text-xl font-semibold">Expedition Print Options</h2>
          </div>
          <div className="flex items-center gap-2">
            <a href="/cart" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-3 py-2 text-sm font-semibold hover:bg-white/10"><ShoppingBag className="h-4 w-4" /> Cart {cartCount > 0 && <span className="rounded-full bg-[#a04b32] px-2 py-0.5 text-xs">{cartCount}</span>}</a>
            <button type="button" onClick={() => setImage(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close print options"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="p-5">
          <div className="flex gap-4 border-b border-stone-200 pb-5">
            <img src={image.src} alt="" className="h-28 w-36 bg-stone-100 object-contain" />
            <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a3d2b]">Pre-release Expedition photograph</p><h3 className="mt-2 text-xl font-semibold text-stone-900">{image.title}</h3><p className="mt-2 text-sm text-stone-600">Choose a physical print size and finish.</p></div>
          </div>

          <div className="mt-5 space-y-3">
            {products.map((product) => (
              <article key={product.productKey} className={`rounded-lg border p-4 ${product.seriesKey === "sketch" ? "border-[#b7c8bd] bg-[#edf3ee]" : "border-[#d8c7ad] bg-[#f7f1e7]"}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-[170px] flex-1"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a3d2b]">{product.seriesKey === "sketch" ? "Sketch" : "Foundation"}</p><h4 className="mt-1 font-semibold text-stone-900">{product.size} · {product.finish}</h4><p className="mt-1 text-xs text-stone-600">Physical photographic print</p></div>
                  <strong className="text-lg text-stone-900">{formatCurrency(product.unitPrice)}</strong>
                  <div className="flex items-center gap-2"><button type="button" onClick={() => changeQuantity(product.productKey, -1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-white"><Minus className="h-4 w-4" /></button><span className="w-6 text-center text-sm font-semibold">{quantityFor(product.productKey)}</span><button type="button" onClick={() => changeQuantity(product.productKey, 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-white"><Plus className="h-4 w-4" /></button></div>
                  <button type="button" onClick={() => addProduct(product)} className="rounded-md bg-[#63776a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#52665a]">Add to Cart</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
