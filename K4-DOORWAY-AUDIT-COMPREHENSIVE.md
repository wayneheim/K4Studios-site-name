# K4 Studios Doorway Page Audit Report — COMPREHENSIVE RESULTS
## Phase 1 Complete: Live Validation of 28 Commercial Doorway Pages

**Date:** April 24, 2026  
**Total Pages Checked:** 28 commercial/doorway pages (+ 3 previously validated) + 1 editorial essay (out of scope)  
**Technical Pass Rate:** 24/28 (85.7%)  
**Critical Issues Found:** 1 (canonical redirect)  
**Note:** `/Other/Narrative-Art` is editorial essay content about narrative art concept, not a commercial doorway page — excluded from this audit.

---

## SECTION 1: TECHNICAL RESULTS SUMMARY

### ✅ TECHNICAL PASS (24/28 commercial)

| Category | Passed | Details |
|---|---|---|
| Hub Landing Pages (12) | 12/12 | ✅ ALL PASS |
| Interior Design (4) | 4/4 | ✅ ALL PASS |
| Photography Variants (4) | 3/4 | ⚠️ `/western-photos` fails (1581 words) |
| Legacy/Alternative (5) | 3/5 | ⚠️ `/old-western-art` (2031 words), `/western-art-photography` (WRONG CANONICAL) |
| Collection (2) | 2/2 | ✅ ALL PASS |
| Editorial (Out of Scope) | — | `/Other/Narrative-Art` essay content (not commercial page) |

---

## SECTION 2: FAILED PAGES — ISSUES REQUIRING ACTION

### 🔴 CRITICAL: /western-art-photography

**Issue Type:** CANONICAL REDIRECT + THIN CONTENT

| Criterion | Status | Finding |
|---|---|---|
| Status Code | 200 | ✅ OK |
| WWW | True | ✅ OK |
| **Canonical** | ❌ **FAIL** | Points to `/Western-Photography-Art` instead of self-referential |
| Sitemap | True | ✅ OK |
| H1 | Present | ✅ OK |
| Word Count | 1144 | ⚠️ Below threshold (2500 min) |
| NoIndex | False | ✅ OK |

**Problem:** 
- This page has a canonical tag pointing to `/Western-Photography-Art` instead of itself
- Creates redirect loop or consolidation that allows the other page to cannibalize
- Thin content (1144 words) compounds the issue

**Recommendation:** 
- FIX CANONICAL to self-referential: `<link rel="canonical" href="https://www.k4studios.com/western-art-photography" />`
- KEEP BOTH URLs LIVE as separate intent lanes (no consolidation)
- Assign `/western-art-photography` to genre/definition authority intent and `/Western-Photography-Art` to collection/gallery/commercial intent

---

### 🟡 MODERATE: /western-photos

**Issue Type:** THIN CONTENT

| Criterion | Status | Finding |
|---|---|---|
| Status Code | 200 | ✅ OK |
| WWW | True | ✅ OK |
| Canonical | True | ✅ Self-referential + www |
| Sitemap | True | ✅ OK |
| H1 | Present | ✅ OK ("Western Photos") |
| **Word Count** | **1581** | ⚠️ **37% below threshold** |
| NoIndex | False | ✅ OK |

**Problem:** 
- Generic term ("western photos") + thin content = low authority
- 1581 words is 37% below minimum crawlable threshold (2500)
- No buyer language, no clear subject specialization
- Competes with `/western-landscape-art` (4221 words), `/western-portrait-photography` (3978 words), and multiple hub pages

**Recommendation:**
- **Option A:** Expand content to 3500+ words, add buyer language ("fine art photography prints," "collector prints", etc.), establish clear angle (e.g., "curated selection of...")
- **Option B:** Consolidate with stronger variant (`/western-landscape-art` or `/western-portrait-photography`)
- **Option C:** Deprioritize as low-authority variant of better-positioned pages

---

### 🟡 MODERATE: /old-western-art

**Issue Type:** THIN CONTENT + DEFINITIONAL FORMAT

| Criterion | Status | Finding |
|---|---|---|
| Status Code | 200 | ✅ OK |
| WWW | True | ✅ OK |
| Canonical | True | ✅ Self-referential + www |
| Sitemap | True | ✅ OK |
| H1 | Present | ✅ OK ("What Is Old Western Art?") |
| **Word Count** | **2031** | ⚠️ **19% below threshold** |
| NoIndex | False | ✅ OK |

