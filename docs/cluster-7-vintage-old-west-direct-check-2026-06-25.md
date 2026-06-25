# Cluster 7 - Vintage / Old West Direct Check

Prepared: June 25, 2026

## Routes Checked

- `/old-western-art`
- `/old-west-pictures`
- `/vintage-western-art`
- `/vintage-cowboy-art`

## Source And Age

All four routes exist locally and are present in the generated sitemap.

Add dates:

| Route | First commit found | Date | Note |
| --- | --- | --- | --- |
| `/vintage-western-art` | `d52029cc` | 2025-07-13 | Older established page |
| `/old-western-art` | `4e723fab` | 2026-04-17 | Newer commercial doorway |
| `/old-west-pictures` | `12f850b6` | 2026-05-04 | Newer commercial doorway |
| `/vintage-cowboy-art` | `4163d267` | 2026-05-15 | Newest page in this set |

This supports the same seasoning-lag pattern seen in Clusters 5 and 6 for newer routes.

## Live Technical Status

Live production checks on June 25, 2026 returned `200 OK` for all four routes.

Rendered metadata:

| Route | Robots | Canonical |
| --- | --- | --- |
| `/old-western-art` | `index, follow` | `https://www.k4studios.com/old-western-art` |
| `/old-west-pictures` | `index, follow` | `https://www.k4studios.com/old-west-pictures` |
| `/vintage-western-art` | `index, follow` | `https://www.k4studios.com/vintage-western-art` |
| `/vintage-cowboy-art` | `index, follow` | `https://www.k4studios.com/vintage-cowboy-art` |

Rendered titles and H1s:

| Route | Rendered title | H1 |
| --- | --- | --- |
| `/old-western-art` | `Old Western Art - Frontier, Cowboy & Old West Fine Art Prints` | `Old Western Art - Fine Art Prints by Wayne Heim` |
| `/old-west-pictures` | `Old West Pictures - Cowboy, Frontier & Western Fine Art Prints` | `Old West Pictures - Fine Art Prints by Wayne Heim` |
| `/vintage-western-art` | `Vintage Western Art - Fine Art Prints by Wayne Heim \| K4 Studios` | `Vintage Western Art - Fine Art Prints by Wayne Heim` |
| `/vintage-cowboy-art` | `Vintage Cowboy Art - Old-West Cowboy Prints by Wayne Heim` | `Vintage Cowboy Art - Fine Art Prints by Wayne Heim` |

## Content Status

Rendered output is substantial for all four routes:

| Route | Approx rendered word count |
| --- | ---: |
| `/old-western-art` | 8,398 |
| `/old-west-pictures` | 8,323 |
| `/vintage-western-art` | 8,627 |
| `/vintage-cowboy-art` | 8,402 |

The counts include catalog/grid content, but the pages also carry route-specific titles, metadata, H1s, and framing.

## Internal Link Signal

Rendered inbound anchor counts:

| Route | Pages linking in | Total rendered anchors |
| --- | ---: | ---: |
| `/old-western-art` | 4 | 4 |
| `/old-west-pictures` | 2 | 4 |
| `/vintage-western-art` | 11 | 17 |
| `/vintage-cowboy-art` | 2 | 2 |

`/vintage-western-art` has the strongest internal support and is already the established route in this subset. `/old-west-pictures` and `/vintage-cowboy-art` are technically healthy but lightly reinforced. `/old-western-art` sits in the middle: technically healthy, newer than the established Vintage Western Art page, and only modestly linked.

## Recommendation

No redirect or consolidation action yet.

Confirmed:

- `/vintage-western-art` is established, indexable, substantial, and internally supported.
- `/old-west-pictures` is indexable, substantial, and likely affected by recency/seasoning rather than a technical defect.
- `/old-western-art` is indexable and substantial; search absence alone is not enough to declare it broken.
- `/vintage-cowboy-art` is indexable and substantial, but it is very new and has the weakest internal link support in the set.

Suggested next step, if fresh data still shows no impressions after seasoning: reinforce the intended hierarchy with internal links rather than redirecting first. The likely hierarchy is:

- `/vintage-western-art` as the established broader vintage/old-West art route.
- `/old-west-pictures` as the image-led old-West visual browsing route.
- `/old-western-art` as the definitional/commercial old-West art variant if data supports it.
- `/vintage-cowboy-art` as a narrower cowboy-specific vintage route, but only if it earns impressions or gets deliberate internal reinforcement.

## Seven-Cluster Audit Close-Out

1. American Western Art / definitional - fixed, live.
2. Photography hub collision - fixed with one redirect; rest intentional.
3. Cowboy photography naming - fixed with internal-link reinforcement; rest clean.
4. Black and white cowboy - fixed with gallery reinforcement and wall-art repositioning, live.
5. Wall art / interior design - confirmed clean, no action.
6. Cowboy art/prints naming - parked pending seasoning data, no code touched.
7. Vintage / Old West - technically healthy; no redirect/consolidation action recommended without fresher post-seasoning data.
