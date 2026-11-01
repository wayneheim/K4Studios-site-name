# K4 Studios V3 Analytics: Traffic Quality & Buyer Intent Audit

**Audit date:** October 28, 2026  
**Complete-day windows:** October 21–27 (7 days), September 28–October 27 (30 days), and August 8–October 27 (81 days)  
**Data freshness:** V3 cursor current through October 28, 2026 at 5:44 p.m. ET  
**Scope:** Read-only analysis. No site, SEO, tracking, or production-data changes were made.

## 1. Executive summary

### Decision

K4 Studios is **not primarily attracting only readers**. In the last 30 complete days, 568 of 923 human sessions (61.5%) entered through an art-discovery/category page or an individual artwork page, while 155 (16.8%) entered through editorial/informational content.

However, the **commercial SEO doorway program is not yet functioning as a meaningful acquisition channel**. Only 23 of 923 sessions (2.5%) entered through a buyer-oriented page, and only 2 of those 23 sessions (8.7%) produced a recorded artwork/gallery progression. None produced a recorded pricing or purchase event.

The answer to Quill's final question is therefore:

> Commercial SEO is disproportionately attracting informational visitors relative to commercial-doorway visitors, but the site as a whole is attracting many potentially valuable art browsers and direct artwork visitors. K4 has both a commercial-page discovery/engagement problem and a conversion-path guidance/measurement problem. The data does not support the stronger claim that current traffic is mostly low-value readers.

### Main findings

1. **Commercial doorway discovery is the clearest failure.** Editorial entries outnumbered commercial entries 155 to 23 in 30 days (6.7:1). Commercial entries fell from 28 in the prior 30 days to 23 (-17.9%). **Confidence: high.**
2. **Commercial doorway engagement is also weak.** Only 2 of 23 commercial-entry sessions reached art/gallery content in 30 days; 19 of 23 (82.6%) had no measured downstream art signal. **Confidence: medium-high** because recent page counts are reliable, but not every form of interest produces an event.
3. **Art discovery and direct artwork are meaningful acquisition paths.** They contributed 332 and 236 entry sessions respectively in 30 days. Art-discovery entries produced 6 purchase-control sessions and 4 recorded external-purchase transitions. **Confidence: high for session presence; medium for commercial interpretation.**
4. **Editorial traffic is low-converting but not worthless.** Editorial entries produced 12 art/gallery progressions in 30 days and, over 81 days, two pricing/purchase-control sessions. Editorial content generated more total art progressions than the commercial group because it had much more traffic. **Confidence: medium-high.**
5. **Recorded lower-funnel volume is too small and instrumentation is too incomplete for a sales-conversion verdict.** In 30 days, 8 sessions opened pricing/edition information, 12 fired any purchase-related control, 5 reached a tracked external purchase destination, and none fired an inquiry/checkout event. The event sequence is not a strict funnel and purchase controls are not consistently preceded by a pricing event. **Confidence: high that the events exist; low that they describe all buyer intent or completed purchases.**
6. **Returning visitors are materially more likely to show commercial intent.** Over 81 days, 17 of 141 returning visitors (12.1%) fired a purchase-related control versus 20 of 2,219 single-session visitors (0.9%). Returning does not prove buyer status, but it is a strong enrichment signal. **Confidence: medium** because identity is browser-based and can reset.

## 2. Data scope and population

V3 contains 82 populated calendar days beginning August 8. October 28 was incomplete at audit time, so the longest reliable complete-day window is 81 days. Raw events reach back to May, but using a nominal 90-day funnel would cross V3 field/event changes and create inconsistent comparisons.

### Human V3 totals

| Window | Visitors | Sessions | Pageviews | Image views | Engaged sessions | Pricing opens | SmugMug clicks |
|---|---:|---:|---:|---:|---:|---:|---:|
| 7 days | 213 | 230 | 654 | 327 | 95 | 0 | 1 |
| Prior 7 days | 198 | 217 | 479 | 141 | 95 | 2 | 0 |
| 30 days | 789 | 922 | 2,430 | 1,083 | 419 | 16 events | 8 events |
| Prior 30 days | 857 | 1,010 | 2,819 | 1,504 | 422 | 27 events | 5 events |
| 81 days | 2,360 | 2,736 | 6,842 | 3,295 | 1,188 | 59 events | 13 events |

