Cloudflare cache purge on Netlify
================================

What this does
--------------

This repository includes a small local Netlify Build plugin that triggers a Cloudflare cache purge after a deploy successfully publishes. The plugin runs on the `onSuccess` event so the purge happens after the new deploy is live.

Files added
-----------

- `plugins/netlify-plugin-cloudflare-purge/` — the local Netlify plugin (registered in `netlify.toml`).
- `scripts/purge-cloudflare.cjs` — a tiny standalone script you can run manually for ad-hoc purges.

Configuration
-------------

1. Add the following environment variables in your Netlify site settings (Build & deploy -> Environment):

   - `CF_ZONE_ID` — your Cloudflare zone ID (the plugin will also accept a `zone_id` input in `netlify.toml`).
   - `CF_API_TOKEN` — a Cloudflare API token with the least privileges necessary (grant `Zone:Cache Purge` for the specific zone).

2. Optional environment variables:

   - `CF_PURGE_FILES` — comma-separated list of absolute URLs to purge (plugin falls back to purging the entire zone).
   - `CF_PURGE_EVERYTHING` — `true`/`false` (defaults to `true`).
   - `CF_PURGE_FAIL_ON_ERROR` — if set to `true` the script will return a non-zero exit code on failure.

Notes
-----

- The plugin is implemented as a *local plugin* and is registered in `netlify.toml`. It does not store secrets in the repository; tokens are read from Netlify environment variables.
- By default the plugin performs a full zone purge. If you prefer to purge only specific files, set `CF_PURGE_FILES` to a comma-separated list of URLs you want to invalidate.
- Be mindful of Cloudflare API limits — choose a purge strategy that fits your deploy frequency.

Want changes?
--------------

If you want the plugin to only purge files that actually changed in the build output (instead of purging everything), I can extend it to gather changed files via the Netlify `utils.git` helper and map them to deployed URLs. That requires a mapping step from built files to public URLs (often straightforward for static files, trickier for hashed assets).
