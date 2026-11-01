# K4 Studios V3: Image Engagement Depth and Pricing Opportunity

**Audit date:** October 28, 2026  
**Window:** September 28-October 27, 2026 (30 complete days)  
**Population:** 374 human sessions with an individual-image signal  
**Scope:** Read-only segmentation of existing V3 data. No site, tracking, SEO, or production-data changes were made.

## Decision summary

The original **8 pricing sessions out of 374 image sessions (2.1%)** is not the right measure of whether visitors ignored a plainly visible Pricing button.

Only **304 of the 374 image sessions** used the standard gallery chapter surface where that Pricing control is present. The other 70 sessions used an expedition-order surface, K4 Select/specialty surface, or an unknown/other image surface. Their acquisition controls and tracking are different.

Within the 304 standard-surface sessions:

| Opportunity threshold | Sessions | Share of standard sessions | Pricing sessions | Pricing rate |
|---|---:|---:|---:|---:|
| Confirmed opportunity | 243 | 79.9% | 8 | 3.3% |
| Active exploration or deeper | 89 | 29.3% | 6 | 6.7% |
| Deep exploration | 24 | 7.9% | 3 | 12.5% |
| Very deep exploration | 8 | 2.6% | 2 | 25.0% |

The evidence supports a more specific conclusion: **Pricing engagement is strongly associated with depth of engagement.** It behaves more like a threshold action taken after sustained exploration than a control visitors merely fail to notice.

This does not eliminate a connection or guidance problem. Eighty-three of 89 active explorers did not open Pricing. But it argues against treating all 374 image sessions as equivalent opportunities, and it does not justify turning the presentation into a storefront.

## Surface correction

| Image experience | Sessions | Pricing sessions | SmugMug sessions | Interpretation |
|---|---:|---:|---:|---|
| Standard gallery chapter / Pricing UI | 304 | 8 | 1 | Correct population for the visible Pricing-button question |
| Expedition order UI | 46 | 0 | 4 | Different purchase path; not a Pricing-button exposure |
| Other or unknown image surface | 19 | 0 | 0 | Exposure cannot be established |
| K4 Select / specialty pricing UI | 5 | 0 | 0 | Different commercial presentation |
| **All image sessions** | **374** | **8** | **5** | Mixed interfaces; unsuitable as one exposure denominator |

This correction is material: **70 of 374 sessions (18.7%) should not be counted as standard Pricing-button opportunities.**

## Engagement-depth segmentation

The tiers are mutually exclusive and use signals available in V3:

- **Very deep:** 15 or more unique images/chapters, or 15 or more navigation actions.
- **Deep:** 5-14 unique images/chapters, or 5-14 navigation actions.
- **Active exploration/detail:** at least two unique images, any navigation, a detail/narrative open, zoom, or slideshow activity.
- **Confirmed single-image opportunity:** at least one qualified chapter view or at least two seconds of recorded active time, without a stronger signal above.
- **Unconfirmed/brief:** none of the preceding signals.

### Standard Pricing surface only

| Tier | Sessions | Pricing sessions | Rate | Avg. unique images | Avg. navigation actions | Detail-open sessions | >=10s active | >=60s active |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Unconfirmed/brief | 61 | 0 | 0.0% | 1.0 | 0.0 | 0 | 0 | 0 |
| Confirmed single-image opportunity | 154 | 2 | 1.3% | 1.0 | 0.0 | 0 | 38 | 7 |
| Active exploration/detail | 65 | 3 | 4.6% | 1.9 | 0.6 | 11 | 58 | 24 |
| Deep | 16 | 1 | 6.3% | 6.3 | 6.9 | 4 | 16 | 7 |
| Very deep | 8 | 2 | 25.0% | 45.9 | 57.3 | 1 | 7 | 6 |
| **Total** | **304** | **8** | **2.6%** |  |  |  |  |  |

The tier relationship is directional and strong: no Pricing activity appears in the unconfirmed group, while two of the eight very-deep sessions opened Pricing. The samples become small at the deepest tiers, so the exact percentages should not be treated as stable forecasts.

## Individual engagement signals

### Qualified visible artwork views

A `qualified_chapter_view` fires when the image is loaded and has remained visible for one second. It is the cleanest confirmation that an artwork had a meaningful on-screen opportunity.

Across all 374 image sessions:

| Qualified views | Sessions | Pricing sessions | Rate |
|---|---:|---:|---:|
| 0 | 123 | 0 | 0.0% |
| 1 | 188 | 3 | 1.6% |
| 2-4 | 46 | 2 | 4.3% |
| 5-14 | 8 | 1 | 12.5% |
| 15+ | 9 | 2 | 22.2% |

