# Doorway Page Integrity Report - 2026-05-01

## Summary

- Full `npm run build` passed after restoring `/Civil-War-Art` and `/american-wild-west`.
- Both restored pages generated HTML in `dist` and are included in `public/sitemap.xml`.
- Current Semrush landing URLs in the audit all resolve in the built output: missing count is `0`.
- Local dev preview launch was attempted for `/Civil-War-Art` and `/american-wild-west`, but Windows denied starting the hidden process from the sandbox. Build output confirms deploy-resolution, but browser preview still needs a manual spot check.
- No ranking gallery pages were redirected, noindexed, canonicalized, or rewritten.

## Restored Pages

| URL | Source | Builds | Sitemap | Canonical | H1 | Role | Integrity Read |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Civil-War-Art` | `src/pages/Civil-War-Art.astro` | yes | yes | `https://www.k4studios.com/Civil-War-Art` | `Civil War Art | Narrative Fine Art Photography` | historical/commercial authority doorway | Restored from git-history branch. Should support Civil War art, Civil War photography, Civil War themed fine art, and Civil War art prints without replacing the Civil War gallery hub. |
| `/american-wild-west` | `src/pages/american-wild-west.astro` | yes | yes | `https://www.k4studios.com/american-wild-west` | `American Wild West | Frontier History, Photography & Narrative Art` | historical bridge | Restored as a bridge between `/Civil-War-Art`, `/wild-west-art`, and Facing History. Keep informational/historical, not a duplicate Wild West art doorway. |

## Special Page Roles

| URL | Builds | Sitemap | Ref Files (not HTTP 404s) | Recommended Role | Notes |
| --- | --- | --- | ---: | --- | --- |
| `/wild-west-art` | yes | yes | 10 | commercial/art doorway | Keep as Wild West art, frontier artwork, Old West imagery, prints/posters/collector path. Different from `/american-wild-west`. |
| `/vintage-western-art` | yes | yes | 8 | commercial doorway | Already ranking for vintage cowboy/vintage western terms. Strengthen this one page rather than splitting the cluster. |
| `/Western-Black-and-White-Photography` | yes | yes | 20 | semantic parent | Parent page for B&W Western/cowboy terms. Existing B&W gallery/all pages remain indexable proof pages. |
| `/Western-Wall-Art` | yes | yes | 24 | commercial doorway | Best buffer for broad commercial cowboy/western wall/decor terms. Keep commercial game here. |
| `/cowboy-art-prints` | yes | yes | 8 | commercial doorway | Good exact-match route for cowboy art prints. Should support, not replace, `/Western-Wall-Art`. |
| `/Cowboy-Fine-Art-Photography` | yes | yes | 21 | collector/medium page | Cowboy-specific collector and medium authority page. |
| `/Western-Fine-Art-Photography` | yes | yes | 54 | main authority / collector page | Main K4 collector voice. Preserve artistic positioning. |
| `/Western-Photography-Prints` | yes | yes | 13 | commercial print doorway | Useful print-intent page. Watch overlap with `/Western-Photography-Art`. |
| `/Western-Photography-Art` | yes | yes | 10 | medium/art doorway | Best target for “western art photography” and authored photography-as-art framing. |
| `/Narrative-Western-Art` | yes | yes | 33 | concept/authority page | Winning page for narrative western art. Leave alone except supportive links. |
| `/Historical-Reenactment-Photography` | yes | yes | 10 | historical/re-enactment hub | Existing winner for reenactor terms. Avoid heavy rewrite. |
| `/Blog/what-is-painterly-photography` | yes | yes | 32 | definition / AI page | Defend. Add collector-path links only; no heavy rewrite. |
| `/Blog/what-is-western-art` | yes | yes | 24 | definition / AI page | Broad informational Western art root. Keep distinct from commercial wall/artwork pages. |
| `/Galleries/Painterly-Fine-Art-Photography/Facing-History` | yes | yes | 404 files | gallery parent / collector voice | Major authority hub. Link out cleanly to restored Civil War and American Wild West paths. |

### Facing History Reference Count Note

The `404 files` value is not an HTTP 404 count. It is the number of files found by a broad text-reference scan for `/Galleries/Painterly-Fine-Art-Photography/Facing-History` across source, public, and docs files.

Facing History builds to `dist/Galleries/Painterly-Fine-Art-Photography/Facing-History/index.html` and appears in `public/sitemap.xml`. The high reference count is expected because the path is used across gallery shells, sitemap/generated artifacts, image manifests, Semrush audit tables, and historical/collector content. Treat this as reference density, not a broken-route signal.

## History Ghosts

Git history contains old route shapes that are not current pages. None are current Semrush landing URLs or audit intended targets.

Notable old paths:

- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Color`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Civil-War/Black-White`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits/NA-Color`
- `/Western-Fine-Art-Photography/Western-Fine-Art-Photography`
- `/o-Facing-History/Western-Cowboy-Portraits`

Recommendation: monitor 404/edge logs before restoring any of these. They look like old gallery route shapes, experiments, or backups rather than current doorway pages.

## Intent Separation

Keep this ladder:

1. `/american-wild-west` = informational/historical bridge.
2. `/wild-west-art` = visual/commercial Wild West art doorway.
3. `/Western-Fine-Art-Photography` = main collector authority page.
4. `/Cowboy-Fine-Art-Photography` = cowboy-specific collector/medium page.
5. Gallery and `/all` pages = proof/inventory pages that support parents.

Do not force all rankings onto parent pages. If Google ranks a gallery/all page, keep it indexable and use internal links to clarify hierarchy.

## Phase 1 Implementation List

1. Restore and verify missing route pages. Done for `/Civil-War-Art` and `/american-wild-west`; manual browser preview still recommended because sandbox could not start local dev server.
2. B&W Western/cowboy linking pass: parent `/Western-Black-and-White-Photography`, proof pages in B&W gallery/index/all.
3. Vintage Western strengthening: improve `/vintage-western-art` for vintage western art, vintage cowboy art, vintage prints, old western art, and old west posters.
4. Wild West / American Wild West role separation: keep `/american-wild-west` historical; strengthen `/wild-west-art` for art/prints/posters/frontier artwork.
5. Cowboy portrait hierarchy cleanup: parent `/Galleries/Painterly-Fine-Art-Photography/Facing-History/Western-Cowboy-Portraits`, children Color/B&W/all as proof pages.
6. Civil War link cleanup: link Civil War gallery hub/pages, Facing History, and historical definition pages into `/Civil-War-Art`; link `/Civil-War-Art` back to the galleries and `/american-wild-west`.
7. Painterly defense links only: keep `/Blog/what-is-painterly-photography` stable and add clearer paths to collector/category pages.
