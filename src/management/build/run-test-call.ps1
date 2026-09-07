# Kick off a single test call from the cockpit button. Runs one audible call
# with a LIVE transcript in this window, then pauses so you can read it.
$exe = Join-Path $PSScriptRoot "MagicDialer.exe"
if (-not (Test-Path -LiteralPath $exe)) { Write-Host "MagicDialer.exe not found next to this script." -ForegroundColor Red; Read-Host "Press Enter to close"; exit 1 }
$env:MAGICDIALER_NO_COCKPIT = "1"
& $exe --call-once
Write-Host ""
Write-Host "Test call finished." -ForegroundColor Green
Read-Host "Press Enter to close this window"