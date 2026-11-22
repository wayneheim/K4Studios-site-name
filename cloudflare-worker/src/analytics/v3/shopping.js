export const SHOPPING_STAGES = Object.freeze([
  { event: 'order_native_cart_opened', label: 'Opened ordering options', color: '#8ca8dc' },
  { event: 'native_cart_add', label: 'Added to cart', color: '#76a9ff' },
  { event: 'native_cart_view', label: 'Viewed cart', color: '#69c9ed' },
  { event: 'native_checkout_start', label: 'Started checkout', color: '#b7c879' },
  { event: 'native_checkout_quote', label: 'Calculated final total', color: '#f0cf63' },
  { event: 'native_payment_start', label: 'Started payment', color: '#f2ac55' },
  { event: 'native_order_complete', label: 'Order completed', color: '#66dc82' },
  { event: 'native_checkout_cancel', label: 'Checkout canceled', color: '#a4abb5' },
  { event: 'native_checkout_error', label: 'Checkout error', color: '#f08080' },
]);

export function shoppingCounts(value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { value = null; }
  }
  return Object.fromEntries(SHOPPING_STAGES.map(({ event }) => [event,
    Math.max(0, Math.floor(Number(value?.[event]) || 0))]));
}

export function shoppingTotal(value) {
  return Object.values(shoppingCounts(value)).reduce((sum, count) => sum + count, 0);
}

export function mergeShoppingCounts(values) {
  const counts = shoppingCounts(null);
  for (const value of values) {
    for (const [event, count] of Object.entries(shoppingCounts(value))) counts[event] += count;
  }
  return counts;
}

// New cart events carry a bounded, explicit item list in the existing target.
// A historical /cart target has no item information and must stay unassigned.
export function shoppingImageIds(target) {
  const value = String(target || '');
  const ids = value.startsWith('cart:') ? value.slice(5).split(',') : [value];
  return [...new Set(ids.filter(id => /^i-[a-zA-Z0-9_-]{1,80}$/.test(id)))].slice(0, 50);
}
