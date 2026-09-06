# Rasterize Magic Dialer logo.svg to PNG sizes and build the .ico
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$assets = Split-Path -Parent $MyInvocation.MyCommand.Path
$svg = [System.Uri]::new((Join-Path $assets "logo.svg")).AbsoluteUri

function Find-Browser {
  $cands = @(
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
  )
  foreach ($c in $cands) { if (Test-Path -LiteralPath $c) { return $c } }
  return $null
}

$browser = Find-Browser
if (-not $browser) { throw "No Edge/Chrome found to render the SVG." }

foreach ($sz in @(512, 256)) {
  $out = Join-Path $assets "logo-$sz.png"
  & $browser --headless --disable-gpu --hide-scrollbars --window-size=$sz,$sz "--screenshot=$out" $svg 2>$null | Out-Null
  Start-Sleep -Milliseconds 600
  if (Test-Path -LiteralPath $out) {
    "logo-$sz.png : " + [math]::Round((Get-Item $out).Length / 1KB, 1) + " KB"
  } else {
    throw "screenshot failed for $sz"
  }
}

# ICO from the 256 png
$bmp = [System.Drawing.Bitmap]::FromFile((Join-Path $assets "logo-256.png"))
$h = $bmp.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($h)
$fs = [System.IO.File]::Create((Join-Path $assets "logo.ico"))
$ico.Save($fs)
$fs.Close()
$bmp.Dispose()
"logo.ico : " + [math]::Round((Get-Item (Join-Path $assets "logo.ico")).Length / 1KB, 1) + " KB"