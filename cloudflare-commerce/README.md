# K4 Commerce - PayPal checkout

This service owns server-side cart verification, shipping/tax calculation,
PayPal Orders API create/capture, a dedicated D1 order database, verified PayPal
webhooks, and the durable email outbox. The deployed development service remains
Sandbox-only. Live mode is present only as a guarded, separate deployment path.

## Safety boundary

- The Sandbox and Live services use separate Workers, PayPal apps/webhooks, D1
  databases, credentials, and Wrangler configuration files.
- Live mode requires both `CHECKOUT_ENABLED=true` and
  `LIVE_CONFIGURATION_APPROVED=true`.
- Live mode also requires explicit `mode=live` JSON tax and shipping rules.
- Live PayPal credentials alone cannot activate checkout.

## Local setup

1. Copy `.dev.vars.example` to `.dev.vars` and add a PayPal Sandbox app's client
   ID and secret. Do not use live credentials.
2. Generate a long random `ORDER_EMAIL_SHARED_SECRET` and use the same value in
   the site's local Netlify environment.
   Also generate a separate `COMMERCE_ADMIN_TOKEN` for the protected reporting page.
3. Apply the local database migration:
   `npx wrangler d1 migrations apply k4-commerce-sandbox --local --config cloudflare-commerce/wrangler.toml`
4. Start the commerce service:
   `npx wrangler dev --config cloudflare-commerce/wrangler.toml`
5. Start the K4 site with Netlify Dev on port 8888.

The cart automatically uses `http://127.0.0.1:8791` on localhost. Production has
no implicit API endpoint; `PUBLIC_K4_COMMERCE_API_BASE` must be set explicitly.

The local nexus dashboard is at `/admin/commerce`. Its bearer token is retained
only in browser session storage. The dashboard shows aggregate state totals, not
customer-level order data.

## Live rollout (do not skip steps)

1. Rotate any exposed Cloudflare API token before creating Live resources.
2. Create a dedicated PayPal **Live** app and a dedicated D1 database named
   `k4-commerce-live`.
3. Copy `wrangler.live.example.toml` to an untracked Live configuration and add
   the Live D1 UUID. Keep both activation switches false.
4. Apply all migrations to the Live D1 database.
5. Add Live Worker secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
   `PAYPAL_WEBHOOK_ID`, `ORDER_EMAIL_SHARED_SECRET`, and
   `COMMERCE_ADMIN_TOKEN`.
6. Add reviewed `LIVE_SHIPPING_RULES_JSON` and `LIVE_TAX_RULES_JSON` values.
7. Create the PayPal Live webhook and subscribe to the events below.
8. Deploy and verify `/health`, `/config`, webhook verification, email delivery,
   and the admin report while checkout is still disabled.
9. Set `LIVE_CONFIGURATION_APPROVED=true`; recheck that `/config` still reports
   `configured: false` while `CHECKOUT_ENABLED=false`.
10. Only after final approval, set `CHECKOUT_ENABLED=true` and point the public
    site's `PUBLIC_K4_COMMERCE_API_BASE` at the Live Worker.

## EditorPro sign-in for Commerce Admin

Open `https://editorpro-dev.k4studios.com/admin/commerce` while the EditorPro
tunnel and Netlify Dev are running. The existing EditorPro login covers the
page and its commerce requests. Commerce Admin opens the live report automatically
and has no second password field. The public site's admin page links to this
tunnel address and does not load private commerce records itself.

The local gateway verifies its HttpOnly session cookie on every request, checks
the request origin, and proxies only known commerce-admin routes to the fixed
live service. Its independent server credential never reaches browser code,
cookies, or the local editor upstream. The public commerce API still requires
valid backend authorization; checkout remains available when the tunnel is off.

Provision from this checkout using `npm.cmd run setup:editorpro-commerce`, then
deploy commerce. The helper reuses the saved Wrangler OAuth login with the
inherited API token cleared in its child process. It stores the new credential
in the commerce Worker secret `EDITORPRO_COMMERCE_TOKEN` and locally as Windows
DPAPI-protected data in the ignored `.netlify/editorpro-commerce.json`. It does
not change EditorPro's password, any existing credential, or `.env` files.
Existing local credentials are reused, not rotated, on subsequent setup runs.

Restart the EditorPro tunnel after updating the gateway. Netlify Dev can stay
running. The gateway's in-memory login session is renewed through the usual
EditorPro login. Validation: `npm.cmd run test:editorpro` and
`npm.cmd run test:admin-session:browser`.

## Coupons and shipping offers

Commerce Admin (`https://editorpro-dev.k4studios.com/admin/commerce`) has **Coupons &
shipping offers** immediately below shipping rates. Create a code-based coupon
or leave the code blank for an automatic offer. Supported benefits are free
shipping, percentage discounts on prints (up to 99%), and fixed dollar discounts.
New drafts are disabled until explicitly enabled; the migration creates no offers.

Each offer can restrict catalog, print series, or individual catalog products;
catalog choices include all catalogs, limited editions (Chronicle and Legend),
Engrained only, Expeditions only, and all except Engrained. Limited editions
exclude Sketch, Foundation, Engrained, and Expedition products. Additional series
or product selections narrow the selected catalog; they never broaden it.
Existing main-collection offers remain editable with their original scope.
Offers can also
set a minimum qualifying merchandise subtotal; specify start and expiration
dates; and limit total paid orders and/or uses per customer email. Dates include
the entire selected day in America/New_York. The 10-day preset includes its start
date. For example, select free shipping, minimum $50, and an expiration date;
or enter a coupon code, a 10-day window, and total uses 1. These are examples,
not automatically activated promotions.

