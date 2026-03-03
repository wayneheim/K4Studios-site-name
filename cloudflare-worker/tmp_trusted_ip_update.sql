UPDATE suspected_bots
SET risk_level = 1,
    risk_score = 0,
    rules_triggered = '["trusted_test_ip_allowlist"]',
    is_verified_bot = 1,
    bot_name = 'trusted_tester',
    status = 'verified',
    updated_at = datetime('now')
WHERE ip_hash = '184.56.48.57';