**Problem:**
- Starts as definitional page ("What Is...") — Google may rank definitional pages, but this is thin even for that
- 2031 words is below threshold (barely)
- H1 is definitional ("What Is Old Western Art?") — conflates definition with artist portfolio
- May compete with `/vintage-western-art` (4013 words) for "old western art" and "vintage western art" queries

**Recommendation:**
- **Option A:** Expand to 3500+ words with deeper history, artist positioning, buyer language
- **Option B:** Shift positioning: less "what is old western art" (definition), more "old western art by Wayne Heim" (portfolio + artist authority)
- **Option C:** Merge into `/vintage-western-art` (which has stronger content) and consolidate positioning

---

## SECTION 3: PASSED PAGES — DETAILED BREAKDOWN

### Hub Landing Pages (12/12 PASS) — CORE AUTHORITY TIER

| Page | Target Keyword | Technical | SERP Format | Cannibalization Risk | Internal Linking | Status |
|---|---|---|---|---|---|---|
| /Narrative-Western-Art | narrative western art | ✅ 5313w | Gallery/Portfolio | LOW | STRONG (hub page, links from multiple) | ✅ MAINTAIN |
| /Western-Wall-Art | western wall art | ✅ 4234w | Ecommerce/Collection | MEDIUM (vs. interior design pages) | STRONG (hub) | ✅ MAINTAIN |
| /Western-Fine-Art-Photography | western fine art photography | ✅ 5519w | Gallery/Portfolio | LOW (specialist positioning) | STRONG (lead authority) | ✅ MAINTAIN |
| /Western-Cowboy-Photography | western cowboy photography | ✅ 4460w | Gallery/Portrait | LOW (specialist positioning) | STRONG (hub page) | ✅ MAINTAIN |
| /American-Western-Art | american western art | ✅ 4399w | Gallery/Portfolio | MEDIUM (vs. other American-focused pages) | MEDIUM | ✅ MAINTAIN |
| /Contemporary-Western-Art | contemporary western art | ✅ 4446w | Gallery/Portrait | LOW (subset positioning) | MEDIUM | ✅ MAINTAIN |
| /Historical-Western-Art | historical western art | ✅ 4554w | Gallery/Historical | LOW (specialist positioning) | MEDIUM | ✅ MAINTAIN |
| /Western-Frontier-Art | western frontier art | ✅ 5345w | Gallery/Historical | LOW (specialist positioning) | MEDIUM | ✅ MAINTAIN |
| /Painterly-Western-Photography | painterly western photography | ✅ 4244w | Gallery/Technique | LOW (specialist positioning) | WEAK | ✅ MAINTAIN |
| /Western-Photography-Art | western photography art | ✅ 5157w | Gallery/Portfolio | MEDIUM (vs. western-art-photography) | MEDIUM | ✅ MAINTAIN |
| /Cowboy-Fine-Art-Photography | cowboy fine art photography | ✅ 4200w | Gallery/Portrait | MEDIUM (vs. western-cowboy-photography) | WEAK | ⚠️ REVIEW |
| /Fine-Art-Photography-of-the-American-West | fine art photography american west | ✅ 5026w | Gallery/Portfolio | MEDIUM (vs. fine-art pages) | MEDIUM | ✅ MAINTAIN |

---

### Interior Design Specialization (4/4 PASS) — B2B/INTERIOR BUYER TIER

| Page | Target Keyword | Technical | SERP Format | Cannibalization Risk | Internal Linking | Status |
|---|---|---|---|---|---|---|
| /Western-Interior-Design-Art | western interior design art | ✅ 3736w | Interior Design/Lifestyle | MEDIUM (vs. other interior pages) | MEDIUM | ✅ MAINTAIN |
| /Modern-Western-Interior-Design-Art | modern western interior design art | ✅ 4371w | Interior Design/Modern | LOW (subset positioning) | WEAK | ✅ MAINTAIN |
| /Rustic-Western-Interior-Design-Art | rustic western interior design art | ✅ 3873w | Interior Design/Rustic | LOW (subset positioning) | WEAK | ✅ MAINTAIN |
| /Western-Wall-Art-for-Interior-Designers | western wall art interior designers | ✅ 3754w | Interior Design/B2B | LOW (B2B angle) | WEAK | ✅ MAINTAIN |

