# K4 Studios V3: Pricing Artwork and Event-Sequence Audit

**Audit date:** October 28, 2026  
**Window:** September 28-October 27, 2026 (30 complete Eastern Time days)  
**Population:** Eight official V3 human sessions with a standard-gallery Pricing action  
**Scope:** Read-only extension of the existing traffic-quality and engagement-depth audits. No site, tracking, SEO, or production-data changes were made.

## Decision summary

The eight Pricing sessions do not represent one behavior. They split into two distinct paths:

- **Five sessions priced the first qualified artwork before meaningful navigation.** Their first Pricing action occurred 8-40 seconds after the first recorded session event. One later became a very-deep session, but Pricing came first.
- **Three sessions priced after prior exploration.** Before their first Pricing action, they had viewed 2-4 distinct artworks and/or used navigation or More Info. Their first Pricing action occurred 100 seconds, 118 seconds, and 14 minutes 41 seconds after the first recorded event.

This refines the depth finding. Engagement depth predicts Pricing across the population, but **substantial exploration did not precede most Pricing sessions**. In five of eight cases, the commercial signal looks more consistent with an immediate response to a particular artwork, an already-formed intent, or both.

The artwork mix is also suggestive but not decisive:

- 14 distinct artworks generated 16 Pricing events in eight sessions.
- 11 of the 14 depicted people or historically themed characters.
- Three were landscapes.
- The three landscape Pricing sessions nevertheless produced the highest usable subject-level session rate: 3 of 51 qualified landscape sessions (5.9%).

The sample is too small to designate "buyer-winning" subjects or feature specific works solely from this result. It is sufficient to justify retaining artwork identity and subject category in future commercial-path reporting.

## Pricing sessions with the existing tiers preserved

| Existing engagement tier | Pricing sessions | First-Pricing sequence |
|---|---:|---|
| Confirmed single-image opportunity | 2 | Both priced the first qualified artwork immediately |
| Active exploration/detail | 3 | Two priced immediately; one priced after three qualified artworks and a detail open |
| Deep | 1 | First price after two artworks; four different works priced during the session |
| Very deep | 2 | One priced after four artworks and navigation; one priced immediately and explored deeply afterward |
| **Total** | **8** | **5 immediate; 3 exploration-first** |

This sequence check prevents a misleading interpretation of the tier table. A session can end as "very deep" even though its first Pricing action happened near the beginning.

## Artwork and sequence detail

"Seconds to Pricing" is elapsed wall-clock time from the first recorded session event to the first Pricing action. It is not exact visual dwell time. "Before first Pricing" describes only events whose timestamps establish that they preceded the action.

| First priced artwork / session | Subject | Final tier | Before first Pricing | Seconds to first Pricing | What followed |
|---|---|---|---|---:|---|
| **Breakwater** (`i-sm7MXM4`) | Lake Erie lighthouse landscape | Confirmed single | 1 qualified artwork; no navigation/detail | 15 | 66s recorded session active time |
| **Dueling Falls** (`i-GmFFsFL`) | Waterfall landscape | Very deep | 4 artworks, 2 qualified; 5 navigation actions; More Info opened | 100 | 21 artworks and 34 navigation actions total |
| **Getting the last word in a grudge held too long** (`i-vcX6WLC`) | Western character portrait | Deep | 2 artworks, 1 qualified; no navigation/detail | 118 | Four works priced; 6 artworks total |
| **After the Gun Smoke** (`i-KNPxS4t`) | Western reenactor portrait | Very deep | 1 qualified artwork; no navigation/detail | 10 | 31 artworks and 67 navigation actions total; a second work priced |
| **Period Costume Photography - Reenactor Photography** (`i-3kHSr6x`) | Historical reenactor | Active | 1 qualified artwork; no navigation/detail | 9 | A second work priced and a SmugMug action recorded |
| **Dividing the Plains** (`i-7SvxcWm`) | Great Plains landscape | Confirmed single | 1 qualified artwork; no navigation/detail | 8 | 50s recorded session active time |
| **Wounded: Blood on the Bandolier** (`i-JKnW497`) | Western narrative | Active | 1 qualified artwork; no navigation/detail; zoom activity made the final tier active | 40 | 68s recorded session active time |
| **The Bedford B's** (`i-kNXVsdd`) | Western period portrait | Active | 3 qualified artworks; More Info opened; 12m52s recorded active time | 881 | A fourth artwork, **Frontier Matriarch**, was subsequently priced |

### Additional artworks priced within multi-artwork sessions

| Artwork | Subject | First recorded artwork view to Pricing |
|---|---|---:|
| **How Many Aces Was That?** (`i-sLtTp4m`) | Western character portrait | 5s |
| **The Essence Of Living History Art** (`i-nrtRrhM`) | WWII reenactor | 2s |
| **Holder of the Flag** (`i-MqTznst`) | Historical reenactor | 3s |
| **Dust and Resolve** (`i-NtMdSm4`) | Western reenactor portrait | 9s |
| **Capturing Historic Reenactor Prints** (`i-Hphs4MG`) | Historical reenactor | 24s |
| **Frontier Matriarch** (`i-xLcb2sZ`) | Western period portrait | 49s |

