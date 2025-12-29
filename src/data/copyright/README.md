# Copyright Registration System

This directory contains the authoritative copyright registration data for K4 Studios images.

## Directory Structure

```
copyright/
├── copyright-registry.json     # Master registry (source of truth)
├── copyright-types.ts          # TypeScript type definitions
├── submission-ledger.csv       # Audit trail (auto-generated)
├── quarterly/                  # Quarterly batch staging
│   ├── copyright-quarterly-2025-Q1.json
│   ├── copyright-quarterly-2025-Q2.json
│   └── ...
└── README.md                   # This file
```

## Key Concepts

### Master Registry (`copyright-registry.json`)

This is the **single source of truth** for all copyright registrations. It maps image IDs to registration info:

```json
{
  "registrations": {
    "i-xxxx": {
      "registered": true,
      "submission_date": "2025-06-29",
      "registration_number": "VA 2-345-678",
      "batch_id": "2025-Q2-A"
    }
  }
}
```

**Rules:**
- Append/update only — never auto-delete entries
- Image identity is `i-xxxx` only (not tied to galleries or titles)
- This file is authoritative even if galleries are rebuilt

### Quarterly Batches (`quarterly/`)

Temporary staging files for registration preparation. Each quarter can have a batch file:

```json
{
  "quarter": "2025-Q2",
  "status": "draft|approved|submitted|processed",
  "images": [
    {
      "image_id": "i-xxxx",
      "source_gallery": "/src/data/Galleries/...",
      "title_snapshot": "Historic Portrait",
      "submission_group": "A"
    }
  ]
}
```

**Workflow:**
1. `draft` — Images being collected
2. `approved` — Ready for submission (groups assigned)
3. `submitted` — Sent to Copyright Office (registration numbers recorded)
4. `processed` — Finalized into master registry

### Submission Ledger (`submission-ledger.csv`)

Auto-generated CSV audit trail for disaster recovery and legal audits:

```csv
image_id,batch_id,registration_number,submission_date,source_gallery,title_at_submission
i-xxxx,2025-Q2-A,VA 2-345-678,2025-06-29,/src/data/Galleries/...,Historic Portrait
```

## API Endpoints

The Netlify function `/.netlify/functions/copyrightRegistry` provides:

### GET Requests
- `?action=status&imageId=xxx` — Check if image is registered
- `?action=registry` — Get full registry
- `?action=quarterly&quarter=2025-Q2` — Get quarterly batch
- `?action=listQuarterly` — List all quarterly batches
- `?action=summary&quarter=2025-Q2` — Get quarterly summary for review

### POST Actions
- `action=markRegistered` — Manual catch-up for existing images
- `action=batchMarkRegistered` — Batch manual catch-up
- `action=addToQuarterly` — Add images to quarterly batch
- `action=removeFromQuarterly` — Remove images from batch
- `action=approveQuarterly` — Approve batch (assign groups)
- `action=recordSubmission` — Record registration number for a group
- `action=processQuarterly` — Finalize batch into registry
- `action=bulkStatus` — Get status for multiple images

## Admin UI

Access the Copyright Manager at: `/admin/CopyrightManager`

Features:
- Browse galleries and see copyright status
- Manually mark images as registered (catch-up mode)
- Collect unregistered images into quarterly batch
- Review and approve quarterly batches
- Enter registration numbers per submission group
- Export registry as CSV

## Automated Scanner

Run the quarterly scanner script to find new images:

```bash
# Scan current quarter (dry run)
node scripts/scan-copyright-quarterly.mjs --dry-run

# Scan and update batch
node scripts/scan-copyright-quarterly.mjs

# Scan specific quarter
node scripts/scan-copyright-quarterly.mjs --quarter 2025-Q1

# Check deadline reminders
node scripts/scan-copyright-quarterly.mjs --reminders
```

## Key Design Principle

> **Creative data changes. Legal data must not.**

That's why:
- Gallery `.mjs` files contain creative data (titles, descriptions)
- Copyright registry is separate and authoritative
- Image identity is `i-xxxx` only, not tied to mutable fields

The system can always answer:
- Is image `i-xxxx` registered?
- When was it submitted?
- Under which registration number?
- In which batch?

Even if galleries are rebuilt from scratch.

## Submission Limits

The US Copyright Office allows up to 750 images per group submission. The system automatically assigns submission groups (A, B, C, etc.) when approving a quarterly batch.

## Important Dates

For each quarter, copyright should be registered within 90 days of quarter end:
- Q1 (Jan-Mar): Submit by June 30
- Q2 (Apr-Jun): Submit by September 30
- Q3 (Jul-Sep): Submit by December 31
- Q4 (Oct-Dec): Submit by March 31 (next year)

The scanner includes reminder functionality to track these deadlines.
