param(
  [string]$DatabaseName = 'k4-analytics',
  [int]$CutoffDays = 30,
  [string]$OutputRoot = 'd1-backups',
  [string]$BackupLabel = (Get-Date -Format 'yyyyMMdd-HHmmss')
)

$ErrorActionPreference = 'Stop'

function Write-Utf8NoBomFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [Parameter(Mandatory = $true)]
    [string]$Content
  )

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Invoke-D1JsonSql {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Sql
  )

  $normalizedSql = (($Sql -replace "`r", ' ') -replace "`n", ' ').Trim()
  $output = npx wrangler d1 execute $DatabaseName --remote --yes --json --command $normalizedSql 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "wrangler d1 execute failed with exit code $LASTEXITCODE`n$($output | Out-String)"
  }

  $text = ($output | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    throw 'wrangler d1 execute returned no JSON output'
  }

  try {
    $data = $text | ConvertFrom-Json
  } catch {
    throw "Failed to parse wrangler JSON output`n$text"
  }

  return [pscustomobject]@{
    Text = $text
    Data = $data
  }
}

function Get-ResultRows {
  param(
    [Parameter(Mandatory = $true)]
    $QueryResult
  )

  if (-not $QueryResult.Data) {
    return @()
  }

  $firstResult = @($QueryResult.Data)[0]
  if (-not $firstResult -or -not $firstResult.success) {
    throw 'wrangler d1 execute reported an unsuccessful query result'
  }

  return @($firstResult.results)
}

$tables = @(
  [pscustomobject]@{
    Name = 'raw_events'
    DateColumn = 'ts'
    OrderBy = 'id'
    Notes = 'Primary raw event log'
  },
  [pscustomobject]@{
    Name = 'canonical_events_v2'
    DateColumn = 'occurred_at'
    OrderBy = 'id'
    Notes = 'Normalized analytics event log'
  },
  [pscustomobject]@{
    Name = 'session_facts_v2'
    DateColumn = 'first_seen_at'
    OrderBy = 'first_seen_at'
    Notes = 'Derived session facts'
  },
  [pscustomobject]@{
    Name = 'visitor_facts_v2'
    DateColumn = 'first_seen_at'
    OrderBy = 'first_seen_at'
    Notes = 'Derived visitor facts'
  }
)

$workerRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$backupDir = Join-Path $workerRoot $OutputRoot
$labelDir = Join-Path $backupDir ("purge-candidates-$BackupLabel")

New-Item -ItemType Directory -Force -Path $labelDir | Out-Null

$cutoffQuery = Get-ResultRows (Invoke-D1JsonSql "SELECT datetime('now', '-$CutoffDays days') AS cutoff_at;")
$cutoffAt = [string]$cutoffQuery[0].cutoff_at
$cutoffDate = $cutoffAt.Substring(0, 10)

$manifest = [ordered]@{
  created_at = (Get-Date).ToString('o')
  database = $DatabaseName
  cutoff_days = $CutoffDays
  cutoff_at = $cutoffAt
  backup_dir = $labelDir
  tables = @()
}

foreach ($table in $tables) {
  Write-Output "Inspecting $($table.Name)..."
  $tableDir = Join-Path $labelDir $table.Name
  New-Item -ItemType Directory -Force -Path $tableDir | Out-Null

  $bucketSql = @"
SELECT substr($($table.DateColumn), 1, 10) AS bucket_date, COUNT(*) AS row_count
FROM $($table.Name)
WHERE datetime($($table.DateColumn)) < datetime('$cutoffAt')
GROUP BY 1
ORDER BY 1;
"@
  $bucketRows = Get-ResultRows (Invoke-D1JsonSql $bucketSql)

  $tableManifest = [ordered]@{
    table = $table.Name
    date_column = $table.DateColumn
    order_by = $table.OrderBy
    notes = $table.Notes
    bucket_count = @($bucketRows).Count
    total_rows = 0
    files = @()
  }

  foreach ($bucket in $bucketRows) {
    $bucketDate = [string]$bucket.bucket_date
    $expectedRows = [int]$bucket.row_count
    $nextDate = ([datetime]::ParseExact($bucketDate, 'yyyy-MM-dd', [System.Globalization.CultureInfo]::InvariantCulture)).AddDays(1).ToString('yyyy-MM-dd')
    $bucketEnd = if ($bucketDate -eq $cutoffDate) { $cutoffAt } else { $nextDate }

    Write-Output "Exporting $($table.Name) $bucketDate ($expectedRows rows)..."
    $exportSql = @"
SELECT *
FROM $($table.Name)
WHERE $($table.DateColumn) >= '$bucketDate'
  AND $($table.DateColumn) < '$bucketEnd'
ORDER BY $($table.OrderBy);
"@

    $exportResult = Invoke-D1JsonSql $exportSql
    $exportRows = Get-ResultRows $exportResult
    $actualRows = @($exportRows).Count
    if ($actualRows -ne $expectedRows) {
      throw ("Row count mismatch for {0} {1}: expected {2}, got {3}" -f $table.Name, $bucketDate, $expectedRows, $actualRows)
    }

    $filePath = Join-Path $tableDir ("$($table.Name)-$bucketDate.json")
  Write-Utf8NoBomFile -Path $filePath -Content $exportResult.Text
    $fileInfo = Get-Item -LiteralPath $filePath

    $tableManifest.total_rows += $actualRows
    $tableManifest.files += [ordered]@{
      date = $bucketDate
      row_count = $actualRows
      path = $filePath
      bytes = $fileInfo.Length
    }
  }

  $manifest.tables += $tableManifest
}

$manifestPath = Join-Path $labelDir 'manifest.json'
Write-Utf8NoBomFile -Path $manifestPath -Content ($manifest | ConvertTo-Json -Depth 8)

Write-Output "Backup complete: $labelDir"
Write-Output "Manifest: $manifestPath"