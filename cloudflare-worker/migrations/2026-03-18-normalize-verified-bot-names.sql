UPDATE suspected_bots
SET bot_name = CASE
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%googlebot-image%' THEN 'google-image'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%google%' THEN 'googlebot'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%bing%' OR LOWER(COALESCE(bot_name, '')) LIKE '%msnbot%' OR LOWER(COALESCE(bot_name, '')) LIKE '%adidxbot%' THEN 'bingbot'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%applebot%' THEN 'applebot'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%duckduckbot%' THEN 'duckduckbot'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%yandex%' THEN 'yandex'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%baidu%' THEN 'baidu'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%facebook%' OR LOWER(COALESCE(bot_name, '')) LIKE '%facebot%' THEN 'facebook'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%twitter%' THEN 'twitter'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%pinterest%' THEN 'pinterest'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%linkedin%' THEN 'linkedin'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%openai%' OR LOWER(COALESCE(bot_name, '')) LIKE '%gptbot%' OR LOWER(COALESCE(bot_name, '')) LIKE '%chatgpt-user%' OR LOWER(COALESCE(bot_name, '')) LIKE '%oai-searchbot%' THEN 'openai'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%claude%' OR LOWER(COALESCE(bot_name, '')) LIKE '%anthropic%' OR LOWER(COALESCE(bot_name, '')) LIKE '%claudebot%' THEN 'claude'
  ELSE bot_name
END
WHERE bot_name IS NOT NULL
  AND bot_name != '';

UPDATE crawler_status_daily
SET bot_name = CASE
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%googlebot-image%' THEN 'google-image'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%google%' THEN 'googlebot'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%bing%' OR LOWER(COALESCE(bot_name, '')) LIKE '%msnbot%' OR LOWER(COALESCE(bot_name, '')) LIKE '%adidxbot%' THEN 'bingbot'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%applebot%' THEN 'applebot'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%duckduckbot%' THEN 'duckduckbot'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%yandex%' THEN 'yandex'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%baidu%' THEN 'baidu'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%facebook%' OR LOWER(COALESCE(bot_name, '')) LIKE '%facebot%' THEN 'facebook'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%twitter%' THEN 'twitter'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%pinterest%' THEN 'pinterest'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%linkedin%' THEN 'linkedin'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%openai%' OR LOWER(COALESCE(bot_name, '')) LIKE '%gptbot%' OR LOWER(COALESCE(bot_name, '')) LIKE '%chatgpt-user%' OR LOWER(COALESCE(bot_name, '')) LIKE '%oai-searchbot%' THEN 'openai'
  WHEN LOWER(COALESCE(bot_name, '')) LIKE '%claude%' OR LOWER(COALESCE(bot_name, '')) LIKE '%anthropic%' OR LOWER(COALESCE(bot_name, '')) LIKE '%claudebot%' THEN 'claude'
  ELSE bot_name
END
WHERE bot_name IS NOT NULL
  AND bot_name != '';