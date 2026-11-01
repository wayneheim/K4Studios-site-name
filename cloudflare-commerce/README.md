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

