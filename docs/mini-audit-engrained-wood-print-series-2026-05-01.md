# Engrained / Wood Print Series Mini-Audit - 2026-05-01

## Scope

This workstream covers Engrained, wood print fine art, western art on wood, western wood prints, and the collector/product architecture around the Engrained Series.

## Keyword Cluster

The current tracked Semrush CSV does not show dedicated Engrained or wood-print keyword rankings. Engrained appears heavily in the repo and in internal product/collector paths, but it is not yet visible as a tracked ranking cluster in this data pull.

Likely terms from current repo targeting:

| Keyword / Concept | Current CSV Rank | Notes |
|---|---:|---|
| engrained | not tracked/ranking in CSV | Branded/product term. |
| engrained wood prints | not tracked/ranking in CSV | Strong K4-specific term. |
| wood print fine art | not tracked/ranking in CSV | Commercial/product intent. |
| western art on wood | not tracked/ranking in CSV | Commercial/category intent. |
| western wood prints | not tracked/ranking in CSV | Commercial/category intent. |
| painterly wood prints | not tracked/ranking in CSV | Hybrid art/material term. |

## Current Repo Pages

- `/Engrained`
- `/Other/K4-Select-Series/Engrained`
- `/Other/K4-Select-Series/Engrained/Engrained-Series`
- `/Other/K4-Select-Series/Engrained/Engrained-Series/[id]`
- `public/data/engrainedData.json`
- `src/data/hybrid-hubs/engrained.ts`
- `src/data/Other/K4-Select-Series/Engrained/story.ts`

## Intended Parent Page

Likely parent: `/Engrained`

The repo already has a hybrid hub at `src/data/hybrid-hubs/engrained.ts` and route at `src/pages/Engrained/index.astro`. That route reads like the cleanest public-facing conceptual/commercial parent for the Engrained system.

Likely proof/product gallery: `/Other/K4-Select-Series/Engrained/Engrained-Series`

This is the inventory and image-level purchase path.

## Supporting Child / Gallery Pages

- `/Other/K4-Select-Series/Engrained`
- `/Other/K4-Select-Series/Engrained/Engrained-Series`
- individual Engrained image pages
- `/Other/Print-Options`
- `/Western-Wall-Art`
- `/cowboy-art-prints`
- `/Western-Photography-Art`
- `/Narrative-Western-Art`

## Pages To Protect

- Protect `/Engrained` as the concept/product parent.
- Protect `/Other/K4-Select-Series/Engrained/Engrained-Series` as the full inventory path.
- Protect individual Engrained image pages; this is a collector/product experience, not just an SEO path.

## Internal Links To Consider

- From `/Western-Wall-Art` to `/Engrained` as a material/presentation route.
- From `/cowboy-art-prints` to `/Engrained` where print materials are discussed.
- From `/Other/Print-Options` to `/Engrained` and the full Engrained gallery.
- From `/Engrained` to the full Engrained Series gallery and relevant Western/narrative/art concept pages.
- From individual Engrained image pages back to `/Engrained` only if it does not distract from the buy/collector path.

## Commercial Doorway Fit

Very strong, but highest brand/product risk.

Engrained is already commercial by nature: it is a material, product system, collector path, and signature K4 presentation. The `/Western-Wall-Art` format is highly relevant here because it uses print/collector language, room context, FAQ, and image proof.

The better move may be to strengthen `/Engrained` as the commercial parent rather than build a generic "wood prints" page immediately. The page should defend the branded concept first, then carefully absorb buyer-intent terms:

- wood print fine art
- western art on wood
- western wood prints
- fine art wood prints
- photography printed on wood
- Baltic birch wall art

Guardrail: do not turn Engrained into generic Etsy-style wood decor copy. The page needs to keep the idea that the material participates in the story.

## Files Likely Touched

- `src/data/hybrid-hubs/engrained.ts`
- `src/data/Other/K4-Select-Series/Engrained/story.ts`
- `src/data/doorway/cowboy-art-prints.ts`
- relevant Western wall art / print option data files after confirming exact current structure
- individual Engrained data only if image-level paths lack route clarity

## Cannibalization Notes

Do not treat Engrained like a normal keyword doorway. It is both:

- a product/edition system, and
- a branded collector experience.

The risk is not classic cannibalization; the risk is flattening a distinctive product into generic "wood print decor" language.

## Risk Level

Medium to high editorial risk.

Technically it is isolated. Brand-wise it needs more care than trains or reenactment because Engrained has product positioning, material story, edition logic, and collector psychology.

## Safe-To-Implement Recommendation

Hold until after the cleaner clusters.

Recommended action now: no implementation. First, add Engrained/wood-print terms to tracking or run a broader keyword pull. Then decide whether `/Engrained` should be the canonical public parent versus `/Other/K4-Select-Series/Engrained`.

Commercial recommendation: high-value future candidate. Validate tracked terms first, then strengthen `/Engrained` as the commercial parent.
