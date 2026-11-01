import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeDollarSign, LoaderCircle, LockKeyhole, TriangleAlert } from "lucide-react";
import { commerceRequest } from "../../lib/commerce/checkoutApi.js";
import { emptyCart, formatCurrency, saveCart } from "../../lib/commerce/cart.js";

const STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
  ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
  ["DC", "District of Columbia"],
];

const EMPTY_FORM = {
  name: "", email: "", phone: "", addressLine1: "", addressLine2: "", city: "", stateCode: "OH", postalCode: "",
};

let sdkPromise;
function loadPayPalSdk(url) {
  if (window.paypal?.createInstance) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("PayPal checkout could not be loaded."));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

function checkoutPayload(cart, form) {
  return {
    items: cart.items.map(({ productKey, imageId, imageTitle, quantity }) => ({ productKey, imageId, imageTitle, quantity })),
    buyer: { name: form.name, email: form.email, phone: form.phone },
    shippingAddress: {
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      city: form.city,
      stateCode: form.stateCode,
      postalCode: form.postalCode,
      countryCode: "US",
    },
  };
}

export default function PayPalSandboxCheckout({ cart, onQuote }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [quote, setQuote] = useState(null);
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState(null);
  const buttonHostRef = useRef(null);
  const guestCardHostRef = useRef(null);
  const [guestCardEligible, setGuestCardEligible] = useState(false);
  const payload = useMemo(() => checkoutPayload(cart, form), [cart, form]);
  const isSandbox = config?.mode !== "live";

  useEffect(() => {
    let active = true;
    commerceRequest("/config")
      .then((nextConfig) => { if (active) setConfig(nextConfig); })
      .catch((error) => { if (active) { setStatus("error"); setMessage(error.message); } });
    return () => { active = false; };
  }, []);

  const setField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setQuote(null);
    onQuote?.(null);
  };

  const calculate = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const [nextConfig, nextQuote] = await Promise.all([
        commerceRequest("/config"),
        commerceRequest("/quote", { method: "POST", body: JSON.stringify(payload) }),
      ]);
      if (!nextConfig.configured) throw new Error(`PayPal ${nextConfig.mode || "checkout"} credentials have not been added yet.`);
      setConfig(nextConfig);
      setQuote(nextQuote);
      onQuote?.(nextQuote);
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  };

  useEffect(() => {
    if (!quote || !config?.configured || !buttonHostRef.current || !guestCardHostRef.current) return undefined;
    let cancelled = false;
    const cleanupTasks = [];

    (async () => {
      try {
        await loadPayPalSdk(config.sdkUrl);
        const sdk = await window.paypal.createInstance({
          clientId: config.clientId,
          components: ["paypal-payments", "paypal-guest-payments"],
          pageType: "checkout",
          locale: "en-US",
          clientMetadataId: crypto.randomUUID(),
        });
        const eligible = await sdk.findEligibleMethods({ currencyCode: "USD" });
        if (!eligible.isEligible("paypal")) throw new Error("PayPal is not eligible for this buyer.");

        const session = sdk.createPayPalOneTimePaymentSession({
          async onApprove(data) {
            setStatus("capturing");
            setMessage("Saving and verifying the payment…");
            try {
              const result = await commerceRequest(`/orders/${encodeURIComponent(data.orderId)}/capture`, { method: "POST", body: "{}" });
              if (result.status !== "COMPLETED") throw new Error(`PayPal returned ${result.status}.`);
              window.sessionStorage.setItem(`k4-order-confirmation:${result.orderNumber}`, JSON.stringify({
                items: Array.isArray(result.confirmationItems) ? result.confirmationItems : [],
              }));
              saveCart(emptyCart());
              setCompleted(result);
              setStatus("complete");
              setMessage("");
              const confirmationUrl = new URL("/order-confirmation", window.location.origin);
              confirmationUrl.searchParams.set("order", result.orderNumber);
              confirmationUrl.searchParams.set("mode", result.mode || "sandbox");
              window.location.assign(confirmationUrl.toString());
            } catch (error) {
              setStatus("error");
              setMessage(error.message);
            }
          },
          onCancel() {
            setStatus("ready");
            setMessage("Checkout was canceled. Your cart is unchanged.");
          },
          onError(error) {
            setStatus("error");
            setMessage(error?.message || "PayPal reported an error.");
          },
        });

        const button = document.createElement("paypal-button");
        button.setAttribute("type", "pay");
        button.setAttribute("size", "responsive");
        const click = async () => {
          setStatus("creating");
          setMessage("Saving the order before opening PayPal…");
          try {
            await session.start(
              { presentationMode: "auto" },
              commerceRequest("/orders", { method: "POST", body: JSON.stringify(payload) })
                .then((result) => {
                  setStatus("ready");
                  setMessage("");
                  return { orderId: result.orderId };
                }),
            );
          } catch (error) {
            setStatus("error");
            setMessage(error.message);
          }
        };
        button.addEventListener("click", click);
        if (!cancelled) {
          buttonHostRef.current.replaceChildren(button);
          setStatus("ready");
          setMessage("");
        }
        cleanupTasks.push(() => button.removeEventListener("click", click));

        const canUseGuestCard = eligible.isEligible("card");
        setGuestCardEligible(canUseGuestCard);
        if (canUseGuestCard) {
          const guestSession = sdk.createPayPalGuestOneTimePaymentSession({
            async onApprove(data) {
              setStatus("capturing");
              setMessage("Saving and verifying the card payment…");
              try {
                const result = await commerceRequest(`/orders/${encodeURIComponent(data.orderId)}/capture`, { method: "POST", body: "{}" });
                if (result.status !== "COMPLETED") throw new Error(`PayPal returned ${result.status}.`);
                window.sessionStorage.setItem(`k4-order-confirmation:${result.orderNumber}`, JSON.stringify({
                  items: Array.isArray(result.confirmationItems) ? result.confirmationItems : [],
                }));
                saveCart(emptyCart());
                setCompleted(result);
                setStatus("complete");
                setMessage("");
                const confirmationUrl = new URL("/order-confirmation", window.location.origin);
                confirmationUrl.searchParams.set("order", result.orderNumber);
                confirmationUrl.searchParams.set("mode", result.mode || "sandbox");
                window.location.assign(confirmationUrl.toString());
              } catch (error) {
                setStatus("error");
                setMessage(error.message);
                throw error;
              }
            },
            onComplete() {},
            onCancel() {
              setStatus("ready");
              setMessage("Card checkout was canceled. Your cart is unchanged.");
            },
            onError(error) {
              setStatus("error");
              setMessage(error?.message || "PayPal reported a card-payment error.");
            },
            onWarn(data) {
              setStatus("error");
              setMessage(data?.message || "Please check the card information and try again.");
            },
          });
          const guestContainer = document.createElement("paypal-basic-card-container");
          const guestButton = document.createElement("paypal-basic-card-button");
          guestContainer.appendChild(guestButton);
          const guestClick = async () => {
            setStatus("creating");
            setMessage("Saving the order before opening card checkout…");
            try {
              await guestSession.start(
                { presentationMode: "auto", targetElement: guestButton },
                commerceRequest("/orders", { method: "POST", body: JSON.stringify(payload) })
                  .then((result) => {
                    setStatus("ready");
                    setMessage("");
                    return { orderId: result.orderId };
                  }),
              );
            } catch (error) {
              setStatus("error");
              setMessage(error?.message || "Card checkout could not be opened.");
            }
          };
          guestButton.addEventListener("click", guestClick);
          if (!cancelled) guestCardHostRef.current.replaceChildren(guestContainer);
          cleanupTasks.push(() => guestButton.removeEventListener("click", guestClick));
        } else if (!cancelled) {
          guestCardHostRef.current.replaceChildren();
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(error.message);
        }
      }
    })();

    return () => { cancelled = true; cleanupTasks.forEach((cleanup) => cleanup()); };
  }, [config, quote, payload]);

  if (completed) {
    return (
      <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
        <p className="font-semibold">Payment completed</p>
        <p className="mt-1">Order {completed.orderNumber} was saved.{isSandbox ? " No live money was collected." : ""}</p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button type="button" onClick={() => setExpanded(true)} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#8a3d2b] px-4 text-sm font-semibold text-white shadow hover:bg-[#743120]">
        <LockKeyhole className="h-4 w-4" /> Continue to Secure Checkout
      </button>
    );
  }

  return (
    <section className="mt-4 border-t border-stone-300 pt-4" aria-label="PayPal checkout">
      {isSandbox && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
        <span className="font-bold">SANDBOX TEST ONLY.</span> The rates below are development fixtures. Live payments are disabled.
      </div>}
      <form onSubmit={calculate} className="mt-4 space-y-3">
        <h3 className="text-sm font-semibold text-stone-800">U.S. delivery address</h3>
        <input required name="name" value={form.name} onChange={setField} placeholder="Full name" autoComplete="name" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        <input required type="email" name="email" value={form.email} onChange={setField} placeholder="Email" autoComplete="email" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        <div>
          <input required type="tel" name="phone" value={form.phone} onChange={setField} placeholder="Phone number" autoComplete="tel" inputMode="tel" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
          <p className="mt-1 px-1 text-[10px] leading-relaxed text-stone-500">Required for carrier delivery and questions about your order.</p>
        </div>
        <input required name="addressLine1" value={form.addressLine1} onChange={setField} placeholder="Street address" autoComplete="address-line1" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        <input name="addressLine2" value={form.addressLine2} onChange={setField} placeholder="Apartment, suite, etc. (optional)" autoComplete="address-line2" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        <input required name="city" value={form.city} onChange={setField} placeholder="City" autoComplete="address-level2" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <select required name="stateCode" value={form.stateCode} onChange={setField} autoComplete="address-level1" className="min-w-0 rounded-md border border-stone-300 px-2 py-2 text-sm">
            {STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
          <input required name="postalCode" value={form.postalCode} onChange={setField} placeholder="ZIP" autoComplete="postal-code" inputMode="numeric" className="min-w-0 rounded-md border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={status === "loading" || status === "creating" || status === "capturing"} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#63776a] px-4 text-sm font-semibold text-white disabled:opacity-50">
          {status === "loading" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BadgeDollarSign className="h-4 w-4" />}
          Calculate Shipping & Tax
        </button>
      </form>

      {quote && (
        <div className="mt-4 space-y-1 rounded-md border border-stone-200 bg-white p-3 text-sm">
          <div className="flex justify-between"><span>Merchandise</span><span>{formatCurrency(quote.merchandiseCents / 100)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(quote.shippingCents / 100)}</span></div>
          <div className="flex justify-between"><span>Tax ({quote.tax.ratePercent.toFixed(2)}%)</span><span>{formatCurrency(quote.taxCents / 100)}</span></div>
          <div className="flex justify-between border-t border-stone-200 pt-2 font-bold"><span>Total</span><span>{formatCurrency(quote.totalCents / 100)}</span></div>
          {isSandbox && <p className="pt-1 text-[10px] leading-relaxed text-amber-800">{quote.tax.configLabel} · {quote.tax.ruleLabel}</p>}
        </div>
      )}

      {quote && <div ref={buttonHostRef} className="mt-4 min-h-12" />}
      {quote && guestCardEligible && (
        <div className="my-3 flex items-center gap-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-400">
          <span className="h-px flex-1 bg-stone-200" />
          <span>Or pay without a PayPal account</span>
          <span className="h-px flex-1 bg-stone-200" />
        </div>
      )}
      {quote && <div ref={guestCardHostRef} className={guestCardEligible ? "min-h-12" : "hidden"} />}
      {quote && (
        <p className="mt-3 text-center text-[10px] leading-relaxed text-stone-500">
          By completing payment, you acknowledge that K4 Studios prints are made to order and sales are final. Review the{" "}
          <a href="/Returns-and-Refunds" target="_blank" rel="noreferrer" className="font-semibold text-[#6f351f] underline underline-offset-2">return and refund policy</a>
          {" "}or <a href="/Contact" target="_blank" rel="noreferrer" className="font-semibold text-[#6f351f] underline underline-offset-2">contact K4 Studios</a> with questions.
        </p>
      )}
      {(status === "creating" || status === "capturing") && <p className="mt-2 flex items-center gap-2 text-xs text-stone-600"><LoaderCircle className="h-4 w-4 animate-spin" />{message}</p>}
      {status === "error" && <p className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-2 text-xs text-red-800"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
      {message && status === "ready" && <p className="mt-2 text-xs text-stone-600">{message}</p>}
    </section>
  );
}

