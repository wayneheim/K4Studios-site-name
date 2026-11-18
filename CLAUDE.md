# K4 Studios — k4studios.com

Fine art Western photography site for Wayne Heim. Astro + React. About 3,000 image/chapter pages and ~40 doorway/landing pages. SmugMug is still the print fulfillment backend.

## How to work with me
- Work in small, staged steps. Make one change, show me the diff, and wait for my OK before the next one.
- Make surgical edits only. Don't refactor, rename, or "clean up" code I didn't ask about.
- If a request is ambiguous, ask one question before you start exploring.
- Only read the files I name, unless you tell me why you need more.

## Commands
<!-- Fill these in from package.json -->
- Dev server: `npm run dev`
- Build: `npm run build`
- Tests: `npm test`

## Project layout
<!-- Adjust these paths to match the repo -->
- `src/pages/` — Astro pages (doorways, /collections hub, image pages)
- `src/components/` — React/Astro components
- `src/components/GalleryEditorPro.jsx` — internal metadata editor. Exports gallery `.mjs` files via `buildMjs()`
- `src/data/` — gallery `.mjs` data files (one per gallery)

## Hard rules
- Never make structural changes to any page with "painterly" in its slug.
- Keep the placeholder image entry `i-k4studios` in data files. Hide it from the UI and never edit its content.
- When editing gallery `.mjs` files, touch only the fields I name. Process one gallery file at a time.
- Never invent image subjects or locations in descriptions.

## SEO invariants (every page must keep these)
- Complete, crawlable SSR HTML. No content that only exists after client-side rendering.
- Exactly one SSR-rendered H1 per page.
- Semantic `<main>` / `<article>` elements.
- SSR-rendered breadcrumbs and prev/next links.
- Don't change canonicals, schema, or internal-link structure unless I ask.
