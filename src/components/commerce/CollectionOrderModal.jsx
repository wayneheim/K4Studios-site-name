import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, CircleX, Info, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { SERIES_DEFINITIONS, SERIES_ICONS } from "../../data/seriesDefinitions.js";
import { buildCartItem, buildEngrainedCartProduct, getCatalogProduct, getCatalogProductsForSeries } from "../../data/commerce/catalog.js";
import {
  addCartItem,
  formatCurrency,
  getCartCount,
  getCartSubtotal,
  loadCart,
  removeCartItem,
  updateCartQuantity,
} from "../../lib/commerce/cart.js";
import { normalizeImageSrc } from "../../utils/imageProxyCore.js";

const SERIES_COLORS = {
  sketch: { surface: "#e7eee8", border: "#b9c9bc", accent: "#59695d" },
  foundation: { surface: "#fbfaf5", border: "#d9d2c3", accent: "#756958" },
  chronicle: { surface: "#f4efe2", border: "#cbbd9f", accent: "#785c32" },
  legend: { surface: "#e7e0d0", border: "#bba983", accent: "#614624" },
  engrained: { surface: "#f5e6c8", border: "#c68a32", accent: "#783f17" },
};

function formatSeriesLabels(seriesOptions = []) {
  const labels = seriesOptions
    .map(({ definition }) => String(definition?.label || definition?.name || "").replace(/\s+Series$/i, "").trim())
    .filter(Boolean);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

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

function CartItemDescription({ description }) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const descriptionRef = useRef(null);

  useEffect(() => {
    if (expanded || !description) return undefined;

    const measure = () => {
      const element = descriptionRef.current;
      if (!element) return;
      setCanExpand(element.scrollHeight > element.clientHeight + 1);
    };

    const frame = window.requestAnimationFrame(measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    if (descriptionRef.current) observer?.observe(descriptionRef.current);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [description, expanded]);

  if (!description) return null;

  return (
    <div className="mt-2 border-t border-stone-100 pt-2">
      <p
        ref={descriptionRef}
        className={`text-xs leading-[1.45] text-stone-600 ${expanded ? "" : "line-clamp-3"}`}
      >
        {description}
      </p>
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8a3d2b] hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Show less" : "Show more"}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      )}
    </div>
  );
}

export default function CollectionOrderModal({
  isOpen,
  onClose,
  image,
  trackEvent,
  loading = false,
  displaySeries = [],
  excludeSizes = {},
  editionStates = {},
  cardCopy = {},
  infoCopy = {},
  oneImageMovie = false,
  engrainedLink = null,
  engrainedPrimary = false,
  paperAlternative = null,
  paperAlternativeLoading = false,
}) {
  const [cart, setCart] = useState(() => loadCart());
  const [view, setView] = useState("products");
  const [expandedSeries, setExpandedSeries] = useState(null);
  const [productQuantities, setProductQuantities] = useState({});
  const [recentlySaved, setRecentlySaved] = useState(null);
  const addedTimerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const storedCart = loadCart();
    const cleanImageId = String(image?.id || "").replace(/-sketch$/i, "");
    const storedQuantities = Object.fromEntries(
      storedCart.items
        .filter((item) => item.imageId === cleanImageId)
        .map((item) => [item.productKey, item.quantity]),
    );
    setCart(storedCart);
    setView("products");
    setExpandedSeries(null);
    setProductQuantities(storedQuantities);
    setRecentlySaved(null);
  }, [isOpen, image?.id]);

  useEffect(() => () => {
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
  }, []);

  const imageSrc = useMemo(
    () => normalizeImageSrc(image?.src || image?.srcM || image?.srcL, "m"),
    [image?.src, image?.srcM, image?.srcL],
  );
  const cartCount = getCartCount(cart);
  const subtotal = getCartSubtotal(cart);
  const engrainedProduct = useMemo(() => buildEngrainedCartProduct(engrainedLink), [engrainedLink]);

  if (!isOpen || !image) return null;

  const saveProduct = (product) => {
    const hasSelectedQuantity = Object.prototype.hasOwnProperty.call(productQuantities, product.productKey);
    const selectedQuantity = hasSelectedQuantity ? productQuantities[product.productKey] : 1;
    const cartItem = buildCartItem(product, image, Math.max(1, selectedQuantity));
    const existingItem = cart.items.find((item) => item.lineId === cartItem.lineId);
    const nextCart = existingItem
      ? updateCartQuantity(cart, cartItem.lineId, selectedQuantity)
      : addCartItem(cart, cartItem);
    setCart(nextCart);
    const action = existingItem && selectedQuantity === 0 ? "removed" : existingItem ? "updated" : "added";
    if (action === "removed") {
      setProductQuantities((current) => ({ ...current, [product.productKey]: 1 }));
    }
    setRecentlySaved({ productKey: product.productKey, action });
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setRecentlySaved(null), 1600);
    trackEvent?.("native_cart_add", {
      imageId: image.id,
      productKey: product.productKey,
      trigger: existingItem ? "collection_quantity_update" : "collection_modal",
      series: product.seriesKey,
      quantity: selectedQuantity,
      price: product.unitPrice,
    });
  };

  const setProductQuantity = (productKey, quantity, maximum = 10, minimum = 1) => {
    const parsedQuantity = Number.parseInt(quantity, 10);
    const nextQuantity = Math.max(minimum, Math.min(maximum, Number.isNaN(parsedQuantity) ? minimum : parsedQuantity));
    setProductQuantities((current) => ({ ...current, [productKey]: nextQuantity }));
  };

  const updateQuantity = (lineId, quantity) => {
    const currentItem = cart.items.find((item) => item.lineId === lineId);
    setCart(updateCartQuantity(cart, lineId, quantity));
    if (currentItem?.imageId === String(image?.id || "").replace(/-sketch$/i, "")) {
      setProductQuantities((current) => ({
        ...current,
        [currentItem.productKey]: Math.max(1, Number.parseInt(quantity, 10) || 1),
      }));
    }
  };
  const removeItem = (lineId) => setCart(removeCartItem(cart, lineId));

  const modal = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-3 sm:p-5"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="relative max-h-[94vh] w-full max-w-[680px] overflow-y-auto rounded-xl border border-stone-300 bg-[#fbfaf7] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="k4-collection-order-title"
        data-k4-native-collection-cart
      >
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#665047] bg-[#40332e]/95 px-4 py-3 text-white shadow-sm backdrop-blur sm:px-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e7b9a7]">K4 Studios Collection</p>
            <h2 id="k4-collection-order-title" className="text-base font-semibold text-white">
              {view === "cart" ? "Your Cart" : "Fine Art Print Options"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("cart")}
              className="relative inline-flex h-9 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 text-xs font-semibold text-white hover:border-white/45 hover:bg-white/20"
              aria-label={`View cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            >
              <ShoppingBag className="h-4 w-4" /> Cart
              {cartCount > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#8a3d2b] px-1.5 py-0.5 text-[10px] text-white">{cartCount}</span>}
            </button>
            <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white" aria-label="Close ordering window">
              <CircleX className="h-5 w-5" />
            </button>
          </div>
        </header>

        {view === "products" ? (
          <div className="p-4 sm:p-5">
            <div className="grid gap-4 border-b border-stone-200 pb-5 sm:grid-cols-[150px_1fr] sm:items-center">
              <img src={imageSrc} alt={image.title || "K4 Studios fine art photograph"} className="mx-auto max-h-[150px] w-full max-w-[220px] bg-stone-100 object-contain shadow-md" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8a3d2b]">Select a print edition</p>
                <h3 className="mt-1 text-xl font-semibold leading-snug text-stone-900">{image.title}</h3>
                {oneImageMovie && <p className="mt-1 text-xs text-[#8a3d2b]">A One-Image Movie™ work by Wayne Heim</p>}
                <p className="mt-2 text-sm leading-relaxed text-stone-600">Choose the scale and edition structure that best fits the work and the room where it will live.</p>
              </div>
            </div>

            {loading ? (
              <p className="py-12 text-center text-sm text-stone-500">Loading current print options…</p>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
                  <strong>Choose a print size, set the quantity, and add it to your cart.</strong>
                  <span className="mt-0.5 block text-xs text-stone-500">You can combine different images, sizes, and editions in one order.</span>
                </div>
                {displaySeries.map((seriesKey) => {
                  const definition = SERIES_DEFINITIONS[seriesKey];
                  const colors = SERIES_COLORS[seriesKey] || SERIES_COLORS.foundation;
                  const products = getCatalogProductsForSeries(seriesKey, excludeSizes?.[seriesKey]);
                  const editionState = editionStates?.[seriesKey] || {};
                  const sold = Number(editionState.sold) || Object.values(editionState.soldBySize || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
                  const remaining = definition?.editionLimit ? Math.max(0, definition.editionLimit - sold) : null;
                  const isExpanded = expandedSeries === seriesKey;

                  if (!definition || products.length === 0) return null;

                  return (
                    <article key={seriesKey} className="overflow-hidden rounded-lg border" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                      <div className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl" style={{ color: colors.accent }}>{definition.icon || SERIES_ICONS[seriesKey]}</span>
                            <div>
                              <h4 className="font-semibold text-stone-900">{definition.label} Series</h4>
                              <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">{products[0].edition}</p>
                            </div>
                          </div>
                          {remaining !== null && <span className="rounded-full border border-white/70 bg-white/55 px-2.5 py-1 text-[11px] font-semibold" style={{ color: colors.accent }}>{remaining} editions remaining</span>}
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-stone-700">{cardCopy?.[seriesKey] || products[0].description}</p>
                        <button
                          type="button"
                          onClick={() => setExpandedSeries(isExpanded ? null : seriesKey)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                          style={{ color: colors.accent }}
                        >
                          <Info className="h-3.5 w-3.5" /> About this series {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 border-t border-stone-400/20 pt-3 text-sm leading-relaxed text-stone-600 whitespace-pre-line">
                            {infoCopy?.[seriesKey]?.body || definition.description}
                          </div>
                        )}

                        <div className="mt-4 space-y-2">
                          {products.map((product) => {
                            const printed = Number(editionState?.printedBySize?.[product.size]) || 0;
                            const soldForSize = Number(editionState?.soldBySize?.[product.size]) || 0;
                            const quickShip = printed - soldForSize > 0;
                            const unavailable = remaining !== null && remaining <= 0;
                            const maximumQuantity = remaining === null ? 10 : Math.max(1, Math.min(10, remaining));
                            const cartItem = buildCartItem(product, image, 1);
                            const existingItem = cart.items.find((item) => item.lineId === cartItem.lineId);
                            const hasSelectedQuantity = Object.prototype.hasOwnProperty.call(productQuantities, product.productKey);
                            const quantity = hasSelectedQuantity ? productQuantities[product.productKey] : existingItem?.quantity || 1;
                            const minimumQuantity = existingItem ? 0 : 1;
                            const recentAction = recentlySaved?.productKey === product.productKey ? recentlySaved.action : null;
                            return (
                              <div
                                key={product.productKey}
                                className={`flex items-center justify-between gap-3 rounded-md border border-stone-300 bg-white px-3 py-3 shadow-sm transition ${unavailable ? "opacity-50" : "hover:border-stone-400"}`}
                              >
                                <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
                                  <span className="text-sm font-semibold text-stone-800">{product.size}</span>
                                  <span className="truncate text-[11px] text-stone-500">{product.finish}</span>
                                  {quickShip && <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Quick ship</span>}
                                </div>
                                <div className="flex shrink-0 items-center justify-end gap-3">
                                  <span className="min-w-[70px] text-right text-sm font-semibold" style={{ color: colors.accent }}>{formatCurrency(product.unitPrice)}</span>
                                  <div className="flex items-center gap-1.5" aria-label={`Quantity for ${product.size}`}>
                                    <button
                                      type="button"
                                      disabled={unavailable || quantity <= minimumQuantity}
                                      onClick={() => setProductQuantity(product.productKey, quantity - 1, maximumQuantity, minimumQuantity)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35"
                                      aria-label={`Decrease ${product.size} quantity`}
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className={`w-6 text-center text-sm font-semibold ${quantity === 0 ? "text-[#8a3d2b]" : "text-stone-800"}`}>{quantity}</span>
                                    <button
                                      type="button"
                                      disabled={unavailable || quantity >= maximumQuantity}
                                      onClick={() => setProductQuantity(product.productKey, quantity + 1, maximumQuantity, minimumQuantity)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35"
                                      aria-label={`Increase ${product.size} quantity`}
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={unavailable}
                                    onClick={() => saveProduct(product)}
                                    className={`inline-flex min-h-9 min-w-[112px] items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-white shadow-sm transition disabled:cursor-not-allowed ${recentAction ? "bg-emerald-700" : existingItem ? "bg-[#8a3d2b] hover:bg-[#743322]" : "bg-stone-700 hover:bg-stone-800"}`}
                                  >
                                    <ShoppingBag className="h-3.5 w-3.5" />
                                    {unavailable ? "Unavailable" : recentAction === "removed" ? "Removed ✓" : recentAction === "updated" ? "Updated ✓" : recentAction === "added" ? "Added ✓" : existingItem ? "Update Cart" : "Add to Cart"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  );
                })}
                {engrainedProduct && (() => {
                  const colors = SERIES_COLORS.engrained;
                  const cartItem = buildCartItem(engrainedProduct, image, 1);
                  const existingItem = cart.items.find((item) => item.lineId === cartItem.lineId);
                  const hasSelectedQuantity = Object.prototype.hasOwnProperty.call(productQuantities, engrainedProduct.productKey);
                  const quantity = hasSelectedQuantity ? productQuantities[engrainedProduct.productKey] : existingItem?.quantity || 1;
                  const minimumQuantity = existingItem ? 0 : 1;
                  const maximumQuantity = Math.max(1, Math.min(10, Number(engrainedProduct.editionLimit) || 1));
                  const recentAction = recentlySaved?.productKey === engrainedProduct.productKey ? recentlySaved.action : null;
                  const isExpanded = expandedSeries === "engrained";

                  return (
                    <article
                      className="overflow-hidden rounded-lg border-2 shadow-[0_4px_14px_rgba(120,63,23,0.12)]"
                      style={{
                        background: `linear-gradient(135deg, #fff9ec 0%, ${colors.surface} 100%)`,
                        borderColor: colors.border,
                      }}
                    >
                      <div className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl" style={{ color: colors.accent }}>{SERIES_ICONS.engrained || "◈"}</span>
                            <div>
                              <h4 className="font-semibold text-stone-900">
                                {engrainedPrimary ? "Engrained Series" : "Also Available in the Engrained Series"}
                              </h4>
                              <p className="text-[11px] uppercase tracking-[0.12em] text-stone-500">{engrainedProduct.edition}</p>
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-stone-700">
                          Printed directly on hand-selected Baltic Birch, where the natural wood grain becomes part of the finished artwork.
                        </p>
                        <button
                          type="button"
                          onClick={() => setExpandedSeries(isExpanded ? null : "engrained")}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                          style={{ color: colors.accent }}
                        >
                          <Info className="h-3.5 w-3.5" /> About this series {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 border-t border-stone-400/20 pt-3 text-sm leading-relaxed text-stone-600">
                            The Engrained Series is a highly limited special edition of only five works plus one artist proof for each image. Each Engrained creation marries the historic record of time uniquely encapsulated in the grain of Baltic Birch with K4's five-layer UV printing process, making every finished piece visually distinct. Each work is personally hand-signed and numbered by Wayne Heim.
                            {!engrainedPrimary && engrainedProduct.galleryUrl && (
                              <a href={engrainedProduct.galleryUrl} className="mt-2 block text-xs font-semibold underline" style={{ color: colors.accent }}>
                                View this work in the Engrained gallery →
                              </a>
                            )}
                          </div>
                        )}

                        <div className="mt-4">
                          <div
                            className="flex items-center justify-between gap-3 rounded-md border bg-white/90 px-3 py-3 shadow-sm transition hover:bg-white"
                            style={{ borderColor: "#d8b77f" }}
                          >
                            <div className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
                              <span className="text-sm font-semibold text-stone-800">{engrainedProduct.size}</span>
                              <span className="truncate text-[11px] text-stone-500">{engrainedProduct.finish}</span>
                              {engrainedLink?.hasInventory && <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Quick ship</span>}
                            </div>
                            <div className="flex shrink-0 items-center justify-end gap-3">
                              <span className="min-w-[70px] text-right text-sm font-semibold" style={{ color: colors.accent }}>{formatCurrency(engrainedProduct.unitPrice)}</span>
                              <div className="flex items-center gap-1.5" aria-label={`Quantity for ${engrainedProduct.size}`}>
                                <button
                                  type="button"
                                  disabled={quantity <= minimumQuantity}
                                  onClick={() => setProductQuantity(engrainedProduct.productKey, quantity - 1, maximumQuantity, minimumQuantity)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35"
                                  aria-label={`Decrease ${engrainedProduct.size} quantity`}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className={`w-6 text-center text-sm font-semibold ${quantity === 0 ? "text-[#8a3d2b]" : "text-stone-800"}`}>{quantity}</span>
                                <button
                                  type="button"
                                  disabled={quantity >= maximumQuantity}
                                  onClick={() => setProductQuantity(engrainedProduct.productKey, quantity + 1, maximumQuantity, minimumQuantity)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-35"
                                  aria-label={`Increase ${engrainedProduct.size} quantity`}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => saveProduct(engrainedProduct)}
                                className={`inline-flex min-h-9 min-w-[112px] items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-white shadow-sm transition ${recentAction ? "bg-emerald-700" : existingItem ? "bg-[#8a3d2b] hover:bg-[#743322]" : "bg-stone-700 hover:bg-stone-800"}`}
                              >
                                <ShoppingBag className="h-3.5 w-3.5" />
                                {recentAction === "removed" ? "Removed ✓" : recentAction === "updated" ? "Updated ✓" : recentAction === "added" ? "Added ✓" : existingItem ? "Update Cart" : "Add to Cart"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })()}
                {engrainedPrimary && (paperAlternativeLoading || paperAlternative) && (
                  <article className="rounded-lg border border-stone-300 bg-[#f7f5ef] p-4">
                    {paperAlternativeLoading && !paperAlternative && (
                      <p className="text-sm text-stone-500">Loading other available series…</p>
                    )}

                    {paperAlternative && (
                      <div className="space-y-3">
                        <p className="text-sm leading-relaxed text-stone-700">
                          {formatSeriesLabels(paperAlternative.seriesOptions)
                            ? <>Similar work is available as part of the <strong>{formatSeriesLabels(paperAlternative.seriesOptions)}</strong> non-wood series.</>
                            : <>Similar work is available as part of K4 Studios' non-wood print series.</>}
                        </p>
                        {paperAlternative.url && (
                          <a
                            href={paperAlternative.url}
                            className="inline-flex w-full items-center justify-center rounded-md border border-stone-400 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
                            onClick={() => trackEvent?.("paper_options_clicked", { imageId: image.id })}
                          >
                            Explore Other Series
                          </a>
                        )}
                      </div>
                    )}
                  </article>
                )}
              </div>
            )}

            <p className="mt-5 text-center text-[11px] leading-relaxed text-stone-500">Listed dimensions indicate the maximum image dimension. Shipping and applicable tax are calculated during secure checkout.</p>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            {cart.items.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="mx-auto h-9 w-9 text-stone-300" />
                <p className="mt-3 text-sm text-stone-600">Your cart is empty.</p>
                <button type="button" onClick={() => setView("products")} className="mt-4 text-sm font-semibold text-[#8a3d2b] underline">Return to print options</button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <article key={item.lineId} className="grid grid-cols-[74px_1fr] gap-3 rounded-lg border border-stone-200 bg-white p-3">
                      <img src={item.catalogScope === "expedition" ? item.imageSrc : normalizeImageSrc(item.imageSrc, "s")} alt="" className="h-[74px] w-[74px] object-cover" />
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a3d2b]">{item.seriesLabel}</p>
                            <h3 className="line-clamp-2 text-sm font-semibold text-stone-800">{item.imageTitle}</h3>
                            <p className="mt-0.5 text-xs text-stone-500">{item.size} · {item.finish}</p>
                          </div>
                          <button type="button" onClick={() => removeItem(item.lineId)} className="p-1 text-stone-400 hover:text-red-700" aria-label={`Remove ${item.imageTitle}`}><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <CartItemDescription description={item.productDescription || getCatalogProduct(item.productKey)?.description || ""} />
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
                  <a href="/cart" onClick={() => trackEvent?.("native_collection_cart_review", { itemCount: cartCount, subtotal })} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[#6f351f] bg-gradient-to-b from-[#9a5336] to-[#73361f] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-[#87472e] hover:to-[#612d1a]">Review Cart &amp; Checkout</a>
                  <button type="button" onClick={() => setView("products")} className="mt-3 w-full text-center text-xs font-semibold text-stone-500 hover:text-stone-800">Continue choosing print options</button>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.getElementById("overlay-root") || document.body);
}
