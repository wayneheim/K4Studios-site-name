Set-Location 'c:/Users/Wayne/Documents/GitHub/K4-Studios'

$urls = @(
  'https://www.k4studios.com/western-art-photography',
  'https://www.k4studios.com/Western-Photography-Art'
)

foreach ($u in $urls) {
  $html = curl.exe -sL $u
  $headers = curl.exe -sI $u
  $status = ($headers | Select-String '^HTTP/' | Select-Object -First 1).Line
  $canon = ([regex]::Match($html, '<link[^>]+rel=["'']canonical["''][^>]+href=["'']([^"'']+)["'']', 'IgnoreCase')).Groups[1].Value
  $title = ([regex]::Match($html, '<title>(.*?)</title>', 'IgnoreCase,Singleline')).Groups[1].Value.Trim()
  $metaDesc = ([regex]::Match($html, '<meta[^>]+name=["'']description["''][^>]+content=["'']([^"'']+)["'']', 'IgnoreCase')).Groups[1].Value
  $h1Count = [regex]::Matches($html, '<h1\b', 'IgnoreCase').Count
  $noindex = [regex]::IsMatch($html, '<meta[^>]+name=["'']robots["''][^>]+content=["''][^"'']*noindex', 'IgnoreCase')
  $final = curl.exe -s -o NUL -w "%{url_effective}" $u
  $hasWrongCanon = ($canon -eq 'https://www.k4studios.com/Western-Photography-Art') -and ($u -like '*western-art-photography')

  Write-Output "URL=$u"
  Write-Output "STATUS=$status"
  Write-Output "FINAL=$final"
  Write-Output "CANONICAL=$canon"
  Write-Output "H1_COUNT=$h1Count"
  Write-Output "TITLE=$title"
  Write-Output "META=$metaDesc"
  Write-Output "NOINDEX=$noindex"
  Write-Output "WRONG_CANONICAL_BACK_TO_WPA=$hasWrongCanon"

  $links = @(
    '/Western-Photography-Art',
    '/Western-Fine-Art-Photography',
    '/Narrative-Western-Art',
    '/Western-Photography-Prints',
    '/western-art-photography'
  )

  foreach ($link in $links) {
    $needle = 'href="' + $link + '"'
    $count = [regex]::Matches($html, [regex]::Escape($needle), 'IgnoreCase').Count
    Write-Output "LINK_$link=$count"
  }

  Write-Output '---'
}

$wpaHtml = curl.exe -sL 'https://www.k4studios.com/Western-Photography-Art'
$backCount = [regex]::Matches($wpaHtml, 'href="/western-art-photography"', 'IgnoreCase').Count
Write-Output "WPA_BACKLINK_COUNT=$backCount"
