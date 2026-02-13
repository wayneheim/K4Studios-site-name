-- Art Views Table (Layer B - Server-Side Attention Tracking)
-- Run this in Cloudflare D1 Console before deploying the worker

CREATE TABLE IF NOT EXISTS art_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT NOT NULL,              -- 'image', 'image_page', 'gallery'
    target_id TEXT NOT NULL,         -- image ID (i-xxx) or gallery slug
    ip_hash TEXT,                    -- Privacy-safe IP hash (first 3 octets)
    ua_class TEXT DEFAULT 'human',   -- 'human', 'unknown', 'bot'
    country TEXT,                    -- Country code from CF
    referrer TEXT,                   -- HTTP Referer header
    dedup_key TEXT UNIQUE            -- For INSERT OR IGNORE deduplication
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_art_views_created_at ON art_views(created_at);
CREATE INDEX IF NOT EXISTS idx_art_views_type ON art_views(type);
CREATE INDEX IF NOT EXISTS idx_art_views_target ON art_views(target_id);
CREATE INDEX IF NOT EXISTS idx_art_views_dedup ON art_views(dedup_key);
