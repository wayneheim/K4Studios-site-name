// Fixed stage codes only: never send PayPal responses, buyer data, or error text.
export function createCheckoutTelemetry(track, getCartImageIds = () => []) {
  const reported = new Set();
  const stages = new Set(['config', 'quote', 'paypal_setup', 'paypal_open',
    'paypal_capture', 'paypal_error', 'card_open', 'card_capture',
    'card_error', 'card_validation', 'paypal_cancel', 'card_cancel']);
  return function report(stage) {
    if (!stages.has(stage) || reported.has(stage)) return;
    reported.add(stage);
    try {
      track(stage.endsWith('_cancel') ? 'native_checkout_cancel' : 'native_checkout_error', {
        pageType: 'other', sourceLayer: stage, trigger: stage, cartImageIds: getCartImageIds(),
      });
    } catch { /* Telemetry must never interrupt checkout. */ }
  };
}
