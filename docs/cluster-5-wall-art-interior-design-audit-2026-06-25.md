# Cluster 5 - Wall Art / Interior Design Audit

Prepared: June 25, 2026

## Routes Checked

- `/Western-Interior-Design-Art`
- `/Rustic-Western-Interior-Design-Art`
- `/Modern-Western-Interior-Design-Art`
- `/Western-Wall-Art`
- `/Western-Wall-Art-for-Interior-Designers`

## Finding

This cluster is a deliberate hub-and-spoke structure, not a consolidation problem.

Confirmed route roles:

- `/Western-Interior-Design-Art` is the interior-design hub.
- `/Rustic-Western-Interior-Design-Art` is the warmer, texture-heavy material direction.
- `/Modern-Western-Interior-Design-Art` is the cleaner, restrained, negative-space counterpart.
- `/Western-Wall-Art` is the broad wall/decor buying-intent page.
- `/Western-Wall-Art-for-Interior-Designers` is the project-sourcing and placement-strategy page for design professionals.

The pages are present in `public/sitemap.xml` and generated sitemap data. Local source confirms explicit cross-linking among the hub, Modern, Rustic, Designer, and Wall Art routes.

## Cross-Link Evidence

The Modern page explicitly points users back to the broader hub and sideways to Rustic and Designer paths:

- `/Western-Interior-Design-Art`
- `/Rustic-Western-Interior-Design-Art`
- `/Western-Wall-Art-for-Interior-Designers`

The Designer page points back to the broader hub and compares Modern/Rustic directions.

The Rustic page points across to Modern and Designer, then returns users to the interior-design hub.

`/Western-Wall-Art` links to `/Western-Wall-Art-for-Interior-Designers` and `/Western-Interior-Design-Art` from its supporting story/FAQ material.

## Recommendation

No code action needed.

The route set is intentionally differentiated, and the cross-links already communicate the hierarchy:

- interior-design hub
- rustic style path
- modern style path
- broad wall-art buying path
- designer/project-sourcing path

Do not redirect or consolidate this cluster based on zero-tracking pages alone. Treat `/Western-Interior-Design-Art` and `/Modern-Western-Interior-Design-Art` the same way as Cluster 6: hold and revisit with fresher data after seasoning.

## Running Tally

1. American Western Art / definitional - fixed, repointed to commercial intent, live.
2. Photography hub collision - fixed with one redirect; rest confirmed intentional.
3. Cowboy photography naming - fixed with internal-link reinforcement; rest confirmed clean.
4. Black and white cowboy - fixed with gallery reinforcement and wall-art repositioning, live.
5. Wall art / interior design - confirmed clean, no action needed.
6. Cowboy art/prints naming - parked pending seasoning, no code touched.
7. Vintage / old West - not yet reviewed.
