# Update the public GitHub release asset (MagicDialer-Setup.exe) to the newest build.
# Uses the git credential cache (in-memory only, never printed).
$ErrorActionPreference = "Stop"
$repo = "shomailasif/magic-dialer"
$tag = "v1.0"
$setup = "C:\Users\USER\Documents\Default Project\autodial-ai\src\management\build\dist\MagicDialer-Setup.exe"

# Read token from the operator's local token file without printing it.
$token = (Get-Content -Raw "$env:LOCALAPPDATA\Temp\opencode\gh-token.txt").Trim()

$headers = @{ Authorization = "token $token"; Accept = "application/vnd.github+json" }

# 1. Find the release.
$rel = Invoke-RestMethod -Headers $headers -Uri "https://api.github.com/repos/$repo/releases/tags/$tag"
"release: $($rel.name)  id=$($rel.id)"

# 2. Delete the existing asset with the same name (if any).
$existing = $rel.assets | Where-Object { $_.name -eq "MagicDialer-Setup.exe" }
if ($existing) {
  Invoke-RestMethod -Method Delete -Headers $headers -Uri $existing.url | Out-Null
  "deleted old asset: $($existing.id)"
}

# 3. Upload the new one.
$bytes = [System.IO.File]::ReadAllBytes($setup)
$uploadUri = "https://uploads.github.com/repos/$repo/releases/$($rel.id)/assets?name=MagicDialer-Setup.exe"
$up = Invoke-RestMethod -Method Post -Headers $headers -ContentType "application/octet-stream" -Body $bytes -Uri $uploadUri
"uploaded asset id=$($up.id) size=$([math]::Round($up.size/1MB,1))MB"

# 4. Verify it is publicly downloadable.
$url = "https://github.com/$repo/releases/download/$tag/MagicDialer-Setup.exe"
$ok = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 60
"public URL status: $($ok.StatusCode)"
"DOWNLOAD: $url"