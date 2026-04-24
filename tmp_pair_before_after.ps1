Set-Location 'c:/Users/Wayne/Documents/GitHub/K4-Studios'

$beforeWap = Import-Csv internal-link-ownership-audit.csv | Where-Object { $_.Page -eq '/western-art-photography' }
$beforeWpa = Import-Csv internal-link-ownership-audit.csv | Where-Object { $_.Page -eq '/Western-Photography-Art' }

Write-Output "BEFORE_/western-art-photography=$($beforeWap.InboundLinkCount)"
Write-Output "BEFORE_/Western-Photography-Art=$($beforeWpa.InboundLinkCount)"

node tmp_internal_link_ownership_audit.mjs | Out-Null

$afterWap = Import-Csv internal-link-ownership-audit.csv | Where-Object { $_.Page -eq '/western-art-photography' }
$afterWpa = Import-Csv internal-link-ownership-audit.csv | Where-Object { $_.Page -eq '/Western-Photography-Art' }

Write-Output "AFTER_/western-art-photography=$($afterWap.InboundLinkCount)"
Write-Output "AFTER_/Western-Photography-Art=$($afterWpa.InboundLinkCount)"