Thirty-day sessions declined 8.7%, pageviews 13.8%, image views 28.0%, and pricing-open events 40.7% versus the previous 30 days. The last seven days recovered in sessions (+6.0%) and pageviews (+36.5%), but recorded qualified pricing activity was zero. Samples are too small to call a durable trend.

### Traffic-class separation

The following is an event-population audit, not a comparison of equivalent visitor units. Many proxy/bot rows do not carry meaningful session identities.

| 30-day traffic class | Events | Sessions where present | Pageview events | Art/image events |
|---|---:|---:|---:|---:|
| Human-like JavaScript traffic | 9,974 | 976 | 2,430 | 1,083 |
| Suspected automation | 12,338 | 4,716 | 259 | 10,150 |
| Verified/named bots | 4,570 | 47 | 0 | 53 |
| Unclassified/server-side | 1,896 | 336 | 155 | 102 |
| Monitoring/services | 8 | 0 | 0 | 0 |

V3 correctly keeps the large suspected-automation and named-bot populations out of its human summary. The official V3 total is 922 sessions; the broader 976-session JavaScript candidate population includes sessions without a V3 core event and should not replace the official denominator.

## 3. Visitor-intent distribution

Classification was based on current page implementation and content, not URL wording alone. Print, wall-art, interior-design, collection-commerce, and K4 Select pages were treated as commercial. `/Blog` and authority/educational articles were editorial. Gallery/category, expedition-gallery, archive, and artist/art-discovery pages were discovery. `/i-...` entries were artwork/purchase evaluation. Home, uncategorized shows/video pages, missing landings, and mixed-purpose pages remain ambiguous.

### Last 30 complete days

| Entry intent | Sessions | Share | Art/gallery sessions | Image sessions | Pricing sessions | Purchase-control sessions |
|---|---:|---:|---:|---:|---:|---:|
| Art discovery/category | 332 | 36.0% | 122 (36.7%) | 107 (32.2%) | 2 (0.6%) | 6 (1.8%) |
| Artwork/purchase evaluation | 236 | 25.6% | 235 (99.6%)* | 235 (99.6%)* | 5 (2.1%) | 5 (2.1%) |
| Ambiguous/other | 177 | 19.2% | 37 (20.9%) | 22 (12.4%) | 1 (0.6%) | 1 (0.6%) |
| Editorial/informational | 155 | 16.8% | 12 (7.7%) | 8 (5.2%) | 0 | 0 |
| Commercial/buyer intent | 23 | 2.5% | 2 (8.7%) | 2 (8.7%) | 0 | 0 |
| **Total** | **923 session-days / 922 distinct sessions** | **100%** | **408 (44.2%)** | **374 (40.5%)** | **8 (0.9%)** | **12 (1.3%)** |

\*An artwork landing itself satisfies the artwork/image stage; it is not proof of further navigation.

### Interpretation

- Informational traffic is much larger than commercial-doorway traffic, but it is not the majority of all traffic.
- Discovery/category pages are currently the strongest scalable bridge into artwork.
- Direct artwork entries are numerous, but only 5 of 236 reached a pricing/purchase-control signal in the same session.
- The commercial group has too little traffic to judge conversion potential confidently, but the 2-of-23 artwork progression rate is weak enough to identify an engagement concern in addition to discovery failure.

## 4. Buyer progression and drop-offs

Using one consistent 923-session denominator for the last 30 complete days:

1. Entry session: 923 (100%)
2. Any recorded art/gallery signal: 408 (44.2%)
3. Individual image signal: 374 (40.5%)
4. Pricing/edition signal: 8 (0.9% of entries; 2.1% of image sessions)
5. Any purchase-related control: 12 (1.3%)
6. Tracked external purchase destination: 5 (0.5%)
7. Recorded inquiry/checkout initiation: 0

This is a **presence funnel**, not a guaranteed ordered sequence. Purchase-control sessions can exceed pricing sessions because some destinations fire directly and because destination tracking differs by component.

### Largest drop-offs

