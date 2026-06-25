param(
  [string]$DatabaseName = 'k4-analytics',
  [int]$RetentionDays = 45,
  [string]$CutoffAt = ''
)

$ErrorActionPreference = 'Stop'

function Invoke-D1Sql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Sql
  )

  $normalizedSql = (($Sql -replace "`r", ' ') -replace "`n", ' ').Trim()
  $output = npx wrangler d1 execute $DatabaseName --remote --yes --json --command $normalizedSql 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "wrangler d1 execute failed with exit code $LASTEXITCODE`n$($output | Out-String)"
  }

  return ($output | Out-String).Trim()
}

if ([string]::IsNullOrWhiteSpace($CutoffAt)) {
  $cutoffJson = Invoke-D1Sql "SELECT datetime('now', '-$RetentionDays days') AS cutoff_at;"
  $cutoffData = $cutoffJson | ConvertFrom-Json
  $cutoffAt = [string](@($cutoffData)[0].results[0].cutoff_at)
} else {
  $cutoffAt = $CutoffAt
}

Write-Output "Purging analytics rows older than $cutoffAt ($RetentionDays days retention)"

$deleteSql = @"
DELETE FROM session_facts_v2 WHERE datetime(first_seen_at) < datetime('$cutoffAt');
DELETE FROM visitor_facts_v2 WHERE datetime(first_seen_at) < datetime('$cutoffAt');
DELETE FROM canonical_events_v2 WHERE datetime(occurred_at) < datetime('$cutoffAt');
DELETE FROM canonical_events WHERE datetime(ts) < datetime('$cutoffAt');
DELETE FROM raw_events WHERE datetime(ts) < datetime('$cutoffAt');
"@

Invoke-D1Sql $deleteSql | Write-Output

$verifySql = @"
SELECT 'raw_events' AS table_name, COUNT(*) AS rows, MIN(ts) AS min_ts, MAX(ts) AS max_ts FROM raw_events
UNION ALL SELECT 'canonical_events', COUNT(*), MIN(ts), MAX(ts) FROM canonical_events
UNION ALL SELECT 'canonical_events_v2', COUNT(*), MIN(occurred_at), MAX(occurred_at) FROM canonical_events_v2
UNION ALL SELECT 'session_facts_v2', COUNT(*), MIN(first_seen_at), MAX(first_seen_at) FROM session_facts_v2
UNION ALL SELECT 'visitor_facts_v2', COUNT(*), MIN(first_seen_at), MAX(first_seen_at) FROM visitor_facts_v2;
"@

Invoke-D1Sql $verifySql | Write-Output