### Active time

Across all 374 image sessions:

| Recorded active time | Sessions | Pricing sessions | Rate |
|---|---:|---:|---:|
| Missing or zero | 131 | 0 | 0.0% |
| Under 2 seconds | 3 | 0 | 0.0% |
| 2-9 seconds | 57 | 0 | 0.0% |
| 10-59 seconds | 112 | 1 | 0.9% |
| 60+ seconds | 71 | 7 | 9.9% |

Seven of the eight Pricing sessions recorded at least 60 seconds of active time. This is the strongest single timing association, but active time is accumulated visible/active page time rather than exact per-artwork dwell.

On the standard Pricing surface specifically:

- 230 of 304 sessions (75.7%) had at least one qualified one-second visible artwork view.
- 171 recorded at least two seconds of active time.
- 119 recorded at least ten seconds.
- 44 recorded at least 60 seconds.
- 15 opened More Info and one opened Collector Notes.

Qualified views and active-time groups overlap and must not be added together.

### Navigation and detail activity

Across all image sessions, Pricing activity also increased with exploration:

- **Unique images:** 1.0% for one image, 3.3% for 2-4, 6.7% for 5-14, and 15.4% for 15+.
- **Navigation:** 1.5% with no navigation versus 20.0% at 15+ navigation actions. Intermediate groups are too small and noisy to imply a smooth curve.
- **Detail/narrative control opened:** 3 of 20 sessions (15.0%) opened Pricing.

`more_info_open` and `collector_notes_open` prove that a detail panel was opened; they do not prove that the narrative was read. V3 recorded no separate story-reading action in this window.

## Returning and repeat-artwork behavior

Using the full 81-day V3 history to add context to the current 374 image sessions:

- **79 sessions** belonged to visitors with at least two site sessions; 4 opened Pricing in the current session (5.1%).
- **42 sessions** belonged to visitors who viewed the same artwork in two or more sessions; none opened Pricing in the current session.

Returning visitors overall remain a useful enrichment signal. Exact same-artwork return did not correlate with Pricing in this sample. That could represent appreciation, research, or purchase consideration expressed elsewhere or later; it should not be labeled buyer intent on its own. Browser identity can also reset or fragment across devices.

## Findings, hypotheses, and next decision

### Findings

1. The valid standard Pricing-button population is 304 sessions, not 374.
2. At least 243 of those 304 had a confirmed opportunity through a qualified view or recorded active time.
3. Pricing engagement rose with qualified views, active time, navigation, and detail activity.
4. Six of the eight Pricing sessions came from the 89 active-or-deeper sessions.
5. Seven of eight Pricing sessions recorded at least 60 seconds of active time.

### Working hypotheses

- Pricing is usually a later-stage action after a visitor has formed attachment or curiosity, not an immediate response to control visibility.
- The main opportunity may be bridging appreciation to acquisition at moments of demonstrated engagement, rather than making the experience resemble a conventional store.
- Some qualified visitors may still lack context about what Pricing contains, whether an artwork is available, or what the next step entails.

The hypotheses are not established causal facts. The current samples are sufficient for directional segmentation, not for declaring why a visitor did or did not click.

### Recommended next move

Preserve the presentation. Before making a structural commerce change, use this depth segmentation as the baseline for a narrowly measured experiment: expose a subtle acquisition cue only after demonstrated engagement, such as a detail open, several artwork transitions, or sustained active time. Measure incremental Pricing opens and downstream purchase actions within the same depth tiers.

The immediate analytics priority is to strengthen the evidence rather than the sales pressure:

- record Pricing-control exposure explicitly;
- record artwork-level active dwell, rather than page-level accumulated time;
- distinguish narrative opened from narrative meaningfully read;
- connect Pricing opens to subsequent SmugMug, inquiry, and checkout outcomes;
- retain the surface/UI classification so unlike purchase paths are not combined again.

## Measurement limits

- V3 active time is lifecycle-based accumulated active/visible time, not a stopwatch for one artwork in a single-page experience.
- Missing or zero active time does not prove that a visitor spent no time looking.
- A qualified view establishes one second of loaded visibility, not careful consideration.
- Chapter views are deduplicated by image within a session.
- Opening details does not establish that the text was read.
- Pricing and downstream purchase events are sparse; deepest-tier rates have wide uncertainty.
- Visitor identity is browser-based and can fragment across browsers, devices, or resets.

