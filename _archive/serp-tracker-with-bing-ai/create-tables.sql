-- K4 SERP Tracker Tables
-- Run this in Cloudflare Dashboard → D1 → k4-analytics → Console

-- SERP Results table - stores each daily check
CREATE TABLE IF NOT EXISTS serp_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  engine TEXT NOT NULL DEFAULT 'google',
  location TEXT DEFAULT 'United States',
  checked_at TEXT NOT NULL,
  our_rank INTEGER,
  our_url TEXT,
  all_rankings TEXT,  -- JSON array of all K4 pages ranking [{rank, url, title}]
  ai_overview_present INTEGER DEFAULT 0,
  ai_overview_cites_us INTEGER DEFAULT 0,
  ai_overview_citation_position INTEGER,
  ai_overview_text TEXT,
  top_3_urls TEXT,
  full_serp_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_serp_keyword_date ON serp_results(keyword, checked_at);
CREATE INDEX IF NOT EXISTS idx_serp_engine ON serp_results(engine);
CREATE INDEX IF NOT EXISTS idx_serp_checked_at ON serp_results(checked_at);

-- Keywords to track
CREATE TABLE IF NOT EXISTS serp_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL UNIQUE,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 5,
  track_google INTEGER DEFAULT 1,
  track_bing INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert starter keywords based on your SEO analysis
INSERT OR IGNORE INTO serp_keywords (keyword, priority) VALUES 
  ('western fine art photography', 10),
  ('cowboy photography', 10),
  ('cowboy portraits', 9),
  ('painterly photography', 9),
  ('fine art cowboy photography', 8),
  ('western wall art', 8),
  ('black and white cowboy photography', 7),
  ('native american fine art photography', 7),
  ('western fine art prints', 7),
  ('cowboy wall art', 6),
  ('civil war reenactment photography', 6),
  ('wwii reenactment photography', 6),
  ('fine art on wood prints', 5),
  ('vintage car fine art', 5),
  ('roaring 20s photography', 5);
