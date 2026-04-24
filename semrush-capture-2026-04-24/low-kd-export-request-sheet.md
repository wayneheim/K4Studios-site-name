# Low-KD Evidence Export Request Sheet

Date: 2026-04-24
Purpose: Collect complete evidence to move each low-KD query from LOW confidence to MEDIUM or HIGH before any Phase 2 implementation.

## 1) Priority Query List (Exact Match)
1. cowboy art prints
2. western artwork
3. vintage western art
4. contemporary western art
5. old western art

## 2) Semrush Keyword Overview Export (Per Query)
Run a Keyword Overview export for each exact query above.

Required fields in each export:
- Query
- Search volume
- Keyword Difficulty (KD)
- Intent
- CPC
- Trend
- SERP features
- Country/DB scope
- Device scope (if shown)
- Date captured

Semrush copy/paste query list:
- cowboy art prints
- western artwork
- vintage western art
- contemporary western art
- old western art

## 3) Semrush SERP Analysis / Organic Results Export (Per Query)
For each exact query, export top 20 organic results.

Required fields:
- Position
- Ranking URL
- Page title
- Domain
- Date captured
- Device scope (desktop/mobile, if available)
- Location scope (country/region, if available)

Output requirement:
- Exactly top 20 rows per query
- Preserve query text exactly in export or filename

Optional backup evidence (recommended):
- If CSV export does not preserve full URL/title/SERP-feature context, also save a PDF or screenshot of the SERP Analysis / Organic Results screen for that query.
- Use matching filename convention with `-serp-screen` suffix.
- Examples:
	- cowboy-art-prints_serp-screen_20260424.pdf
	- western-artwork_serp-screen_20260424.png

## 4) Domain Organic Positions Exports (Exact Query Filter)
For each domain below, export Organic Positions filtered to each exact query.

Domains to run:
- k4studios.com
- jessleephotos.com
- robhammerphotography.com
- hanleyfineart.com
- stoeckleinphotography.com
- terijames.com
- julesfrazier.com
- phyllisburchettphoto.net

Required fields:
- Query
- Position
- URL
- Position type
- Search volume
- KD
- Intent
- Timestamp/date captured

Filter rule:
- Exact query match only (one export per query per domain, or one export with exact query filter set to one of the five)

## 5) GSC Export Instructions (K4 Only)
Run two date windows if possible:
- Last 3 months
- Last 28 days

For each exact query, export query-page rows with:
- Query (exact match filter)
- Page
- Impressions
- Clicks
- CTR
- Average position
- Date range

GSC query filters to paste:
- cowboy art prints
- western artwork
- vintage western art
- contemporary western art
- old western art

## 6) File Naming Convention
Use this exact pattern:

queryname_reporttype_YYYYMMDD.csv

Slug rules:
- Lowercase
- Replace spaces with hyphens
- Keep report type explicit and stable

Examples:
- cowboy-art-prints_keyword-overview_20260424.csv
- cowboy-art-prints_serp-top20_20260424.csv
- cowboy-art-prints_k4-gsc-query-page_20260424.csv
- western-artwork_domain-positions-k4studios_20260424.csv
- vintage-western-art_domain-positions-robhammerphotography_20260424.csv

## 7) Completion Checklist (Confidence Upgrade Gate)
- SERP top 20 captured for the exact query
- K4 rank/no-rank resolved for the same capture window
- At least 3 known competitors checked for the exact query
- Page-type mix labeled across top SERP rows
- Confidence upgraded to MEDIUM or HIGH

## Optional Page-Type Labeling Template (Use on SERP Top 20)
Label each result as one of:
- Artist portfolio/gallery
- Product or collection page
- Marketplace listing
- Pinterest/visual aggregator
- Editorial/definition
- Museum/institutional
- Decor/inspiration
- Other

Also tag competitor class:
- Known competitor
- Broader marketplace/decor result
