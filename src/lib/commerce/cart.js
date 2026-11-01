export const CART_STORAGE_KEY = "k4-native-cart-v1";
export const CART_VERSION = 1;

export function emptyCart() {
  return { version: CART_VERSION, items: [], updatedAt: new Date().toISOString() };
}

function normalizeQuantity(value) {
  return Math.max(1, Math.min(10, Number.parseInt(value, 10) || 1));
}

export function normalizeCart(cart) {
  const items = Array.isArray(cart?.items)
    ? cart.items
      .filter((item) => item?.lineId && item?.productKey && item?.imageId)
      .map((item) => ({ ...item, quantity: normalizeQuantity(item.quantity) }))
    : [];

  return {
    version: CART_VERSION,
    items,
    updatedAt: cart?.updatedAt || new Date().toISOString(),
  };
}

export function loadCart() {
  if (typeof window === "undefined") return emptyCart();
  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    return stored ? normalizeCart(JSON.parse(stored)) : emptyCart();
  } catch {
    return emptyCart();
  }
}

export function saveCart(cart) {
  const normalized = {
    ...normalizeCart(cart),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("k4:cart-updated", { detail: normalized }));
  }

  return normalized;
}

export function addCartItem(cart, nextItem) {
  const normalized = normalizeCart(cart);
  const index = normalized.items.findIndex((item) => item.lineId === nextItem.lineId);

  if (index >= 0) {
    const items = [...normalized.items];
    items[index] = {
      ...items[index],
      quantity: normalizeQuantity(items[index].quantity + nextItem.quantity),
    };
    return saveCart({ ...normalized, items });
  }

  return saveCart({ ...normalized, items: [...normalized.items, nextItem] });
}

export function updateCartQuantity(cart, lineId, quantity) {
  const normalized = normalizeCart(cart);
  const nextQuantity = Number.parseInt(quantity, 10);
  const items = nextQuantity <= 0
    ? normalized.items.filter((item) => item.lineId !== lineId)
    : normalized.items.map((item) => (
      item.lineId === lineId ? { ...item, quantity: normalizeQuantity(nextQuantity) } : item
    ));
  return saveCart({ ...normalized, items });
}

export function removeCartItem(cart, lineId) {
  const normalized = normalizeCart(cart);
  return saveCart({
    ...normalized,
    items: normalized.items.filter((item) => item.lineId !== lineId),
  });
}

export function getCartCount(cart) {
  return normalizeCart(cart).items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartSubtotal(cart) {
  return normalizeCart(cart).items.reduce(
    (total, item) => total + (Number(item.unitPrice) || 0) * item.quantity,
    0,
  );
}

export function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value) || 0);
}