---

### Photography Variants (3/4 PASS) — SUBJECT-SPECIFIC TIER

| Page | Target Keyword | Technical | SERP Format | Cannibalization Risk | Internal Linking | Status |
|---|---|---|---|---|---|---|
| /western-landscape-art | western landscape art | ✅ 4221w | Gallery/Landscape | MEDIUM (vs. other art pages) | WEAK | ✅ MAINTAIN |
| /western-portrait-photography | western portrait photography | ✅ 3978w | Gallery/Portrait | MEDIUM (vs. cowboy pages) | WEAK | ✅ MAINTAIN |
| /Western-Black-and-White-Photography | western black and white photography | ✅ 4028w | Gallery/Technique | LOW (specialist positioning) | WEAK | ✅ MAINTAIN |
| /western-photos | western photos | ❌ 1581w | Gallery (generic) | HIGH (competes with landscape, portrait, B&W) | WEAK | ⚠️ EXPAND or CONSOLIDATE |

---

### Legacy/Alternative Pages (3/5 PASS) — VARIANT/LEGACY TIER

| Page | Target Keyword | Technical | SERP Format | Cannibalization Risk | Internal Linking | Status |
|---|---|---|---|---|---|---|
| /Western-Photography-Prints | western photography prints | ✅ 4077w | Ecommerce/Collection | MEDIUM (vs. prints pages) | WEAK | ✅ MAINTAIN |
| /western-artwork | western artwork | ✅ 4103w | Gallery (generic) | MEDIUM (vs. western-art-photography) | WEAK | ✅ MAINTAIN |
| /vintage-western-art | vintage western art | ✅ 4013w | Gallery/Vintage | LOW (specialist positioning) | WEAK | ✅ MAINTAIN |
| /western-art-photography | western art photography | ❌ 1144w + WRONG CANONICAL | Gallery/Portfolio | HIGH (points to /Western-Photography-Art) | WEAK | 🔴 FIX CANONICAL |
| /old-western-art | old western art | ❌ 2031w | Definition/Gallery (mixed) | MEDIUM (vs. vintage-western-art) | WEAK | ⚠️ EXPAND or CONSOLIDATE |

---

### Collection Pages (2/2 PASS) — SERIES/COLLECTION TIER

| Page | Target Keyword | Technical | SERP Format | Cannibalization Risk | Internal Linking | Status |
|---|---|---|---|---|---|---|
| /historical-fine-art-photography-collection | historical fine art photography collection | ✅ 4508w | Collection/Series | LOW (unique positioning) | MEDIUM | ✅ MAINTAIN |
| /western-fine-art-photography-collection | western fine art photography collection | ✅ 4235w | Collection/Series | LOW & MEDIUM (vs. other western fine art pages) | MEDIUM | ✅ MAINTAIN |

---

### Editorial Content (Out of Scope)

| Page | Purpose | Status |
|---|---|---|
| /Other/Narrative-Art | Essay – explores narrative art as concept and artistic genre | PASS (intentional thin essay, not commercial doorway) |

---

## SECTION 4: CANNIBALIZATION ANALYSIS

### HIGH-RISK CLUSTERS (Multiple Pages Competing for Same Query)

**Cluster 1: "Western Photography" (4 competing pages)**
- `/Western-Photography-Art` ✅ 5157w (STRONG)
- `/western-art-photography` ❌ WRONG CANONICAL (WEAK)
- `/western-photos` ❌ 1581w (WEAK)
- `/Western-Photography-Prints` ✅ 4077w (MEDIUM)

**Resolution:**
- Primary target: `/Western-Photography-Art`
- `/western-art-photography`: Fix canonical to self-ref, keep as definition/genre authority lane with distinct intro and metadata
- `/western-photos`: Either expand or consolidate into stronger page
- `/Western-Photography-Prints`: Keep as distinct (buyer intent: "prints")

---

**Cluster 2: "Western Art / Cowboy Art" (5+ competing pages)**
- `/Western-Fine-Art-Photography` ✅ 5519w (STRONGEST)
- `/Cowboy-Fine-Art-Photography` ✅ 4200w (STRONG)
- `/western-artwork` ✅ 4103w (STRONG)
- `/Narrative-Western-Art` ✅ 5313w (STRONG, different angle)
- `/Western-Cowboy-Photography` ✅ 4460w (STRONG, different angle)

