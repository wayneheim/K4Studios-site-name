# Cluster 6 - Cowboy Art/Prints Naming Direct Check

Prepared: June 25, 2026

## Routes Checked

- `/cowboy-artwork-prints`
- `/cowboy-fine-art-prints`
- `/cowboy-themed-artwork`
- `/western-cowboy-art`
- `/western-cowboy-pictures`

Reference route: `/cowboy-pictures`

## Source Status

All five candidate pages exist as generated `CommercialIntentDoorway` routes and are included in the generated sitemap. They are not missing pages and they are not one-off hand-written stubs.

All five route files were added in commit `12f850b6` on May 4, 2026 (`duplicate name fixes - new pages test`). That means the May 4 SEMrush pull showing zero tracked keyword ranking is not enough evidence by itself to prove long-term failure; the pages were new or effectively new at the time of that data pull.

## Rendered Technical Status

Live production checks on June 25, 2026 returned `200 OK` for all five pages.

Rendered metadata:

| Route | Robots | Canonical |
| --- | --- | --- |
| `/cowboy-artwork-prints` | `index, follow` | `https://www.k4studios.com/cowboy-artwork-prints` |
| `/cowboy-fine-art-prints` | `index, follow` | `https://www.k4studios.com/cowboy-fine-art-prints` |
| `/cowboy-themed-artwork` | `index, follow` | `https://www.k4studios.com/cowboy-themed-artwork` |
| `/western-cowboy-art` | `index, follow` | `https://www.k4studios.com/western-cowboy-art` |
| `/western-cowboy-pictures` | `index, follow` | `https://www.k4studios.com/western-cowboy-pictures` |

Rendered titles and H1s are route-specific:

| Route | Rendered title | H1 |
| --- | --- | --- |
| `/cowboy-artwork-prints` | `Cowboy Artwork Prints - Western Portrait & Scene Prints` | `Cowboy Artwork Prints - Fine Art Prints by Wayne Heim` |
| `/cowboy-fine-art-prints` | `Cowboy Fine Art Prints - Western Portrait & Scene Prints` | `Cowboy Fine Art Prints - Fine Art Prints by Wayne Heim` |
| `/cowboy-themed-artwork` | `Cowboy Themed Artwork - Western Fine Art Prints` | `Cowboy Themed Artwork - Fine Art Prints by Wayne Heim` |
| `/western-cowboy-art` | `Western Cowboy Art - Fine Art Prints by Wayne Heim` | `Western Cowboy Art by Wayne Heim` |
| `/western-cowboy-pictures` | `Western Cowboy Pictures - Fine Art Prints by Wayne Heim` | `Western Cowboy Pictures by Wayne Heim` |

## Content Status

The rendered pages are not thin in simple word-count terms. Local rendered output after the June 25 build measured roughly:

| Route | Rendered HTML size | Approx rendered word count |
| --- | ---: | ---: |
| `/cowboy-artwork-prints` | 526,331 bytes | 8,649 |
| `/cowboy-fine-art-prints` | 526,466 bytes | 8,665 |
| `/cowboy-themed-artwork` | 526,349 bytes | 8,637 |
| `/western-cowboy-art` | 523,137 bytes | 8,713 |
| `/western-cowboy-pictures` | 524,928 bytes | 8,825 |

The large word counts include shared catalog/grid content, but each page also has route-specific metadata, gateway copy, concept blocks, section descriptions, and closing archive/context copy.

## Internal Link Signal

Rendered internal anchor counts are light for most variants:

| Route | Pages linking in | Total rendered anchors |
| --- | ---: | ---: |
| `/cowboy-artwork-prints` | 4 | 5 |
| `/cowboy-fine-art-prints` | 3 | 4 |
| `/cowboy-themed-artwork` | 3 | 4 |
| `/western-cowboy-art` | 11 | 15 |
| `/western-cowboy-pictures` | 4 | 5 |
| `/cowboy-pictures` | 6 | 7 |

This points away from a noindex/canonical/blocking problem and toward a signal problem: the cluster has several overlapping naming variants, but most have only a small amount of internal reinforcement.

## Recommendation

Do not redirect or consolidate this cluster yet.

The pages are live, crawlable, self-canonical, and not empty. The May 4 ranking data was taken the same day the routes were added, so it is not a reliable maturity signal.

The next useful move is a measured internal-linking correction after choosing one or two intended winners:

- Treat `/western-cowboy-art` as the likely broad art-category winner. It already has the strongest inbound support in this subset.
- Treat `/cowboy-fine-art-prints` as the likely print/collector-intent winner if the target is explicitly prints.
- Leave `/cowboy-pictures` alone unless later data shows it is interfering; it already serves the browse-intent role.
- Hold `/cowboy-artwork-prints`, `/cowboy-themed-artwork`, and `/western-cowboy-pictures` as secondary variants until fresh post-seasoning data is available.

Avoid broad rewrites for now. If fresh SEMrush/GSC data still shows zero impressions after a reasonable crawl window, the cleaner action would be to reinforce the chosen winners and demote the weaker variants through internal links first, before considering redirects.