Across the 14 first artwork-to-Pricing intervals, the range was 2-49 seconds and the median was approximately 9.5 seconds. This is not proof of 2-49 seconds of attentive viewing: the timestamps establish sequence and elapsed time, while lifecycle engagement events can be emitted later.

Artwork-level recorded active time was present for nine of the 14 works and ranged from approximately 50 to 209 seconds. Five works had no artwork-associated engagement row. Missing time must not be interpreted as zero dwell, so these values are descriptive rather than comparable performance scores.

## Subject-matter comparison

The following categories use qualified one-second loaded/visible artwork sessions as the exposure base. A session can cross subject categories, so subject rows are not additive.

| Subject category | Qualified sessions | Pricing sessions involving subject | Session rate | Qualified artwork-session exposures | Priced artwork-sessions | Artwork-session rate |
|---|---:|---:|---:|---:|---:|---:|
| Western / Wild West | 119 | 3 | 2.5% | 446 | 5 | 1.1% |
| Other historical / reenactment | 60 | 2 | 3.3% | 101 | 4 | 4.0% |
| Landscape | 51 | 3 | 5.9% | 82 | 3 | 3.7% |
| Other portrait | 5 | 1 | 20.0% | 42 | 2 | 4.8% |
| Other | 25 | 0 | 0.0% | 69 | 0 | 0.0% |

The 20% "other portrait" result is based on only five qualified sessions and is not decision-grade. Landscape and historical/reenactment work both show more commercial activity per qualified exposure than the larger Western pool in this window, but each numerator is only two or three sessions.

### What can and cannot be inferred

**Supported:**

1. Particular artworks were often priced quickly after they appeared.
2. Most Pricing sessions did not require a long navigation journey first.
3. Human/historical works accounted for most priced artworks, while landscapes produced a higher subject-level session rate from a smaller exposure base.
4. Pricing sometimes preceded, rather than followed, very deep exploration.

**Not established:**

1. That the named artworks intrinsically cause buyer interest.
2. That narrative copy caused Pricing. Only one first-Pricing sequence had a same-artwork detail open beforehand: **Dueling Falls**.
3. That a subject category will outperform when featured on a commercial doorway.
4. That repeated Pricing actions represent separate buyers or purchase decisions.

## Implication for commercial doorways

The result supports Quill's proposed direction but not yet a production change. Future doorway tests should choose artwork using both creative judgment and observed commercial signals, then measure whether the selection improves qualified artwork progression.

The existing generated chapter-doorway assignments already associate several of these works with commercial or collection doorways. In the central commercial-intent configuration, **Breakwater** is the only one of the 14 IDs explicitly referenced as a CTA thumbnail; other works may still appear through imported and rotated gallery data. This audit did not change those assignments.

A defensible selection test would compare:

- commercially active artworks versus similarly exposed controls;
- subject categories at equal or approximately equal qualified exposure;
- immediate Pricing response versus exploration-assisted response;
- doorway impression -> artwork click -> qualified artwork view -> Pricing -> external purchase action.

With only eight Pricing sessions, artwork observations should guide candidates, not declare winners.

## Search Console priority and access requirement

The repository does not contain a live Search Console API client, current credentials, or a current performance export. Its `scripts/gsc-indexed-analysis.cjs` file is a historical manually embedded URL list and cannot answer whether Google is currently showing commercial doorways to prospective buyers.

The next audit should use a current Search Console Performance export or read-only connection containing:

- **Search type:** Web;
- **Dimensions:** Page and Query together, plus Date for trend analysis;
- **Metrics:** Clicks, impressions, CTR, and average position;
- **Range:** Preferably 16 months, with explicit last-28-day, prior-28-day, last-3-month, and prior-3-month comparisons;
- **Scope:** The 13 commercial doorways in the traffic audit, plus any canonical variants Google reports;
- **Optional cuts:** Device and country, kept separate from the primary page/query dataset.

The audit should answer, in order:

1. Are the commercial pages receiving impressions at all?
2. Which queries trigger each page, and are those queries genuinely buyer-oriented?
3. Are impressions suppressed by poor ranking, or are ranked impressions failing to earn clicks?
4. Is Google selecting a different K4 URL for the intended commercial query?
5. Which doorway/query pairs have enough evidence to improve, consolidate, or deprioritize?

Until that dataset is available, the evidence-based priority remains: **commercial search visibility first, purchase-path measurement second, artistic presentation largely unchanged.**

## Measurement limits

- V3 active time is accumulated lifecycle-based active/visible time, not exact artwork dwell.
- Engagement events can be emitted after Pricing; zero "active time before Pricing" does not prove no attentive viewing.
- Qualified view means one second of loaded visibility, not consideration.
- The Pricing control can be opened repeatedly; 16 events came from eight sessions.
- Session identity is browser-based and can fragment.
- Subject groups overlap at the session level and are broad editorial classifications.
- Samples are too small for causal or artwork-ranking claims.