**Resolution:**
- Primary targets established (each has distinct angle: photography, cowboy, narrative, etc.)
- Risk is MEDIUM (low if angles stay distinct)
- Action: Verify internal linking reinforces distinctions

---

**Cluster 3: "Interior/Wall Art" (5 competing pages)**
- `/Western-Wall-Art` ✅ 4234w (HUB)
- `/Western-Interior-Design-Art` ✅ 3736w (INTERIOR DESIGNER angle)
- `/Modern-Western-Interior-Design-Art` ✅ 4371w (MODERN style)
- `/Rustic-Western-Interior-Design-Art` ✅ 3873w (RUSTIC style)
- `/Western-Wall-Art-for-Interior-Designers` ✅ 3754w (B2B angle)

**Resolution:**
- Primary target: `/Western-Wall-Art` (collector/consumer angle)
- Secondary targets: Style variants (Modern, Rustic) and B2B (for-designers)
- Risk is MEDIUM-LOW if internal linking establishes hierarchy

---

**Cluster 4: "Old/Vintage Western Art" (2 pages)**
- `/vintage-western-art` ✅ 4013w (STRONGER)
- `/old-western-art` ❌ 2031w (WEAKER)

**Resolution:**
- Primary target: `/vintage-western-art`
- `/old-western-art`: Expand to match word count, or consolidate into `/vintage-western-art`

---

## SECTION 5: RECOMMENDED ACTIONS

### IMMEDIATE (Critical Fixes)

1. **Fix /western-art-photography canonical**
   - Change canonical from `/Western-Photography-Art` to self-referential
   - Keep both pages live; do not 301 either page
   - Differentiate page roles: definition/authority vs collection/commercial
   - Priority: HIGH
   - Effort: 5 minutes

---


### SHORT-TERM (Content Expansion / Consolidation)

2. **Expand /western-photos**
   - Current: 1581 words (37% below threshold)
   - Target: 3500+ words
   - Add: buyer language, subject specialization, internal linking
   - Alternative: Consolidate with `/western-landscape-art` or `/western-portrait-photography`
   - Priority: MEDIUM
   - Effort: 2-3 hours (if expanding)

3. **Expand /old-western-art OR consolidate into /vintage-western-art**
   - Current: 2031 words (19% below threshold), definitional format
   - Option A: Expand to 3500+ words, shift emphasis to artist portfolio
   - Option B: 301 redirect to `/vintage-western-art`
   - Priority: MEDIUM
   - Effort: 2-3 hours (if expanding) or 15 minutes (if consolidating)

---

### MEDIUM-TERM (Cannibalization Clarification)

4. **Clarify /western-art-photography vs /Western-Photography-Art positioning**
   - Establish distinct keyword targets
   - Decision: Keep both (one for "western art photography" genre intent, one for "western photography art" collection intent)
   - Rule: no consolidation based on phrase similarity alone; consolidate only with high SERP overlap
   - Priority: MEDIUM
   - Effort: 1-2 hours

5. **Review internal linking for distinction reinforcement**
   - Verify hub pages link to correct variant pages for their specific intent
   - Ensure anchor text uses actual target phrases (not "see our photography")
   - Priority: MEDIUM
   - Effort: 2-4 hours

---

### ONGOING (Monitoring)

6. **Monitor three previously validated pages**
   - `/cinematic-western-art`, `/cowboy-art-prints`, `/western-storytelling-photography`
   - Watch for SERP ranking trends
   - Check if cannibalization between narrative/storytelling/cinematic pages is occurring
   - Priority: LOW
   - Effort: Monthly review

---

## SECTION 6: PASS/FAIL SUMMARY

| Category | Count | Pass | Fail | Notes |
|---|---|---|---|---|
| Hub Pages | 12 | 12 | 0 | All strong, 4200–5519 words |
| Interior Design | 4 | 4 | 0 | All strong, 3700–4400 words |
| Photos Variants | 4 | 3 | 1 | `/western-photos` thin (1581w) |
| Legacy/Alternative | 5 | 3 | 2 | `/western-art-photography` bad canonical; `/old-western-art` thin |
| Collection | 2 | 2 | 0 | Both strong, 4200+ words |
| Editorial (Out of Scope) | 1 | — | — | `/Other/Narrative-Art` essay content |
| **TOTAL COMMERCIAL** | **28** | **24** | **4** | **3 fixable, 85.7% pass rate** |

