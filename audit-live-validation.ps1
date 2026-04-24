# K4 Studios Doorway Page Live Validation Script
# Checks 29 remaining pages for technical + SEO criteria

$baseUrl = "https://www.k4studios.com"
$sitemapUrl = "https://www.k4studios.com/sitemap.xml"

$pages = @(
    "/American-Western-Art",
    "/Contemporary-Western-Art",
    "/Cowboy-Fine-Art-Photography",
    "/Fine-Art-Photography-of-the-American-West",
    "/Historical-Western-Art",
    "/Narrative-Western-Art",
    "/Painterly-Western-Photography",
    "/Western-Cowboy-Photography",
    "/Western-Fine-Art-Photography",
    "/Western-Frontier-Art",
    "/Western-Photography-Art",
    "/Western-Wall-Art",
    "/Modern-Western-Interior-Design-Art",
    "/Western-Interior-Design-Art",
    "/Western-Wall-Art-for-Interior-Designers",
    "/Rustic-Western-Interior-Design-Art",
    "/Western-Black-and-White-Photography",
    "/western-landscape-art",
    "/western-photos",
    "/western-portrait-photography",
    "/old-western-art",
    "/vintage-western-art",
    "/western-art-photography",
    "/western-artwork",
    "/Western-Photography-Prints",
    "/historical-fine-art-photography-collection",
    "/western-fine-art-photography-collection",
    "/Other/Narrative-Art"
)

Write-Host "Fetching sitemap..." -ForegroundColor Cyan
try {
    $sitemapContent = (curl.exe -s $sitemapUrl)
} catch {
    Write-Host "ERROR: Could not fetch sitemap" -ForegroundColor Red
    $sitemapContent = ""
}

$results = @()

foreach ($page in $pages) {
    $fullUrl = "$baseUrl$page"
    Write-Host "Checking: $page" -ForegroundColor Yellow
    
    try {
        # Fetch page with curl, capture headers and body
        $response = curl.exe -s -i $fullUrl 2>&1 | Out-String
        
        # Extract status code
        $statusLine = ($response | Select-String "^HTTP" | Select-Object -First 1).Line
        $statusCode = if ($statusLine -match "(\d{3})") { [int]$matches[1] } else { 0 }
        
        # Extract final URL (from location header if redirected)
        $locationHeader = ($response | Select-String "^location:" -CaseSensitive:$false | Select-Object -First 1).Line
        $finalUrl = if ($locationHeader -match "location:\s*(.+)$") { $matches[1].Trim() } else { $fullUrl }
        
        # Check if final URL uses www
        $usesWww = $finalUrl -match "https://www\."
        
        # Extract body (after headers)
        $bodyStart = $response.IndexOf("`r`n`r`n")
        $body = if ($bodyStart -gt 0) { $response.Substring($bodyStart + 4) } else { $response }
        
        # Extract title
        $title = if ($body -match "<title[^>]*>([^<]+)</title>") { $matches[1] } else { "NOT FOUND" }
        
        # Extract meta description
        $metaDesc = if ($body -match '<meta\s+name="description"\s+content="([^"]+)"') { $matches[1] } 
                   elseif ($body -match '<meta\s+content="([^"]+)"\s+name="description"') { $matches[1] }
                   else { "NOT FOUND" }
        
        # Extract H1
        $h1 = if ($body -match "<h1[^>]*>([^<]+)</h1>") { $matches[1] } else { "NOT FOUND" }
        
        # Extract canonical
        $canonical = if ($body -match '<link\s+rel="canonical"\s+href="([^"]+)"') { $matches[1] }
                    elseif ($body -match '<link\s+href="([^"]+)"\s+rel="canonical"') { $matches[1] }
                    else { "NOT FOUND" }
        
        # Check for noindex
        $noindex = ($body -match '<meta\s+name="robots"\s+content="[^"]*noindex') -or ($body -match '<meta\s+name="robots"\s+content="noindex')
        
        # Count words (rough estimate: split on whitespace, remove HTML tags)
        $textContent = $body -replace "<[^>]+>", " " -replace "\s+", " "
        $wordCount = ($textContent.Split(" ") | Where-Object { $_.Length -gt 0 } | Measure-Object).Count
        
        # Check sitemap inclusion
        $inSitemap = $sitemapContent -match [regex]::Escape("$page</loc>") -or $sitemapContent -match [regex]::Escape("$page<")
        
        # Check if canonical is self-referential and www
        $canonicalOk = ($canonical -eq "$baseUrl$page") -or ($canonical -eq "$finalUrl") -or ($canonical -match [regex]::Escape($page))
        $canonicalUsesWww = $canonical -match "https://www\."
        
        $results += [PSCustomObject]@{
            Page = $page
            StatusCode = $statusCode
            FinalUrl = $finalUrl
            UsesWww = $usesWww
            Title = $title
            MetaDesc = $metaDesc
            H1 = $h1
            Canonical = $canonical
            CanonicalOk = $canonicalOk
            CanonicalUsesWww = $canonicalUsesWww
            NoIndex = $noindex
            InSitemap = $inSitemap
            WordCount = $wordCount
            TechPass = ($statusCode -eq 200 -and $usesWww -and $canonicalOk -and $inSitemap -and $wordCount -gt 2500 -and !$noindex)
        }
        
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
        $results += [PSCustomObject]@{
            Page = $page
            StatusCode = "ERROR"
            FinalUrl = "ERROR"
            UsesWww = $false
            Title = "ERROR"
            MetaDesc = "ERROR"
            H1 = "ERROR"
            Canonical = "ERROR"
            CanonicalOk = $false
            CanonicalUsesWww = $false
            NoIndex = $true
            InSitemap = $false
            WordCount = 0
            TechPass = $false
        }
    }
}

Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan

# Summary
$passCount = ($results | Where-Object { $_.TechPass }).Count
$failCount = ($results | Where-Object { !$_.TechPass }).Count

Write-Host "TECHNICAL PASS: $passCount / $($results.Count)" -ForegroundColor Green
Write-Host "TECHNICAL FAIL: $failCount / $($results.Count)" -ForegroundColor Red

Write-Host "`n=== FAILED PAGES ===" -ForegroundColor Red
$results | Where-Object { !$_.TechPass } | ForEach-Object {
    Write-Host "$($_.Page): Status=$($_.StatusCode) | WWW=$($_.UsesWww) | Canonical=$($_.CanonicalOk) | Sitemap=$($_.InSitemap) | Words=$($_.WordCount) | NoIndex=$($_.NoIndex)"
}

Write-Host "`n=== PASSED PAGES ===" -ForegroundColor Green
$results | Where-Object { $_.TechPass } | ForEach-Object {
    Write-Host "$($_.Page)"
}

# Export to CSV for review
$results | Export-Csv -Path "audit-results.csv" -NoTypeInformation
Write-Host "`nFull results exported to: audit-results.csv" -ForegroundColor Cyan

# Return results for further processing
$results | Format-Table Page, StatusCode, TechPass, WordCount, InSitemap -AutoSize
