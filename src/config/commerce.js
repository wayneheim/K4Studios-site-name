/**
 * K4 commerce feature switches.
 *
 * All public artwork ordering now uses K4's native collection cart. SmugMug is
 * retained only as a private fulfillment tool after an order is received.
 */
export const COMMERCE_FLAGS = Object.freeze({
  nativeMerchantCart: true,
  nativeCollectionCart: true,
});

export function isMerchantSketchPath(pathname = "") {
  return /\/i-[A-Za-z0-9]+-sketch\/?$/i.test(String(pathname || ""));
}

export function shouldUseNativeMerchantCart(pathname) {
  if (!COMMERCE_FLAGS.nativeMerchantCart) return false;

  const resolvedPath = pathname ?? (
    typeof window !== "undefined" ? window.location.pathname : ""
  );

  return isMerchantSketchPath(resolvedPath);
}

/**
 * Complete collection cart on ordinary artwork pages.
 */
export function shouldUseNativeCollectionCart(imageId, pathname) {
  if (!COMMERCE_FLAGS.nativeCollectionCart) return false;

  const resolvedPath = pathname ?? (
    typeof window !== "undefined" ? window.location.pathname : ""
  );
  if (isMerchantSketchPath(resolvedPath)) return false;

  const cleanImageId = String(imageId || "").replace(/-sketch$/i, "");
  return /^i-[A-Za-z0-9]+$/.test(cleanImageId);
}

