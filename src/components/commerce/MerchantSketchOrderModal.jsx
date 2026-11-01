import { useEffect, useMemo, useState } from "react";
import { CircleX, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { normalizeImageSrc } from "../../utils/imageProxyCore.js";
import { MERCHANT_SKETCH_PRODUCT, buildCartItem } from "../../data/commerce/catalog.js";
import {
  addCartItem,
  formatCurrency,
  getCartCount,
  getCartSubtotal,
  loadCart,
  removeCartItem,
  updateCartQuantity,
} from "../../lib/commerce/cart.js";

function QuantityButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-600 transition hover:border-stone-500 hover:bg-stone-50"
    >
      {children}
    </button>
  );
}

export default function MerchantSketchOrderModal({ isOpen, onClose, image, trackEvent }) {
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState(() => loadCart());
  const [view, setView] = useState("product");

  useEffect(() => {
    if (!isOpen) return;
    setCart(loadCart());
    setQuantity(1);
    setView("product");
  }, [isOpen, image?.id]);

  const product = MERCHANT_SKETCH_PRODUCT;
  const imageSrc = useMemo(
    () => normalizeImageSrc(image?.src || image?.srcM || image?.srcL, "m"),
    [image?.src, image?.srcM, image?.srcL],
  );
  const cartCount = getCartCount(cart);
  const subtotal = getCartSubtotal(cart);

  if (!isOpen || !image) return null;

  const addCurrentProduct = () => {
    const item = buildCartItem(product, image, quantity);
    const nextCart = addCartItem(cart, item);
    setCart(nextCart);
    setView("cart");
    trackEvent?.("native_cart_add", {
      imageId: image.id,
      productKey: product.productKey,
      quantity,
      price: product.unitPrice,
    });
  };

  const updateQuantity = (lineId, nextQuantity) => {
    setCart(updateCartQuantity(cart, lineId, nextQuantity));
  };

  const removeItem = (lineId) => {
    setCart(removeCartItem(cart, lineId));
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-3 sm:p-5"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="relative max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-xl border border-stone-300 bg-[#fbfaf7] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="k4-native-cart-title"
        data-k4-native-cart
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#665047] bg-[#40332e]/95 px-4 py-3 text-white shadow-sm backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e7b9a7]">
              K4 Studios Collection
            </p>
            <h2 id="k4-native-cart-title" className="text-base font-semibold text-white">
              {view === "cart" ? "Your Cart" : 'Sketch Series - 5" x 7" Print'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("cart")}
              className="relative inline-flex h-9 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 text-xs font-semibold text-white hover:border-white/45 hover:bg-white/20"
              aria-label={`View cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#8a3d2b] px-1.5 py-0.5 text-[10px] text-white">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white"
              aria-label="Close ordering window"
            >
              <CircleX className="h-5 w-5" />
            </button>
          </div>
        </div>

        {view === "product" ? (
          <div className="p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
              <img
                src={imageSrc}
                alt={image.title || "K4 Studios fine art photograph"}
                className="mx-auto aspect-[4/3] w-full max-w-[210px] bg-stone-100 object-contain shadow-md sm:aspect-auto"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-stone-500">{product.edition}</p>
                <h3 className="mt-1 text-lg font-semibold leading-snug text-stone-900">{image.title}</h3>
                <p className="mt-2 text-sm font-semibold text-[#8a3d2b]">
                  {product.seriesLabel} · {product.size}
                </p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">
                  {formatCurrency(product.unitPrice, product.currency)}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-[#b9c9bc] bg-[#e7eee8] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#59695d]">
                Physical photographic print
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{product.description}</p>
              <dl className="mt-3 grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 text-xs text-stone-600">
                <dt className="font-semibold text-stone-700">Size</dt><dd>{product.size}</dd>
                <dt className="font-semibold text-stone-700">Finish</dt><dd>{product.finish}</dd>
                <dt className="font-semibold text-stone-700">Edition</dt><dd>{product.edition}</dd>
              </dl>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Quantity</span>
                <QuantityButton label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                  <Minus className="h-4 w-4" />
                </QuantityButton>
                <span className="w-5 text-center text-sm font-semibold text-stone-800">{quantity}</span>
                <QuantityButton label="Increase quantity" onClick={() => setQuantity((value) => Math.min(10, value + 1))}>
                  <Plus className="h-4 w-4" />
                </QuantityButton>
              </div>
              <button
                type="button"
                onClick={addCurrentProduct}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#4c5e52] bg-gradient-to-b from-[#738579] to-[#526459] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-[#627369] hover:to-[#44544a]"
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Cart · {formatCurrency(product.unitPrice * quantity)}
              </button>
            </div>

            <p className="mt-4 text-center text-[11px] leading-relaxed text-stone-500">
              {product.productionNote} Shipping and applicable tax are calculated during secure checkout.
            </p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            {cart.items.length === 0 ? (
              <div className="py-10 text-center">
                <ShoppingBag className="mx-auto h-9 w-9 text-stone-300" />
                <p className="mt-3 text-sm text-stone-600">Your cart is empty.</p>
                <button type="button" onClick={() => setView("product")} className="mt-4 text-sm font-semibold text-[#8a3d2b] underline">
                  Return to this print
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <article key={item.lineId} className="grid grid-cols-[70px_1fr] gap-3 rounded-lg border border-stone-200 bg-white p-3">
                      <img src={item.catalogScope === "expedition" ? item.imageSrc : normalizeImageSrc(item.imageSrc, "s")} alt="" className="h-[70px] w-[70px] rounded object-cover" />
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="line-clamp-2 text-sm font-semibold text-stone-800">{item.imageTitle}</h3>
                            <p className="mt-0.5 text-xs text-stone-500">{item.seriesLabel} · {item.size} · {item.finish}</p>
                          </div>
                          <button type="button" onClick={() => removeItem(item.lineId)} className="p-1 text-stone-400 hover:text-red-700" aria-label={`Remove ${item.imageTitle}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <QuantityButton label="Decrease quantity" onClick={() => updateQuantity(item.lineId, item.quantity - 1)}><Minus className="h-3.5 w-3.5" /></QuantityButton>
                            <span className="w-4 text-center text-xs font-semibold">{item.quantity}</span>
                            <QuantityButton label="Increase quantity" onClick={() => updateQuantity(item.lineId, item.quantity + 1)}><Plus className="h-3.5 w-3.5" /></QuantityButton>
                          </div>
                          <span className="text-sm font-semibold text-stone-800">{formatCurrency(item.unitPrice * item.quantity)}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-5 border-t border-stone-200 pt-4">
                  <div className="flex items-center justify-between text-sm text-stone-600"><span>Print subtotal</span><strong className="text-base text-stone-900">{formatCurrency(subtotal)}</strong></div>
                  <p className="mt-1 text-[11px] text-stone-500">Shipping and applicable tax are calculated during checkout.</p>
                  <a
                    href="/cart"
                    onClick={() => trackEvent?.("native_cart_review", { itemCount: cartCount, subtotal })}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[#6f351f] bg-gradient-to-b from-[#9a5336] to-[#73361f] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-[#87472e] hover:to-[#612d1a]"
                  >
                    Review Cart &amp; Checkout
                  </a>
                  <button type="button" onClick={() => setView("product")} className="mt-3 w-full text-center text-xs font-semibold text-stone-500 hover:text-stone-800">
                    Continue shopping
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

