/**
 * ARCHIVED on 2026-03-08.
 *
 * Why archived:
 * - This helper encoded an older redirect strategy that treated missing image pages differently.
 * - The live site now centralizes image-page redirect and missing-content policy in the Cloudflare worker and smart-404 flow.
 * - Keeping this file active risks accidental reintroduction of crawler-vs-human behavior that could complicate Bing cloaking reviews.
 *
 * Current state:
 * - No active usages were found in the workspace.
 * - Do not restore without re-auditing crawler parity.
 */

/*
 * Archived implementation reference:
 *
 * Smart Redirect Utility for [id].astro pages
 *
 * When an image ID is not found in the current gallery, this utility:
 * 1. First checks imageIdMap to see if the image exists elsewhere (e.g., Archive)
 * 2. If found elsewhere, returns a 301 redirect to the correct location
 * 3. If not found anywhere, redirects to the current gallery's landing page
 *
 * The executable code was intentionally removed from the archive copy so it
 * cannot participate in type-checking or be accidentally imported back into
 * the live app without an explicit restore + re-audit.
 */