- Commercial landing to art/gallery: 21 of 23 did not progress (91.3% drop).
- Editorial landing to art/gallery: 143 of 155 did not progress (92.3% drop).
- Discovery landing to art/gallery: 210 of 332 did not progress (63.3% drop).
- Image presence to pricing signal: 366 of 374 had no pricing/edition event (97.9% drop), but this figure is partly a guidance and instrumentation measure, not proof of absent interest.

## 5. Commercial doorway scorecard

The scorecard uses 81 complete days for enough sample, with current/prior 30-day traffic shown as the trend. “Art progression” means a recorded gallery action or image view in the session. Source labels are V3 labels; `Direct / internal` is not true direct traffic and must not be interpreted as such.

| Doorway | 81d entries | 30d vs prior 30d | Source observed | Art progression | Pricing/purchase | Diagnosis |
|---|---:|---:|---|---:|---:|---|
| `/Western-Wall-Art` | 13 | 8 vs 4 | Google; Direct/internal | 1 (7.7%) | 0 | Traffic rising from a tiny base; engagement failure signal |
| `/western-art-prints` | 6 | 1 vs 3 | Direct/internal | 1 (16.7%) | 0 | Discovery weakness; insufficient conversion sample |
| `/cowboy-art-prints` | 5 | 2 vs 2 | Google; Direct/internal | 2 (40.0%) | 0 | Best observed progression, but sample far too small |
| `/cowboy-wall-art` | 5 | 2 vs 1 | Google; Direct/internal | 0 | 0 | Discovery and engagement concern; tiny sample |
| `/cowboy-artwork-prints` | 5 | 0 vs 4 | Direct/internal; external | 0 | 0 | Discovery loss; no conversion conclusion |
| `/Western-Photography-Prints` | 5 | 1 vs 2 | Google; external; Direct/internal | 0 | 0 | Discovery and engagement concern; tiny sample |
| `/Western-Interior-Design-Art` | 3 | 1 vs 2 | Google; Direct/internal | 0 | 0 | Discovery failure; insufficient sample |
| `/WWII-Themed-Fine-Art-Prints` | 3 | 2 vs 0 | Direct/internal | 0 | 0 | Too little qualified discovery |
| `/Western-Wall-Art-for-Interior-Designers` | 1 | 0 vs 0 | Direct/internal | 0 | 0 | Discovery failure |
| `/Rustic-Western-Interior-Design-Art` | 1 | 0 vs 1 | Google | 0 | 0 | Discovery failure |
| `/Modern-Western-Interior-Design-Art` | 1 | 0 vs 1 | Google | 0 | 0 | Discovery failure |
| `/cowboy-fine-art-prints` | 1 | 1 vs 0 | Google | 0 | 0 | Too little data |
| `/vintage-western-art` | 0 | 0 vs 0 | None | 0 | 0 | Pure discovery failure in this window |

Among the 23 commercial entries in the current 30-day window, 19 (82.6%) had no measured downstream art signal. For `/Western-Wall-Art`, 6 of 8 current-30-day entries had no downstream signal.

The commercial doorways should not be labeled conversion failures: they generally lack enough qualified traffic and almost none of their sessions reach the pricing stage. The evidence supports discovery failure first, engagement failure second, and no defensible page-level conversion verdict.

## 6. Editorial content contributors

### Stronger contributors

| Editorial entry page | Entries | Art/gallery progression | Image progression | Pricing/purchase sessions |
|---|---:|---:|---:|---:|
| `/Blog/what-is-western-fine-art` | 33 | 5 (15.2%) | 4 (12.1%) | 2 (6.1%) |
| `/Blog/what-is-painterly-photography` | 73 | 12 (16.4%) | 7 (9.6%) | 0 |
| `/Blog/what-makes-an-image-feel-cinematic` | 13 | 3 (23.1%) | 2 (15.4%) | 0 |
| `/Blog/what-is-artistic-western-photography` | 16 | 1 (6.3%) | 1 (6.3%) | 0 |

`what-is-western-fine-art` is the clearest editorial commercial contributor: it supplied the editorial group's only two recorded pricing/purchase-control sessions in the 81-day window.

### High-traffic, weak-progression content

