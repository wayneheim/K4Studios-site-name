# Phase 2 Locked Execution Checklist

Date: 2026-04-24
Scope: Three-page Phase 2 micro-plan only.
Status: Planning only. No implementation in this document.

## Guardrails
- One allowed change per page
- No full rewrites
- No layout overhaul
- No phrase removal from currently ranking pages
- No additional page builds
- Hard stop after implementation and validation

## Corrected Status Baseline

### 1. /vintage-western-art
- Current status: attached but underperforming
- Current evidence: tracker/manual evidence shows Google around #31 for exact query `vintage western art`, with `/vintage-western-art` appearing
- SERP type: commercial/product/decor/image-led
- Diagnosis: not a no-attachment case; Google accepts the page as relevant, but the page is not competitive enough in a commercial SERP
- Primary treatment direction: commercial/visual buyer alignment plus a small internal-link reinforcement

### 2. /cowboy-art-prints
- Current status: buyer-intent page with strong page fit, but attachment still not treated as proven in the current evidence set
- SERP type: commercial prints/product collection
- Diagnosis: buyer page with clear intent, but still needs a tightly scoped commercial reinforcement and validation
- Primary treatment direction: sharpen machine-readable commercial cues first, then validate attachment

### 3. /Western-Wall-Art
- Current status: no visible attachment for exact query `western wall art`
- Current evidence: manual live check shows K4 not visible in top 100 for exact query
- SERP type: ecommerce/decor/product/category-heavy
- Diagnosis: broad inbound support exists, but Google is not attaching the page for the exact query
- Primary treatment direction: above-fold commercial/category clarity, print/wall/decor cues, and indexing/GSC confirmation

## Priority Order
1. `/vintage-western-art`
2. `/cowboy-art-prints`
3. `/Western-Wall-Art`

Reasoning:
- Start with the page already in the race
- Then reinforce the clearest buyer-intent page
- Then tackle the highest-value wall-art battlefield, which likely needs the most careful SERP-format adjustment

## Locked One-Change Plan

### Page 1: /vintage-western-art
- Current rank status: attached around Google #31 for `vintage western art`
- Primary issue: attached but underperforming in a commercial SERP
- Allowed edit box:
  - Add exactly one 1-2 sentence above-fold buyer cue near the existing intro or first visible content.
- Purpose:
  - Make it immediately clear this page offers vintage Western art prints and collector-facing Western wall art, not just a definition or essay.
- Approved exact paragraph:
  - Available as archival fine art prints, these vintage Western works are made for collectors who want old-West atmosphere, frontier character, and room-ready wall art with a stronger sense of authorship. This page gathers vintage cowboy art, frontier narrative scenes, and print options for homes, offices, lodges, and Western interiors.
- Approved placement:
  - Add one new paragraph in the first `storyBlocks` entry, immediately after the existing paragraph beginning `That is the approach here.`
- Not allowed:
  - rewrite the intro
  - change layout
  - add new sections
  - add a broad internal-link burst
- Validation after deploy:
  - confirm page remains indexed and self-canonical
  - recheck manual SERP presence for `vintage western art`
  - compare GSC query/page impressions, clicks, and average position for last 28 days vs subsequent window

### Page 2: /cowboy-art-prints
- Current rank status: buyer-intent page with correct format; attachment still needs validation
- Primary issue: page fit is strong, but commercial reinforcement should be made explicit in the smallest possible way
- Allowed edit box:
  - Run schema/product/offer check only first.
  - If schema is missing or incomplete, propose the exact schema enhancement before implementing.
- Purpose:
  - Improve machine-readable commercial clarity without visible page changes.
- Approved schema direction:
  - Add one `hasOfferCatalog` block to the existing `CollectionPage` schema pointing to `/Other/Print-Options`.
- Guardrails:
  - Do not add fake `Product`, `Offer`, `price`, or `availability` fields.
  - Do not accidentally apply `Cowboy Art Prints Print Options` globally to all `CollectionPage` pages.
  - If `getStructuredData.ts` is shared globally, implement this as a page-level opt-in or override for `/cowboy-art-prints` only.
- Not allowed:
  - rewrite title
  - rewrite H1
  - rewrite meta
  - rewrite intro
  - add new visible copy in this pass
- Validation after deploy:
  - confirm valid schema presence in rendered HTML
  - check GSC exact query/page rows for `cowboy art prints`
  - confirm no cannibalization spike with `/Western-Wall-Art` or `/Western-Photography-Prints`

### Page 3: /Western-Wall-Art
- Current rank status: no visible Google attachment for exact query `western wall art`
- Primary issue: no visible attachment in a product/category-heavy SERP
- Allowed edit box:
  - Add exactly one 1-2 sentence above-fold commercial/category cue near the existing intro or first visible content.
- Purpose:
  - Make it immediately clear this page is a Western wall art, Western prints, and room-ready decor pathway.
- Approved exact paragraph:
  - Use this page as the collector-facing route into Western wall art, Western prints, and room-ready cowboy imagery designed to carry story, atmosphere, and fine-art presence into a space. Compare portrait, narrative, and frontier-led print paths before moving into materials, scale, or placement.
- Approved placement:
  - Add one new paragraph directly below the existing `page-context-link` paragraph inside the `section-heading` block, before the first `term-section`.
- Not allowed:
  - change layout
  - redesign the page
  - rewrite the full intro
  - add multiple commercial blocks
- Validation after deploy:
  - confirm indexing and canonical state in GSC/technical checks
  - manually recheck exact query `western wall art`
  - compare GSC page/query data and watch for first-query attachment or impression change

## Hard Stop Rule
After one change is made on a page:
- deploy
- validate
- stop

Do not stack a second change on the same page until the first validation result is reviewed.

## Approval Pause
Pause after this checklist is approved.

Do not make code changes until the exact allowed edit box for the page being touched is explicitly approved.

## Post-Implementation Validation
- build and deploy
- confirm the two text additions appear in raw rendered HTML without JS
- confirm `/cowboy-art-prints` JSON-LD validates structurally
- confirm `hasOfferCatalog` appears only on `/cowboy-art-prints` unless explicitly intended elsewhere
- confirm all three pages remain self-canonical
- stop

## Decision Rule After Validation
- Improvement with no new cannibalization: page remains eligible for one future micro-step
- No movement but cleaner attachment signals: monitor before expanding scope
- No attachment and no signal improvement: hold and gather more evidence before additional edits