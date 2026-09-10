CREATE TABLE raw_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_id TEXT,
  page TEXT,
  session_id TEXT,
  visitor_id TEXT,
  referer TEXT,
  entry_referrer TEXT,
  source TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  cf_asn INTEGER,
  ua TEXT,
  ip TEXT,
  ip_hash TEXT
);

CREATE INDEX idx_raw_events_ts ON raw_events(ts);

INSERT INTO raw_events
  (id,ts,event_type,target_id,page,session_id,visitor_id,referer,entry_referrer,source,country,region,city,cf_asn,ua,ip,ip_hash)
VALUES
  (1,'2026-09-04 13:00:00','page_pixel',NULL,'/','pixel-session','pixel-visitor',NULL,NULL,'pixel','US','Ohio','Chardon',10796,'Mozilla/5.0',NULL,NULL),
  (2,'2026-09-04 13:01:00','page_view',NULL,'/','human-session','human-visitor','https://www.google.com/',NULL,'js','US','Virginia','Culpeper',10796,'Mozilla/5.0 Chrome/140',NULL,NULL),
  (3,'2026-09-04 13:02:00','chapter_view','i-example','/Galleries/example/i-example','human-session','human-visitor','https://www.k4studios.com/',NULL,'js','US','Virginia','Culpeper',10796,'Mozilla/5.0 Chrome/140',NULL,NULL),
  (4,'2026-09-04 13:03:00','harvester_friction','i-scraped',NULL,NULL,NULL,NULL,NULL,'proxy','US','Virginia','Ashburn',16509,'python-requests/2',NULL,NULL),
  (5,'2026-09-04 13:04:00','page_view',NULL,'/fake','bot-session','bot-visitor',NULL,NULL,'js','SG',NULL,'Singapore',136907,'Mozilla/5.0 HeadlessChrome',NULL,NULL),
  (6,'2026-09-04 13:05:00','order_clicked','i-example','/Galleries/example/i-example','human-session','human-visitor','https://www.k4studios.com/',NULL,'js','US','Virginia','Culpeper',10796,'Mozilla/5.0 Chrome/140',NULL,NULL),
  (7,'2026-09-04 13:06:00','page_view',NULL,'/owner-test','owner-session','owner-visitor',NULL,NULL,'js','US','Ohio','Chardon',10796,'Mozilla/5.0 Chrome/140','184.56.48.57',NULL);