| Editorial entry page | Entries | Art/gallery progression | Image progression |
|---|---:|---:|---:|
| `/Blog/what-is-western-art` | 117 | 5 (4.3%) | 2 (1.7%) |
| `/Blog/what-is-western-cowboy-art` | 19 | 0 | 0 |
| `/Photography-in-Western-Art` | 12 | 0 | 0 |
| `/Blog/what-is-narrative-photography` | 10 | 0 | 0 |

Across 81 days, editorial pages generated 365 entries, 29 art/gallery progressions (7.9%), 19 image sessions (5.2%), and two pricing/purchase sessions. Commercial pages generated only 71 entries, 5 art/gallery progressions (7.0%), 4 image sessions (5.6%), and no pricing/purchase sessions. Informational visitors have a low action rate, but their absolute contribution is larger than the commercial doorway contribution.

## 7. Sources and returning visitors

### Source quality, 81 days

| V3 source label | Sessions | Art/gallery rate | Image rate | Pricing sessions | Purchase-control sessions |
|---|---:|---:|---:|---:|---:|
| Direct/internal | 1,365 | 35.7% | 34.9% | 15 | 15 |
| Google | 773 | 40.1% | 34.8% | 14 | 14 |
| Facebook/Instagram | 234 | 43.6% | 36.3% | 3 | 10 |
| Unknown | 182 | 97.3% | 94.0% | 1 | 2 |
| Other external | 134 | 47.0% | 39.6% | 4 | 4 |
| Bing | 31 | 38.7% | 25.8% | 0 | 0 |
| Pinterest | 18 | 61.1% | 50.0% | 0 | 0 |

The `Unknown` row is dominated by image-fallback entries, so its high art rate is structural. `Direct/internal` combines missing referrers with internal/carryover referrers and must not be called direct navigation. Preserved raw entry referrers showed **no identifiable ChatGPT, Perplexity, Copilot, Gemini, or Claude referral sessions** in the 81-day window.

Google is not low-quality traffic: 310 of 773 Google sessions reached art/gallery content, and 14 produced a pricing/purchase-control signal. The weak commercial-doorway results therefore appear to be a landing-page acquisition/fit problem rather than a blanket organic-search quality problem.

### Returning visitors

| Window | Visitor type | Visitors | Image visitors | Pricing visitors | Purchase-control visitors |
|---|---|---:|---:|---:|---:|
| 30d | Returning (2+ sessions) | 46 | 27 (58.7%) | 2 (4.3%) | 5 (10.9%) |
| 30d | Single-session | 743 | 300 (40.4%) | 5 (0.7%) | 5 (0.7%) |
| 81d | Returning (2+ sessions) | 141 | 84 (59.6%) | 11 (7.8%) | 17 (12.1%) |
| 81d | Single-session | 2,219 | 865 (39.0%) | 20 (0.9%) | 20 (0.9%) |

Returning visitors are strongly enriched for commercial actions, but the data cannot prove causation or buyer status. Visitor identity is browser-scoped and can be lost across devices, privacy clearing, or storage resets.

## 8. Analytics reliability and limitations

### Working reliably enough for this audit

- V3 rollup cursor and dashboard data were current at audit time.
- Human V3 reporting requires JavaScript source, both visitor and session IDs, excludes internal traffic, known automation UAs, Tor, and selected datacenter ASNs.
- Landing pages are retained per session, with chapter fallback when a page view is missing.
- Chapter/image viewing has multiple observable layers: `chapter_view`, a one-second visible/loaded `qualified_chapter_view`, and proxy `chapter_exposure`.
- Current chapter navigation emits `chapter_view` when the active image changes and deduplicates the same image per session.
- Cross-origin event delivery uses keepalive `fetch`; the earlier silent `sendBeacon` failure mode has a fallback.
- In the last 30 days, storage contained 1,431 raw JavaScript chapter views, 827 qualified chapter views, and navigation events (`nav_next` in 50 sessions, `nav_prev` in 40). V3 retained 1,083 accepted human image views.

### Material limitations