Only qualifying merchandise counts toward the minimum, before tax/shipping or
discounts. In a mixed cart, free shipping is calculated by retaining normal
shipping for all excluded items. One offer applies: the best automatic offer,
or the entered coupon instead. Offers do not stack. Discounts appear in the cart,
PayPal amount breakdown, stored quote, receipts, and order tracker. Merchant-funded
print discounts reduce the merchandise amount passed to the existing tax rules.

Quotes and abandoned order creation consume no uses. Just before capture, a
transactional SQLite trigger reserves a use against both limits. Completed
payments redeem it; confirmed denied/reversed approvals release reservations.
Uncertain or pending captures hold their use until the payment outcome is known,
and Admin shows the number in payment. Repeated captures/webhooks are idempotent.
Refunds and cancellation of already paid orders do not restore redeemed coupons.
Limits cannot be reduced below current redeemed/reserved usage. Per-customer
limits identify the normalized checkout email, not a verified customer account.

Apply `0010_promotions.sql` before deploying commerce. Then publish the Netlify
admin/cart/receipt updates and the analytics tracker update. Existing orders
without promotion data keep their original totals. Validation:
`npm.cmd run test:commerce`, `npm.cmd run test:order-tracker`, and
`npm.cmd run test:promotions:browser`; payment/browser fixtures use mocked services.

## Order processing tracker

K4 Stats V3 has an **Open Orders** button. It opens the separately loaded,
authenticated tracker at `/__k4stats/orders` on the Stats host. Stats fetches
only the pending count, on page load, once per minute while visible, and when
returning to the tab. The button is gray at zero, red when orders await
processing, and shows `(?)` if the count cannot be checked.

The tracker lists paid orders awaiting processing and paginated history. Expand
an order to see customer/shipping details, exact image IDs, print options, and
validated SmugMug `/buy` links. **Mark processed** means the order has been
reviewed and production placed; it does not place an order with SmugMug.
It changes fulfillment to `processing`, records `processed_at` and an audit
event, and queues a `customer_processed` production thank-you in one transaction.
Retries do not add another production email. Unpaid, held, refunded, disputed,
and canceled orders cannot enter this workflow. Tracking/shipment updates remain
available in Commerce Admin. The existing receipt email still goes out after
payment, and the shipping email remains separate.

For optional shipping updates, processed orders in the tracker have carrier and
tracking-number fields below the processing controls. **Email tracking number**
saves the shipment and queues the existing customer shipped email together.
The fields remain available in expanded processed history. Leaving them blank
sends nothing. After the email is queued or sent, the form shows its status and
disables another send. No new database migration or Netlify template update is
needed for these controls; deploy commerce, then analytics.

The tracker proxies through the `K4_COMMERCE` service binding using a matching
`STATS_ORDERS_TOKEN` secret on analytics and commerce. This credential authorizes
only tracker routes, not general commerce administration. It stays server-side.
Local setups without this secret can forward the existing Stats Basic login
instead, using commerce's existing admin verification. The tracker embeds no
customer data or credentials in Stats HTML or analytics tables.

Local checks: `npm.cmd run test:commerce` and `npm.cmd run test:order-tracker`.
For local interactive testing, apply commerce migrations with
`node_modules\.bin\wrangler.cmd d1 migrations apply k4-commerce-sandbox --local --config cloudflare-commerce/wrangler.toml`.
Run sandbox commerce with its usual configuration, and Stats with
`node_modules\.bin\wrangler.cmd dev --config cloudflare-worker/wrangler.analytics.local.toml`.
The tracker is then at `http://localhost:8788/__k4stats/orders`.
Use matching local `ANALYTICS_PASSWORD` (Stats) and `COMMERCE_ADMIN_PASSWORD`
(commerce) through the existing local environment mechanism. The local Stats
configuration connects only to the sandbox commerce service.

Production rollout order, when authorized:

1. Deploy the Netlify `order-email` update supporting `customer_processed`.
2. Apply commerce migration `0009_order_processing.sql` and deploy commerce.
3. Configure the same random `STATS_ORDERS_TOKEN` secret on both workers.
4. Deploy analytics with `wrangler.analytics.toml`, which binds `K4_COMMERCE`
   to `k4-commerce-live`. Follow the repository's OAuth deployment instructions.

The migration recognizes orders already in production or shipped without
queuing retrospective customer emails. Local checks never process a live order
or send customer mail.

## PayPal webhook

Create a Sandbox webhook pointing to `/webhooks/paypal`. Subscribe to:

- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.PENDING`
- `PAYMENT.CAPTURE.DENIED`
- `CHECKOUT.PAYMENT-APPROVAL.REVERSED`
- `PAYMENT.CAPTURE.REFUNDED`
- `PAYMENT.CAPTURE.REVERSED`
- `CUSTOMER.DISPUTE.CREATED`
- `CUSTOMER.DISPUTE.UPDATED`
- `CUSTOMER.DISPUTE.RESOLVED`

Save its Sandbox webhook ID as `PAYPAL_WEBHOOK_ID`. Refund, reversal, and open
dispute events place unshipped orders on hold and queue a merchant alert. They
do not automatically return a numbered edition to inventory.

## Tax configuration

The tax calculator accepts injected jurisdiction rules and is independent of
PayPal. Rates use integer basis points (`725` = `7.25%`). The checked-in Ohio rate
is only a conspicuous test fixture. It is not approved for live collection.

