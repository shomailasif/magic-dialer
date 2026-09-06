# Magic Dialer logo generator - high-tech robot face with sound-wave dial.
# Draws with GDI+ (no tools needed), outputs PNG + ICO.
Add-Type -AssemblyName System.Drawing

$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$out  = Join-Path $base "assets"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$cyan   = [System.Drawing.Color]::FromArgb(34, 211, 238)
$violet = [System.Drawing.Color]::FromArgb(139, 92, 246)
$yellA  = [System.Drawing.Color]::FromArgb(251, 191, 36)
$bg     = [System.Drawing.Color]::FromArgb(11, 18, 32)
$panel  = [System.Drawing.Color]::FromArgb(15, 23, 42)
$border = [System.Drawing.Color]::FromArgb(51, 65, 85)
$white  = [System.Drawing.Color]::White

function Make-Pen($color, $width) {
  New-Object System.Drawing.Pen -ArgumentList @($color, [single]$width)
}
function Make-Solid($color) {
  New-Object System.Drawing.SolidBrush -ArgumentList @($color)
}

function Get-RoundedRectPath($rect, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $p.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $p.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $p.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

function New-LogoBitmap([int]$size) {
  $s = [single]$size / [single]512.0
  $bmp = New-Object System.Drawing.Bitmap -ArgumentList @($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  # background rounded square
  $xx = [single](8 * $s); $w2 = [single](496 * $s)
  $outer = New-Object System.Drawing.RectangleF -ArgumentList @($xx, $xx, $w2, $w2)
  $path = Get-RoundedRectPath $outer ([single](80 * $s))
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList @($outer, $panel, $bg, [single]90)
  $g.FillPath($bgBrush, $path)
  $g.DrawPath((Make-Pen $border ([single](6 * $s))), $path)

  # gradient aura circle (dial)
  $aura = New-Object System.Drawing.RectangleF -ArgumentList @([single](120 * $s), [single](136 * $s), [single](272 * $s), [single](272 * $s))
  $glow = New-Object System.Drawing.Drawing2D.PathGradientBrush -ArgumentList @($aura)
  $glow.CenterColor = $cyan
  $glow.SurroundColors = @($bg)
  $g.FillEllipse($glow, $aura)

  # robot head
  $headR = New-Object System.Drawing.RectangleF -ArgumentList @([single](166 * $s), [single](156 * $s), [single](180 * $s), [single](168 * $s))
  $head = Get-RoundedRectPath $headR ([single](56 * $s))
  $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList @($headR, $cyan, $violet, [single]45)
  $g.FillPath($grad, $head)
  $g.DrawPath((Make-Pen ([System.Drawing.Color]::FromArgb(255, 226, 232, 240)) ([single](3 * $s))), $head)

  # antenna
  $g.DrawLine((Make-Pen $cyan ([single](8 * $s))), [single](256 * $s), [single](110 * $s), [single](256 * $s), [single](168 * $s))
  $g.FillEllipse((Make-Pen $white), [single](238 * $s), [single](96 * $s), [single](36 * $s), [single](36 * $s))
  $g.FillEllipse((Make-Pen $yellA [single](4 * $s)), [single](238 * $s), [single](104 * $s), [single](36 * $s), [single](26 * $s))

  # eyes
  $eB = Make-Pen $bg
  $g.FillEllipse(Make-Pen $white, [single](196 * $s), [single](212 * $s), [single](34 * $s), [single](34 * $s))
  $g.FillEllipse(Make-Pen $white, [single](282 * $s), [single](212 * $s), [single](34 * $s), [single](34 * $s))
  $g.FillEllipse($eB, [single](196 * $s), [single](214 * $s), [single](34 * $s), [single](26 * $s))
  $g.FillEllipse($eB, [single](282 * $s), [single](214 * $s), [single](34 * $s), [single](26 * $s))

  # speaker smile
  $g.DrawArc((Make-Pen $white ([single](9 * $s))), [single](208 * $s), [single](244 * $s), [single](96 * $s), [single](54 * $s), 20, 140)

  # ear lights
  $g.FillEllipse(Make-Pen $cyan, [single](152 * $s), [single](240 * $s), [single](16 * $s), [single](16 * $s))
  $g.FillEllipse(Make-Pen $cyan, [single](344 * $s), [single](240 * $s), [single](16 * $s), [single](16 * $s))

  # sound-wave arcs (call energy)
  $waveC = Make-Pen $cyan ([single](10 * $s))
  $waveV = Make-Pen $violet ([single](10 * $s))
  $g.DrawArc($waveC, [single](80 * $s), [single](148 * $s), [single](120 * $s), [single](120 * $s), 30, 55)
  $g.DrawArc($waveV, [single](80 * $s), [single](270 * $s), [single](120 * $s), [single](120 * $s), -145, 55)
  $g.DrawArc($waveV, [single](312 * $s), [single](148 * $s), [single](120 * $s), [single](120 * $s), 95, 55)
  $g.DrawArc($waveC, [single](312 * $s), [single](270 * $s), [single](120 * $s), [single](120 * $s), 160, 55)

  $eB.Dispose(); $bgBrush.Dispose(); $grad.Dispose(); $glow.Dispose()
  $g.Dispose()
  return $bmp
}

$bmp512 = New-LogoBitmap 512
$bmp512.Save((Join-Path $out "logo-512.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp256 = New-LogoBitmap 256
$bmp256.Save((Join-Path $out "logo-256.png"), [System.Drawing.Imaging.ImageFormat]::Png)

$h = $bmp256.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($h)
$stream = [System.IO.File]::Create((Join-Path $out "logo.ico"))
$ico.Save($stream)
$stream.Close()

$bmp512.Dispose(); $bmp256.Dispose()
"--- assets ---"
Get-ChildItem $out | Select-Object Name, @{n='KB';e={[math]::Round($_.Length/1KB,1)}} | Format-Table -AutoSize