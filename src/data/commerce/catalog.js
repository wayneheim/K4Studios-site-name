export const MERCHANT_SKETCH_PRODUCT = Object.freeze({
  productKey: "sketch-5x7-pearl",
  seriesKey: "sketch",
  seriesLabel: "Sketch Series",
  size: '5" x 7"',
  finish: "Pearl",
  medium: "Professional photographic paper",
  unitPrice: 25,
  currency: "USD",
  checkoutEnabled: true,
  edition: "Open edition",
  fulfillment: "smugmug-manual",
  description:
    "A finished 5 x 7 photographic print on Fuji Crystal Archive Pearl paper. The glossy pearl finish brings crisp detail, rich color, warmth, and depth to the image.",
  productionNote:
    "Printed as a physical photograph and shipped to the delivery address provided at checkout.",
});

export const FOUNDATION_PRINT_PRODUCTS = Object.freeze([
  {
    productKey: "foundation-8x10-pearl",
    seriesKey: "foundation",
    seriesLabel: "Foundation Series",
    size: '8" x 10"',
    finish: "Pearl",
    medium: "Professional photographic paper",
    unitPrice: 75,
    currency: "USD",
    checkoutEnabled: true,
    edition: "Open edition",
    fulfillment: "smugmug-manual",
    description:
      "An 8 x 10 photographic print on Fuji Crystal Archive Pearl paper, selected for crisp detail, high-intensity color, and a pearl-like finish that adds warmth and depth.",
  },
  {
    productKey: "foundation-11x14-lustre",
    seriesKey: "foundation",
    seriesLabel: "Foundation Series",
    size: '11" x 14"',
    finish: "Lustre",
    medium: "Professional photographic paper",
    unitPrice: 150,
    currency: "USD",
    checkoutEnabled: true,
    edition: "Open edition",
    fulfillment: "smugmug-manual",
    description:
      "An 11 x 14 photographic print on Fujicolor Professional DP II Lustre paper, with vibrant color, a substantial feel, and a fingerprint-resistant finish.",
  },
]);

export const CHRONICLE_PRINT_PRODUCTS = Object.freeze([
  {
    productKey: "chronicle-16x20-cotton-rag",
    seriesKey: "chronicle",
    seriesLabel: "Chronicle Series",
    size: '16" x 20"',
    finish: "Moab Entrada Bright Rag",
    medium: "290gsm archival cotton rag fine art paper",
    unitPrice: 1100,
    currency: "USD",
    checkoutEnabled: true,
    edition: "Signed limited edition of 50",
    editionLimit: 50,
    fulfillment: "k4-manual",
    description:
      "A signed and numbered limited edition on Moab Entrada Bright Rag, a smooth, museum-grade 100% cotton fine art paper selected for permanence and substantial presence.",
  },
  {
    productKey: "chronicle-20x24-cotton-rag",
    seriesKey: "chronicle",
    seriesLabel: "Chronicle Series",
    size: '20" x 24"',
    finish: "Moab Entrada Bright Rag",
    medium: "290gsm archival cotton rag fine art paper",
    unitPrice: 1500,
    currency: "USD",
    checkoutEnabled: true,
    edition: "Signed limited edition of 50",
    editionLimit: 50,
    fulfillment: "k4-manual",
    description:
      "A signed and numbered limited edition on Moab Entrada Bright Rag, a smooth, museum-grade 100% cotton fine art paper selected for permanence and substantial presence.",
  },
]);

export const LEGEND_PRINT_PRODUCTS = Object.freeze([
  {
    productKey: "legend-30x40-cotton-rag",
    seriesKey: "legend",
    seriesLabel: "Legend Series",
    size: '30" x 40"',
    finish: "Moab Entrada Bright Rag",
    medium: "290gsm archival cotton rag fine art paper",
    unitPrice: 3800,
    currency: "USD",
    checkoutEnabled: true,
    edition: "Signed ultra-limited edition of 25",
    editionLimit: 25,
    fulfillment: "k4-manual",
    description:
      "A large-scale, signed and numbered statement edition on museum-grade Moab Entrada Bright Rag, issued in an ultra-limited edition for lasting presence and provenance.",
  },
  {
    productKey: "legend-40x60-cotton-rag",
    seriesKey: "legend",
    seriesLabel: "Legend Series",
    size: '40" x 60"',
    finish: "Moab Entrada Bright Rag",
    medium: "290gsm archival cotton rag fine art paper",
    unitPrice: 5000,
    currency: "USD",
    checkoutEnabled: true,
    edition: "Signed ultra-limited edition of 25",
    editionLimit: 25,
    fulfillment: "k4-manual",
    description:
      "A large-scale, signed and numbered statement edition on museum-grade Moab Entrada Bright Rag, issued in an ultra-limited edition for lasting presence and provenance.",
  },
]);

