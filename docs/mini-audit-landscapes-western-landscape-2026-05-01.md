# Landscapes / Western Landscape Photography Mini-Audit - 2026-05-01

## Scope

This workstream covers fine art landscape photography, western landscape art, western landscape photography, mountain photography, waterfall photography, and painterly landscape terms.

## Keyword Cluster

| Keyword | Rank | Type | Landing Page | Volume | KD | Notes |
|---|---:|---|---|---:|---:|---|
| mountain photography | - | - | - | 880 | 40 | Broad, difficult. |
| fine art landscape photography | - | - | - | 390 | 24 | Broad; not currently ranking. |
| waterfall photos | - | - | - | 390 | 40 | Broad/photo intent. |
| western landscape paintings | - | - | - | 390 | 11 | Art-adjacent but not photography-specific. |
| western landscape art | - | - | - | 320 | 4 | Strong low-KD opportunity; likely doorway parent exists. |
| waterfall photography | - | - | - | 260 | 18 | Could fit landscape theme child. |
| western landscape artists | - | - | - | 170 | 11 | Informational; maybe blog/guide if pursued later. |
| western landscape drawings | - | - | - | 70 | 6 | Probably wrong medium; monitor. |
| western landscape photography | 38 | organic | `/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery` | 50 | 0 | Existing child traction. |
| fine art mountain photography | - | - | - | 20 | 22 | Could support mountain child. |
| painterly landscape photography | 6 | organic | `/Galleries/Painterly-Fine-Art-Photography` | 20 | 13 | Broad parent ranking. |
| fine art waterfall photography | - | - | - | 10 | 14 | Could support water child. |
| rustic mountain photos | - | - | - | 10 | 0 | Likely decor/photo intent. |
| western mountain photography | 4 | organic | `/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery` | 10 | 16 | Traditional West child winner. |
| painterly fine art landscape photography | 1 | AI overview | `/Blog/what-is-painterly-photography` | n/a | 7 | Definition page AI winner; protect. |
| painterly mountain photography | 1 | AI overview | `/Galleries/Painterly-Fine-Art-Photography/Landscapes` | n/a | 16 | Painterly landscape parent AI winner. |

## Current Ranking Pages

- `/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery`
- `/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery`
- `/Galleries/Painterly-Fine-Art-Photography`
- `/Galleries/Painterly-Fine-Art-Photography/Landscapes`
- `/Blog/what-is-painterly-photography`

## Intended Parent Page

Likely commercial/semantic parent: `/western-landscape-art`

The repo already contains a hybrid hub at `src/data/hybrid-hubs/western-landscape-art.ts` and route at `src/pages/western-landscape-art/index.astro`. This is the obvious candidate for western landscape art, western landscape paintings/drawings adjacency, mountain photography, waterfall photography, and western fine art landscape intent.

However, current ranking pages are gallery proof pages, not the hybrid parent. Do not try to pull authority away from them abruptly.

## Supporting Child / Gallery Pages

- `/Galleries/Painterly-Fine-Art-Photography/Landscapes`
- `/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery`
- `/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery`
- `/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Mountains`
- `/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Water`
- `/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Theme/Sunsets`
- `/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Mountains`
- `/Galleries/Fine-Art-Photography/Landscapes/By-Theme/Water`

## Pages To Protect

- Protect `/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery`; it ranks for western landscape photography.
- Protect `/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery`; it ranks #4 for western mountain photography.
- Protect `/Blog/what-is-painterly-photography`; it is an AI winner for painterly fine art landscape photography and should not be rewritten around landscape terms.
- Protect `/Galleries/Painterly-Fine-Art-Photography/Landscapes`; it is an AI winner for painterly mountain photography.

## Internal Links To Consider

- From `/western-landscape-art` to the West gallery, Mountains, Water, and Sunsets child pages.
- From the West gallery pages back to `/western-landscape-art` with natural "western landscape art" or "western landscape photography" language.
- From `/Galleries/Painterly-Fine-Art-Photography/Landscapes` to `/western-landscape-art` only where it helps visitors looking specifically for Western landscape art.
- From `/Blog/what-is-painterly-photography` to painterly landscapes only as a collector path, not as a landscape SEO rewrite.

## Commercial Doorway Fit

Strong, but only if scoped around Western landscape buyer intent.

This is the clearest non-cowboy candidate for reusing the `/Western-Wall-Art` format. The commercial page should not chase broad "landscape photography" first. It should lean into buyer-intent terms where K4 can stay distinctive:

- western landscape wall art
- western landscape art prints
- fine art western landscape prints
- mountain wall art
- waterfall fine art prints
- rustic mountain wall art

The existing `/western-landscape-art` hybrid hub may be the right page to strengthen commercially rather than creating a new route. It already has a semantic parent role and actual image rows. A commercial pass could add more collector/room/print-format language and stronger links into West, Mountains, Water, and Sunsets proof galleries.

Guardrail: do not flatten the painterly landscape gallery into decor copy. The commercial path should help buyers enter the work while preserving the atmospheric/art-first voice.

## Files Likely Touched

- `src/data/hybrid-hubs/western-landscape-art.ts`
- `src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/story.ts`
- `src/data/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/story.ts`
- `src/data/Galleries/Fine-Art-Photography/Landscapes/By-Location/story.ts`
- relevant West/Mountains/Water entrance data files if parent links are missing

## Cannibalization Notes

There is potential ambiguity between:

- `/western-landscape-art` as a semantic parent.
- `/Galleries/Painterly-Fine-Art-Photography/Landscapes/By-Location/West/Gallery` as a proof child.
- `/Galleries/Fine-Art-Photography/Landscapes/By-Location/West/Gallery` as traditional proof child.

This should be treated as a ladder, not a conflict. The hybrid page explains and collects. The gallery pages prove.

## Risk Level

Medium.

The broad terms are more tempting than they are proven. The route exists, but current rankings are on child/gallery pages and painterly definition pages. This needs careful link clarification, not aggressive copy expansion.

## Safe-To-Implement Recommendation

Implement after Trains/Reenactment unless Wayne wants the Western landscape art page prioritized.

Recommended action: light parent/child links only. No new pages yet. Do not push generic "landscape photography" too hard because KD and intent are broad.

Commercial recommendation: good candidate after a clean keyword pull. Prefer strengthening `/western-landscape-art` before creating `/Western-Landscape-Wall-Art`.
