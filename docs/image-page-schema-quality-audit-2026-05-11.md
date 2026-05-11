# Image Page Schema Quality Audit - 2026-05-11

Audit target: representative rendered image detail pages in `dist/**/*.html`.

Audit command:

```bash
node scripts/audit-image-schema-quality.mjs
```

## Summary

All sampled image detail pages are receiving rich explicit image schema from `getStructuredData.ts` through the gallery shell templates, not only the `BaseLayout.astro` fallback. A full rendered-image-page scan also found no fallback-only image pages.

Classification results:

| Classification | Count |
| --- | ---: |
| A) rich explicit schema | 11 |
| B) fallback-only schema | 0 |
| C) duplicated/conflicting schema | 0 |

The `BaseLayout` fallback is adding page-level coverage around the explicit image schema. It is not replacing the richer image schema on the sampled image pages.

Full image-page scan:

| Classification | Count |
| --- | ---: |
| A) rich explicit schema | 3,740 |
| B) fallback-only schema | 0 |
| C) duplicated/conflicting schema | 0 |

## Template Path

Most image pages using `GalleryShellCore.astro` build `imageStructuredData` with:

```ts
getStructuredData({
  type: "image",
  data: {
    ...currentImage,
    pageUrl: canonicalUrl,
    galleryUrl: galleryAbsUrl,
    galleryTitle,
    collectionContext,
    schemaAbout,
    genre,
  },
})
```

That output is passed to `BaseLayout` as `structuredDataJSON`. Because `structuredDataJSON` is present, the new `BaseLayout` image fallback does not emit a fallback `ImageObject`/`VisualArtwork` for these pages.

Archive image pages using `GalleryShell-Archive.astro` now pass the same page-specific image context into `getStructuredData.ts`, including `pageUrl`, `galleryUrl`, `galleryTitle`, `schemaAbout`, and `genre`, so they also receive rich explicit image schema.

## Sample Results

| Group | Sample page | Classification | Artwork name | Canonical `/img/i-...` URL | `isPartOf` | Breadcrumb | Canonical aligned |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Western Cowboy Portraits Color | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Color/i-2jfdQGw` | A | Frontier Pause | Yes | Western Cowboy Portraits - Color / Western Cowboy Portraits | Yes | Yes |
| Western Cowboy Portraits Black & White | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/Black-White/i-28HMKqF` | A | Counting the Take | Yes | Western Cowboy Portraits - Black White / Western Cowboy Portraits | Yes | Yes |
| Wild West / Western Narratives Color | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Western-Narratives/Color/i-2Cj8j9W` | A | Morning Constitution | Yes | Western Narratives - Color / Western Narratives | Yes | Yes |
| Native Americans Color | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Wild-West/Native-Americans/NA-Color/i-4Hz6D7k` | A | Carried Forward | Yes | Native Americans - NA Color / Native Americans | Yes | Yes |
| Civil War Color | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War-Portraits/Color/i-2pHXbPq` | A | Sound the Assembly | Yes | Civil War Portraits - Color / Civil War | Yes | Yes |
| WWII Color - Portraits | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color/i-2nrKDf9` | A | Fine Art Wartime Portraits | Yes | Portraits - Color / World War II | Yes | Yes |
| WWII Color - War | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color/i-22hf958` | A | War Zone Photography Moment | Yes | War - Color / World War II | Yes | Yes |
| Engrained | `/Other/K4-Select-Series/Engrained/Engrained-Series/i-4QZ7HPR` | A | Cough and Covenant | Yes | Engrained - Engrained Series | Yes | Yes |
| Traditional Galleries - Landscapes | `/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water/i-2fQqHxW` | A | Falls before the Bridge Photography by Wayne Heim | Yes | By Theme - Water / Traditional Fine Art Photography | Yes | Yes |
| Traditional Galleries - Portraits | `/Galleries/Fine-Art-Photography/Portraits/Color/i-3pJD592` | A | Western Landscapes Fine Art Cowboy | Yes | Portraits - Color / Traditional Fine Art Photography | Yes | Yes |
| Traditional Galleries - Transportation | `/Galleries/Fine-Art-Photography/Transportation/Cars/i-336zMPt` | A | Route 66 Car Photography Prints Moment | Yes | Transportation - Cars / Traditional Fine Art Photography | Yes | Yes |

## Field Checks

Every sampled page includes:

- `@type: ImageObject`
- `@type: VisualArtwork`
- Artwork `name`
- Non-empty `description`
- `contentUrl` using canonical K4 `/img/i-.../...jpg` semantic image paths
- `creator` pointing to `https://www.k4studios.com/#person`
- `copyrightHolder` pointing to `https://www.k4studios.com/#person`
- `creditText: Wayne Heim`
- `license: https://www.k4studios.com/licensing`
- `isPartOf` pointing to the relevant gallery and, where available, the series context
- `BreadcrumbList`
- Canonical URL matching the sampled route
- `mainEntityOfPage` aligned with the canonical page URL
- `artform: Photograph`
- Section-aware `artMedium`
- Section-aware `genre`
- `additionalType: One-Image Movie` on narrative/cinematic single-image works

## Fallback / Conflict Checks

The rendered audit found:

- 0 fallback-only image pages
- 0 duplicated/conflicting image pages
- 0 sampled pages with stale SmugMug/raw image URLs in image schema
- 0 pages where the `BaseLayout` image fallback duplicated explicit rich image schema

Sampled pages include a page-level `WebPage` node and a nested `mainEntityOfPage` `WebPage` reference from the image schema. This is expected and is not a conflicting fallback image schema.
