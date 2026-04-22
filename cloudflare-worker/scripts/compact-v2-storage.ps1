param(
  [string]$DatabaseName = 'k4-analytics',
  [int]$ChunkSize = 20000,
  [int]$StartId = 243139,
  [int]$EndId = 520391
)

$ErrorActionPreference = 'Stop'

function Invoke-D1Sql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Sql
  )

  $normalizedSql = (($Sql -replace "`r", ' ') -replace "`n", ' ').Trim()
  npx wrangler d1 execute $DatabaseName --remote --command $normalizedSql
  if ($LASTEXITCODE -ne 0) {
    throw "wrangler d1 execute failed with exit code $LASTEXITCODE"
  }
}

Invoke-D1Sql "DELETE FROM visitor_facts_v2; DROP TABLE IF EXISTS raw_events_page_backup_20260224;"

for ($currentStart = $StartId; $currentStart -le $EndId; $currentStart += $ChunkSize) {
  $currentEnd = [Math]::Min($currentStart + $ChunkSize - 1, $EndId)
  Write-Output "Compacting canonical_events_v2 rows $currentStart-$currentEnd"

  $sql = @"
UPDATE canonical_events_v2
SET metadata_json = json_object(
  'raw_event_type', json_extract(metadata_json, '$.raw_event_type'),
  'raw_source_layer', json_extract(metadata_json, '$.raw_source_layer'),
  'country', json_extract(metadata_json, '$.country'),
  'region', json_extract(metadata_json, '$.region'),
  'city', json_extract(metadata_json, '$.city'),
  'automation_ua_signal', CASE
    WHEN COALESCE(CAST(json_extract(metadata_json, '$.automation_ua_signal') AS INTEGER), 0) = 1
      OR lower(COALESCE(json_extract(metadata_json, '$.ua'), '')) LIKE '%headless%'
      OR lower(COALESCE(json_extract(metadata_json, '$.ua'), '')) LIKE '%googlebot%'
      OR lower(COALESCE(json_extract(metadata_json, '$.ua'), '')) LIKE '%bingbot%'
      OR lower(COALESCE(json_extract(metadata_json, '$.ua'), '')) LIKE '%crawler%'
      OR lower(COALESCE(json_extract(metadata_json, '$.ua'), '')) LIKE '%lighthouse%'
    THEN 1 ELSE 0 END
)
WHERE id BETWEEN $currentStart AND $currentEnd
  AND (
    json_extract(metadata_json, '$.ua') IS NOT NULL
    OR json_extract(metadata_json, '$.raw_source_signal') IS NOT NULL
    OR json_extract(metadata_json, '$.dedupe_window_seconds') IS NOT NULL
    OR json_extract(metadata_json, '$.dedupe_bucket') IS NOT NULL
  );
"@

  Invoke-D1Sql $sql
}

Invoke-D1Sql "SELECT COUNT(*) AS remaining_rows_with_ua FROM canonical_events_v2 WHERE json_extract(metadata_json, '$.ua') IS NOT NULL; SELECT COUNT(*) AS visitor_fact_rows FROM visitor_facts_v2;"