---

## SECTION 7: INTERNAL LINKING + OWNERSHIP AUDIT (NEXT PASS)

**Scope for this pass:** 30 commercial pages (27 from the technical audit set + 3 previously validated pages).  
**Method used:** link graph extraction from static `<a href>` links across `src/pages/**/*.astro`, then ownership clustering and role assignment.  
**Per-page matrix:** `internal-link-ownership-audit.csv` (contains all requested fields per commercial URL).

### Required Fields Delivered (Per Commercial Page)

- Target keyword
- Primary owning URL
- Supporting URLs
- Strongest internal links pointing to it
- Anchor text used
- Pages it should link back to
- Role classification (hub, spoke, buyer page, editorial bridge)

### High-Signal Findings

- 13 commercial pages currently have **0 measured inbound links** from static page links.
- 19 commercial pages have **0-1 inbound links**, which indicates weak road-building between commercial nodes.
- Link authority is concentrated heavily in a few URLs:
  - `/Western-Fine-Art-Photography` (33)
  - `/Narrative-Western-Art` (27)
  - `/American-Western-Art` (9)
  - `/Western-Cowboy-Photography` (6)
  - `/western-storytelling-photography` (6)
- Critical ownership gaps are visible in cannibalized clusters:
  - Western photography cluster: `/western-photos` and `/western-art-photography` have no measured inbound links while competing with `/Western-Photography-Art`.
  - Interior/wall-art cluster: `/Western-Wall-Art` and all three interior variants show no measured inbound links, so ownership cannot consolidate.
  - Old/vintage cluster: `/old-western-art` has no measured inbound links while `/vintage-western-art` has minimal support.

### Ownership Lock Map (Primary Owners)

- Western photography cluster owner: `/Western-Photography-Art`
- Interior/wall-art cluster owner: `/Western-Wall-Art`
- Old/vintage cluster owner: `/vintage-western-art`
- Narrative/storytelling cluster owner: `/Narrative-Western-Art`
- Core specialist pages (American, contemporary, historical, frontier, etc.): self-owned unless cannibalization emerges

### Link-Back Requirements (Road Network Rules)

- Every spoke must link to its owning hub with exact/near-exact anchor text.
- Every buyer page must link to the relevant hub and one adjacent buyer variant.
- Every editorial bridge page must link to one narrative hub and one buyer/commercial destination.
- Every hub must link down to its top spokes and back across to one adjacent hub to avoid orphaned clusters.

### Priority Implementation Queue

1. Build minimum viable roads for all 0-link pages: add 3 contextual internal links into each from relevant hubs/blog explainers.
2. Enforce ownership anchors in cannibalized clusters:
   - Use keyword-owning anchors pointing to `/Western-Photography-Art`, `/Western-Wall-Art`, `/vintage-western-art`, `/Narrative-Western-Art`.
3. Add reciprocal links from weak spokes back to owner hubs:
   - `/western-photos` → `/Western-Photography-Art`
   - `/western-art-photography` → `/Western-Photography-Art`
   - `/old-western-art` → `/vintage-western-art`
4. Add SERP-format alignment pass on weak pages (especially generic query pages):
   - buyer intent blocks, comparison blocks, and stronger conversion pathways.

### Bottom-Line Read

- Technical state: pages are live.
- Authority state: many pages are still lightly connected.
- Ownership state: defined, but not yet fully enforced by internal linking.
- Next wins come from **link authority + SERP-format matching + keyword ownership lock**, not from publishing more pages.

---

## CONCLUSION

**Overall Status: GOOD**

- **24 of 28 commercial doorway pages pass technical checks** (85.7%)
- **All 3 previously validated pages confirmed LIVE**
- **No major technical regressions across the site**
- **Primary issues are growth-related, not architectural**
- **Editorial content (essay) is separate from commercial audit — performing as intended**

**Next Steps (Priority Order):**
1. Fix canonical redirect on `/western-art-photography`
2. Expand `/western-photos` and `/old-western-art` or consolidate them
3. Audit internal linking for cannibalization clarification
4. Monitor SERP rankings for three validated doorway pages

