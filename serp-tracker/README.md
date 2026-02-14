# K4 SERP Tracker

Daily rank tracking for Google and Bing with AI Overview detection.

## Setup

### 1. Get DataForSEO API Credentials

1. Sign up at https://dataforseo.com
2. Go to API Access → API Credentials
3. Copy your `login` and `password`

### 2. Add Secrets to Cloudflare

```bash
cd cloudflare-worker
wrangler secret put DATAFORSEO_LOGIN
wrangler secret put DATAFORSEO_PASSWORD
```

### 3. Create the D1 Table

Run this SQL in the Cloudflare dashboard (D1 → k4-analytics → Console):

```sql
-- SERP Results table
CREATE TABLE IF NOT EXISTS serp_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  engine TEXT NOT NULL DEFAULT 'google',
  location TEXT DEFAULT 'United States',
  checked_at TEXT NOT NULL,
  our_rank INTEGER,
  our_url TEXT,
  ai_overview_present INTEGER DEFAULT 0,
  ai_overview_cites_us INTEGER DEFAULT 0,
  ai_overview_citation_position INTEGER,
  top_3_urls TEXT,
  full_serp_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_serp_keyword_date ON serp_results(keyword, checked_at);
CREATE INDEX IF NOT EXISTS idx_serp_engine ON serp_results(engine);

-- Keywords to track
CREATE TABLE IF NOT EXISTS serp_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 4. Add Your Keywords

Insert your target keywords:

```sql
INSERT INTO serp_keywords (keyword, priority) VALUES 
  ('western fine art photography', 10),
  ('cowboy photography', 10),
  ('painterly photography', 9),
  ('one image movie', 9),
  ('cowboy portraits', 8),
  ('fine art cowboy photography', 8),
  ('western wall art', 7),
  ('black and white cowboy photography', 7),
  ('native american fine art photography', 7),
  ('civil war reenactment photography', 6),
  ('wwii reenactment photography', 6),
  ('fine art on wood prints', 6),
  ('baltic birch fine art', 5),
  ('fine art roaring 20s', 5),
  ('vintage car photography art', 5);
```

### 5. Deploy

```bash
cd cloudflare-worker
wrangler deploy
```

## Usage

### View Dashboard
Visit: `https://k4i.k4studios.com/admin/serp`

### Manual Fetch
Click "Fetch Now" on the dashboard or POST to:
```
POST https://k4i.k4studios.com/serp/fetch
Authorization: Basic base64(k4admin:YOUR_PASSWORD)
```

### Scheduled (Cron)
Add to wrangler.toml:
```toml
[triggers]
crons = ["0 6 * * *"]  # Daily at 6 AM UTC
```

Then the worker's `scheduled()` handler will auto-fetch.

## Cost Estimate

- 15 keywords × 2 engines × 30 days = 900 searches/month
- DataForSEO SERP API: ~$0.003/search with AI Overview
- **Monthly cost: ~$2.70**

## Dashboard Features

- 📊 Current rank for each keyword (Google + Bing)
- 📈 Rank trend chart (last 30 days)
- 🤖 AI Overview detection with citation tracking
- ⬆️⬇️ Daily rank changes
- 🏆 Top 3 competitors per keyword
