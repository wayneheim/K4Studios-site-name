-- Seed SERP keywords (idempotent)
-- Source: cloudflare-worker/analytics_pre_epoch.sql
-- Usage:
--   cd cloudflare-worker
--   npx wrangler d1 execute k4-analytics --remote --file ./d1-seeds/serp-keywords-seed.sql

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('western fine art photography', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('western fine art', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('western art', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('artistic western photography', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('painterly photography', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('western painterly photography', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('western cowboy art', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('historical western photography', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('cowboy fine art photography', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('western cowboy portraits', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('historical western art', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('western black and white photography', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('western cowboy photography', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('fine art photography', 5, 1, 1, 0);

INSERT OR IGNORE INTO serp_keywords (keyword, priority, enabled, track_google, track_bing)
VALUES ('painterly fine art photography', 5, 1, 1, 0);