1. **The historical single-page field is not reliable for the full 81 days.** `page_view_count` was added October 21. The current 30-day window is backfilled consistently, but the prior-30 session field contains only 553 pageviews versus 2,819 in the stable daily metrics. Bounce/single-page comparisons before September 28 were therefore not reported.
2. **Entry-source labels are too coarse.** V3 combines empty and same-site referrers as `Direct / internal`; it cannot support a clean direct-navigation claim. Missing referrer is not synonymous with direct.
3. **Commerce event definitions changed mid-period.** `order_smugmug_clicked` first appears September 14. The legacy `order_submitted` event last appears September 11. These cannot be trended as one stable checkout metric.
4. **There is no complete checkout funnel.** `order_clicked` means pricing opened. The primary series modal tracks an email-link click, while SmugMug destination tracking is visibly implemented for expedition ordering. No event proves a completed purchase, checkout start, email delivery, or sale.
5. **Zero email events are inconclusive.** The email click handler exists, but zero stored events could mean no clicks, delivery failure in that path, or a path not used by visitors. It must not be reported as zero buyer interest.
6. **Event totals are concentrated.** Navigation totals can be driven by a few sessions: in the last seven days, 202 next events and 87 previous events came from only nine sessions. Session-level rates are safer than raw action counts.
7. **V3 does not retain ordered session paths.** This audit calculated session-level event presence. It cannot prove that every stage occurred in strict order without expensive bounded raw reconstruction.
8. **Later-visit attribution is limited.** Returning behavior is measurable by browser visitor ID, but a purchase action on a later visit cannot always be tied causally to a specific earlier landing page.

## 9. Findings versus hypotheses

### Findings supported by the data

- Commercial doorway traffic is extremely small and declining modestly.
- Most commercial doorway visitors do not produce a measured art/gallery signal.
- Art discovery and direct image entry are major first-contact routes.
- Google traffic reaches artwork at a meaningful rate.
- Some editorial pages contribute real art exploration; one generated recorded pricing actions.
- Returning visitors are much more likely to fire commercial controls.

### Plausible hypotheses requiring a test

- Commercial doorways may not rank for buyer-qualified queries, or their snippets may attract the wrong expectation.
- Doorway visitors may not see a sufficiently immediate, obvious route from promise to artwork.
- Pricing may be visually or conceptually too distant from browsing behavior.
- Buyers may use later visits, email, phone, or untracked SmugMug paths that V3 cannot connect.
- The large direct-artwork population may reflect image search, shared links, or external discovery that V3's coarse source labels obscure.

## 10. Five prioritized recommendations

1. **Repair measurement before judging sales conversion.** Add a stable, destination-neutral sequence for pricing opened, edition/size selected, contact initiated, external checkout opened, checkout initiated where observable, and confirmed sale where a privacy-safe integration permits it. Preserve one event taxonomy across components. This has the highest decision value because current lower-funnel comparisons are not stable.
2. **Treat commercial doorways as an acquisition-and-engagement experiment, not a conversion program yet.** For the primary pages, track qualified organic impressions/clicks separately, then measure doorway-to-gallery and doorway-to-image progression. `/Western-Wall-Art` is the first candidate because it has the most traffic but only 1 progression in 13 entries.
3. **Make artwork the immediate next step on commercial and high-volume editorial pages.** Test a prominent first-screen curated collection/“view this artwork” path on `/Western-Wall-Art`, `/Blog/what-is-western-art`, and `/Blog/what-is-western-cowboy-art`. Use session-level art progression as the primary outcome, not sales, until volume increases.
4. **Scale the editorial patterns that already produce qualified movement.** Preserve and strengthen contextual art/collection links on `what-is-western-fine-art`, `what-is-painterly-photography`, and `what-makes-an-image-feel-cinematic`. These pages currently contribute more qualified exploration than the commercial cluster.
5. **Design for return visits and measure assisted progression.** Give visitors a durable way to save, revisit, or inquire about artwork, then report first-contact intent group and later commercial action separately. Returning visitors' 12.1% purchase-control rate versus 0.9% for single-session visitors makes this a higher-evidence opportunity than adding more unvalidated doorway pages.

## Bottom line

K4's traffic problem is not simply “too many readers.” The larger problem is that buyer-oriented SEO pages scarcely acquire visitors, and most of the few visitors they do acquire do not reach artwork. At the same time, discovery pages, individual images, Google traffic, selected editorial articles, and returning visitors demonstrate a real pool of potentially valuable collector interest. K4 should improve the bridge from discovery to artwork/pricing and make the commerce instrumentation coherent before concluding that the audience itself is unqualified.
