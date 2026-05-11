# Structured Data Audit - 2026-05-11

Audit target: rendered `dist/**/*.html` after `npm run build`.

## Summary

- HTML pages scanned: 4,100
- Indexable pages scanned: 4,018
- Indexable pages missing `application/ld+json`: 0
- Pages with invalid JSON-LD: 0
- Pages missing `BreadcrumbList` after fix: 0

## Missing Schema By Page Type

| Page type | Indexable pages | Missing JSON-LD | Missing BreadcrumbList | Missing expected type | Invalid JSON-LD |
| --- | ---: | ---: | ---: | ---: | ---: |
| image detail pages | 3,740 | 0 | 0 | 0 | 0 |
| gallery color/B&W pages | 30 | 0 | 0 | 0 | 0 |
| gallery parent pages | 109 | 0 | 0 | 0 | 0 |
| doorway/definition pages | 107 | 0 | 0 | 0 | 0 |
| blog pages | 26 | 0 | 0 | 0 | 0 |
| commercial pages | 2 | 0 | 0 | 0 | 0 |
| home/major hubs | 4 | 0 | 0 | 0 | 0 |

## Reported URLs

All three reported URLs now render `application/ld+json`, `CollectionPage`, `ImageGallery`, and `BreadcrumbList` in static HTML:

- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color`

## Template Findings

- `BaseLayout.astro` was already the common head layer for rendered public pages, but its prior universal fallback was only the K4 Person/Organization graph.
- `GalleryShellCore.astro` supplied explicit breadcrumbs only for image detail state, so gallery landing/index pages commonly had `CollectionPage`/`ImageGallery` without `BreadcrumbList`.
- Parent gallery pages often passed `structuredDataJSON` to `BaseLayout` but not `breadcrumbsJSON`.
- Some blog, story, commercial, and utility pages used `BaseLayout` with no page-specific schema props. These were not empty because of the global graph, but they did not have a centralized page-level fallback before this fix.

## Fix

- Added centralized automatic JSON-LD generation in `BaseLayout.astro`.
- Every rendered route now gets a page-level `WebPage` or gallery-appropriate `CollectionPage` fallback.
- Gallery routes get a fallback `ImageGallery` main entity when the layout has to infer schema.
- Image routes without explicit image schema get a fallback `ImageObject`/`VisualArtwork`.
- Non-home routes get path-derived `BreadcrumbList` automatically unless a page supplies `breadcrumbsJSON`.

## Reproduce

```bash
npm run build
node scripts/audit-structured-data.mjs
```
