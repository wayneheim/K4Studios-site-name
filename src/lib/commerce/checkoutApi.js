export function getCommerceApiBase() {
  const configured = String(import.meta.env.PUBLIC_K4_COMMERCE_API_BASE || "").replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "http://127.0.0.1:8791";
  }
  return "";
}

export async function commerceRequest(pathname, options = {}) {
  const base = getCommerceApiBase();
  if (!base) throw new Error("The K4 checkout service is not connected to this environment.");
  const response = await fetch(`${base}${pathname}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Checkout service returned ${response.status}.`);
  return body;
}