const EXPEDITION_PRODUCT_TEMPLATES = Object.freeze([
  {
    suffix: "sketch-5x7-pearl",
    shippingRateKey: "sketch-5x7-pearl",
    seriesKey: "sketch",
    seriesLabel: "Expedition Sketch Print",
    size: '5" x 7"',
    finish: "Pearl",
    medium: "Professional photographic paper",
    unitPrice: 10,
    description: "A finished 5 x 7 Expedition photograph on pearl-finish professional photographic paper.",
  },
  {
    suffix: "foundation-8x10-gloss",
    shippingRateKey: "foundation-8x10-pearl",
    seriesKey: "foundation",
    seriesLabel: "Expedition Foundation Print",
    size: '8" x 10"',
    finish: "Gloss",
    medium: "Professional photographic paper",
    unitPrice: 40,
    description: "An 8 x 10 Expedition photograph on gloss-finish professional photographic paper.",
  },
  {
    suffix: "foundation-8x10-pearl",
    shippingRateKey: "foundation-8x10-pearl",
    seriesKey: "foundation",
    seriesLabel: "Expedition Foundation Print",
    size: '8" x 10"',
    finish: "Pearl",
    medium: "Professional photographic paper",
    unitPrice: 45,
    description: "An 8 x 10 Expedition photograph on pearl-finish professional photographic paper.",
  },
  {
    suffix: "foundation-11x14-lustre",
    shippingRateKey: "foundation-11x14-lustre",
    seriesKey: "foundation",
    seriesLabel: "Expedition Foundation Print",
    size: '11" x 14"',
    finish: "Lustre",
    medium: "Professional photographic paper",
    unitPrice: 70,
    description: "An 11 x 14 Expedition photograph on lustre-finish professional photographic paper.",
  },
  {
    suffix: "foundation-11x14-pearl",
    shippingRateKey: "foundation-11x14-lustre",
    seriesKey: "foundation",
    seriesLabel: "Expedition Foundation Print",
    size: '11" x 14"',
    finish: "Pearl",
    medium: "Professional photographic paper",
    unitPrice: 75,
    description: "An 11 x 14 Expedition photograph on pearl-finish professional photographic paper.",
  },
]);

export const EXPEDITION_SLUGS = Object.freeze([
  "echoes-of-the-west-2026",
  "fiddlers-green-2026",
  "obv-wild-west-2026",
]);

export const EXPEDITION_PRINT_PRODUCTS = Object.freeze(
  EXPEDITION_SLUGS.flatMap((expeditionSlug) => EXPEDITION_PRODUCT_TEMPLATES.map((template) => Object.freeze({
    ...template,
    productKey: `expedition-${expeditionSlug}-${template.suffix}`,
    expeditionSlug,
    catalogScope: "expedition",
    currency: "USD",
    checkoutEnabled: true,
    edition: "Open edition pre-release print",
    fulfillment: "smugmug-manual",
  }))),
);

export const STANDARD_CART_PRODUCTS = Object.freeze([
  MERCHANT_SKETCH_PRODUCT,
  ...FOUNDATION_PRINT_PRODUCTS,
  ...CHRONICLE_PRINT_PRODUCTS,
  ...LEGEND_PRINT_PRODUCTS,
  ...EXPEDITION_PRINT_PRODUCTS,
]);

const PRODUCT_BY_KEY = new Map([
  ...STANDARD_CART_PRODUCTS,
].map((product) => [product.productKey, product]));

export function getCatalogProduct(productKey) {
  return PRODUCT_BY_KEY.get(String(productKey || "")) || null;
}

export function getCatalogProductsForSeries(seriesKey, excludedSizes = []) {
  const excluded = new Set(Array.isArray(excludedSizes) ? excludedSizes : []);
  return STANDARD_CART_PRODUCTS.filter((product) => (
    product.catalogScope !== "expedition" &&
    product.seriesKey === seriesKey &&
    product.checkoutEnabled &&
    !excluded.has(product.size)
  ));
}

export function getExpeditionProducts(expeditionSlug) {
  return EXPEDITION_PRINT_PRODUCTS.filter((product) => (
    product.expeditionSlug === expeditionSlug && product.checkoutEnabled
  ));
}

export function getExpeditionPriceKey(productKey) {
  const product = getCatalogProduct(productKey);
  return product?.catalogScope === "expedition"
    ? String(product.productKey).replace(`expedition-${product.expeditionSlug}-`, "")
    : "";
}

export function buildEngrainedCartProduct(engrainedLink) {
  const engrainedId = String(engrainedLink?.engrainedId || "").trim();
  const unitPrice = Number(String(engrainedLink?.price || "").replace(/[^0-9.]/g, ""));
  const size = String(engrainedLink?.imageSize || "").replace(/\s*[xXÃ—]\s*/g, '" x ').replace(/""/g, '"').trim();

  if (!engrainedId || !Number.isFinite(unitPrice) || unitPrice <= 0 || !size) return null;

  return {
    productKey: `engrained-${engrainedId}`,
    seriesKey: "engrained",
    seriesLabel: "Engrained Series",
    size,
    finish: "Baltic Birch panel",
    medium: "Hand-selected Baltic Birch wood panel",
    unitPrice,
    currency: "USD",
    checkoutEnabled: true,
    edition: `Signed limited edition of ${Number(engrainedLink?.editionSize) || 5} (+1 Artist Proof)`,
    editionLimit: Number(engrainedLink?.editionSize) || 5,
    fulfillment: "k4-manual",
    description: "A signed and numbered Baltic Birch wood-panel edition created with K4's five-layer UV process, allowing the natural grain to become part of the finished image.",
    engrainedId,
    galleryUrl: String(engrainedLink?.url || ""),
  };
}

export function buildCartItem(product, image, quantity = 1) {
  const cleanImageId = String(image?.id || "").replace(/-sketch$/i, "");
  const safeQuantity = Math.max(1, Math.min(10, Number.parseInt(quantity, 10) || 1));

  return {
    lineId: `${cleanImageId}:${product.productKey}`,
    productKey: product.productKey,
    imageId: cleanImageId,
    imageTitle: String(image?.title || "K4 Studios fine art photograph"),
    productDescription: String(product?.description || "").trim(),
    imageSrc: String(image?.src || image?.srcM || image?.srcL || ""),
    seriesKey: product.seriesKey,
    seriesLabel: product.seriesLabel,
    edition: product.edition,
    size: product.size,
    finish: product.finish,
    shippingRateKey: product.shippingRateKey || product.productKey,
    unitPrice: product.unitPrice,
    currency: product.currency,
    catalogScope: product.catalogScope || "collection",
    expeditionSlug: product.expeditionSlug || "",
    quantity: safeQuantity,
  };
}

