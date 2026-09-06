# Kick off a single test call from the cockpit button.
# Runs as its own short-lived process so the main agent heartbeat is untouched.
$exe = Join-Path $PSScriptRoot "MagicDialer.exe"
if (Test-Path -LiteralPath $exe) {
  $env:MAGICDIALER_NO_COCKPIT = "1"
  & $exe --call
}