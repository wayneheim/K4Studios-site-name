# WWII / War-Themed Photography Mini-Audit - 2026-05-01

## Scope

This workstream covers WWII-themed photography, WWII reenactment photography, and WWII-inspired fine art terms. It overlaps with reenactment, but should remain its own batch because the ranking page is the WWII Facing History hub.

## Keyword Cluster

| Keyword | Rank | Type | Landing Page | Volume | KD | Notes |
|---|---:|---|---|---:|---:|---|
| wwii inspired photography | 1 | AI overview | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII` | 10 | 24 | AI winner; protect. |
| wwii reenactment photography | 3 | organic | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII` | 10 | 2 | Organic winner; protect. |
| wwii themed photography | 1 | AI overview | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII` | 10 | 32 | AI winner; protect. |
| wwii themed fine art photography | 1 | organic | `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII` | n/a | 14 | Organic winner; protect. |

## Current Ranking Pages

- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII` owns the tracked WWII terms.

## Intended Parent Page

Parent: `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII`

This page is already doing exactly what the model wants: it bridges WWII, historical reenactment, painterly fine art, and collector intent without needing a separate doorway route.

## Supporting Child / Gallery Pages

- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Color`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/Black-White`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Color`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/Black-White`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Color`
- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/Black-White`
- `/Blog/what-is-historically-themed-photography`
- `/Historical-Reenactment-Photography`

## Pages To Protect

- Protect `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII`; it is a top-3/top-1 performer in this cluster.
- Protect all WWII child galleries. They are proof pages for the parent and should stay indexable.

## Internal Links To Consider

- From `/Blog/what-is-historically-themed-photography` to `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII` with natural language around WWII themed fine art photography.
- From `/Historical-Reenactment-Photography` to `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII` as a specific era branch.
- From the WWII parent to War, Portraits, and Machines child pages if not already strong enough.
- From child WWII section pages back to the WWII parent and, where relevant, to the broader Facing History hub.

## Commercial Doorway Fit

Promising, but handle with more care than the train cluster.

Recent sketch-level WWII sales suggest real collector demand. A commercial page patterned after `/Western-Wall-Art` could eventually work if it is aimed at buyer-intent terms such as "WWII fine art prints," "WWII inspired wall art," "WWII themed art prints," or "military history art prints."

The guardrail is critical: do not aim a commercial page at plain "WWII photography." That query likely belongs to archival, documentary, public-domain, or historical record images. Any commercial page must make the same distinction already added to the WWII hub: K4's work is contemporary, WWII-themed / inspired fine art made with living historians, period detail, painterly light, and narrative intent.

Possible future commercial routes to validate:

- `/WWII-Fine-Art-Prints`
- `/WWII-Wall-Art`
- `/Military-History-Art-Prints`

Do not build these until the WWII keyword universe has been expanded beyond the current tracked CSV.

## Files Likely Touched

- `src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/story.ts`
- `src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/War/story.ts`
- `src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Portraits/story.ts`
- `src/data/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII/Machines/story.ts`
- `src/data/Other/Historical-Reenactment-Photography/story.ts`
- `src/pages/Blog/what-is-historically-themed-photography.astro`

## Cannibalization Notes

This cluster has healthy overlap with reenactment terms. Do not treat that as a problem automatically. The distinction should be:

- `/Galleries/Painterly-Fine-Art-Photography/Facing-History/WWII` = WWII collector/gallery parent.
- `/Historical-Reenactment-Photography` = definition/informational bridge for reenactment practice.
- `/Galleries/Fine-Art-Photography/Miscellaneous/Reenactments` = traditional proof/inventory route.

## Risk Level

Low to medium.

Low technically, because the ranking page is clear. Medium editorially, because WWII tone can be damaged by overly commercial anchor copy. Keep the language human, memorial, and historically grounded.

## Safe-To-Implement Recommendation

Safe as a protect-and-link batch.

Recommended action: add a few clarifying internal links only. Do not create a new WWII doorway page. Do not heavily rewrite the winning WWII parent.

Commercial recommendation: high-priority research candidate because sales signal exists. No new commercial page yet.
