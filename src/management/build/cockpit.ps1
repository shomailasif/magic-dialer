# MAGIC DIALER - Agent Console (professional operations dashboard)
# Reads the agent's live state from %USERPROFILE%\.magicdialer\status.json.
# ASCII-only (PowerShell 5.1 reads non-ASCII badly).
$ErrorActionPreference = "Continue"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$cfgDir     = Join-Path $env:USERPROFILE ".magicdialer"
$statusFile = Join-Path $cfgDir "status.json"
$logoFile   = Join-Path $PSScriptRoot "logo-256.png"
$iconFile   = Join-Path $PSScriptRoot "logo.ico"
$agentExe   = Join-Path $PSScriptRoot "MagicDialer.exe"
$testRunner = Join-Path $PSScriptRoot "run-test-call.ps1"

# ---- business palette (matches the web console) ----
$cBg      = [System.Drawing.Color]::FromArgb(6, 9, 18)
$cPanel   = [System.Drawing.Color]::FromArgb(11, 18, 32)
$cPanel2  = [System.Drawing.Color]::FromArgb(15, 23, 42)
$cBorder  = [System.Drawing.Color]::FromArgb(30, 41, 59)
$cCyan    = [System.Drawing.Color]::FromArgb(34, 211, 238)
$cViolet  = [System.Drawing.Color]::FromArgb(139, 92, 246)
$cAmber   = [System.Drawing.Color]::FromArgb(251, 191, 36)
$cGreen   = [System.Drawing.Color]::FromArgb(52, 211, 153)
$cRed     = [System.Drawing.Color]::FromArgb(248, 113, 113)
$cText    = [System.Drawing.Color]::FromArgb(226, 232, 240)
$cDim     = [System.Drawing.Color]::FromArgb(148, 163, 184)

function New-Pen($color, [single]$w) { New-Object System.Drawing.Pen -ArgumentList @($color, $w) }
function New-Solid($color) { New-Object System.Drawing.SolidBrush -ArgumentList @($color) }

# ---- state ----
$ui = @{ status = "STARTING"; mode = "idle"; line = "Connecting..."; ts = 0; product = ""; machineId = ""; company = ""; version = ""; stats = $null; strategy = $null; logs = @() }
$phase = 0
$blink = 0
$testRunning = $false

function Read-Status {
  try {
    if (Test-Path -LiteralPath $statusFile) {
      $s = Get-Content -LiteralPath $statusFile -Raw | ConvertFrom-Json
      foreach ($k in @("status","mode","line","product","machineId","company","version")) {
        if ($s.PSObject.Properties.Name -contains $k -and $s.$k) { $ui.$k = $s.$k }
      }
      if ($s.PSObject.Properties.Name -contains "ts") { $ui.ts = [long]$s.ts }
      if ($s.PSObject.Properties.Name -contains "stats" -and $null -ne $s.stats) { $ui.stats = $s.stats }
      if ($s.PSObject.Properties.Name -contains "strategy" -and $null -ne $s.strategy) { $ui.strategy = $s.strategy }
      if ($s.PSObject.Properties.Name -contains "logs") { $ui.logs = @($s.logs) }
    }
  } catch {}
}

function New-Card($parent, $x, $y, $w, $h) {
  $p = New-Object System.Windows.Forms.Panel
  $p.Location = New-Object System.Drawing.Point($x, $y)
  $p.Size = New-Object System.Drawing.Size($w, $h)
  $p.BackColor = $cPanel2
  $p.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
  $parent.Controls.Add($p)
  return $p
}

function New-CardLabel($parent, $x, $y, $w, $text, $col, $size, $style, $align, $auto) {
  $l = New-Object System.Windows.Forms.Label
  $l.Text = $text
  $l.Location = New-Object System.Drawing.Point($x, $y)
  $l.Size = New-Object System.Drawing.Size($w, 22)
  $l.ForeColor = $col
  $l.Font = New-Object System.Drawing.Font("Segoe UI", $size, $style)
  $l.TextAlign = $align
  $l.AutoSize = $auto
  $parent.Controls.Add($l)
  return $l
}

# ---- form (940 x 660) ----
$form = New-Object System.Windows.Forms.Form
$form.Text = "Magic Dialer - Agent Console"
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedSingle"
$form.MaximizeBox = $false
$form.BackColor = $cBg
$form.ClientSize = New-Object System.Drawing.Size(940, 660)
if (Test-Path -LiteralPath $iconFile) {
  $form.Icon = New-Object System.Drawing.Icon($iconFile)
}

# ---- header ----
$logoBox = New-Object System.Windows.Forms.PictureBox
$logoBox.Location = New-Object System.Drawing.Point(24, 20)
$logoBox.Size = New-Object System.Drawing.Size(48, 48)
$logoBox.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
if (Test-Path -LiteralPath $logoFile) { $logoBox.Image = [System.Drawing.Image]::FromFile($logoFile) }
$form.Controls.Add($logoBox)

$title = New-Object System.Windows.Forms.Label
$title.Text = "MAGIC DIALER"
$title.Location = New-Object System.Drawing.Point(88, 14)
$title.Size = New-Object System.Drawing.Size(320, 30)
$title.ForeColor = $cCyan
$title.Font = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($title)

$subTitle = New-Object System.Windows.Forms.Label
$subTitle.Text = "AI AGENT CONSOLE"
$subTitle.Location = New-Object System.Drawing.Point(90, 44)
$subTitle.Size = New-Object System.Drawing.Size(380, 18)
$subTitle.ForeColor = $cDim
$subTitle.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$subTitle.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
$form.Controls.Add($subTitle)

$lblCompany = New-Object System.Windows.Forms.Label
$lblCompany.Location = New-Object System.Drawing.Point(90, 62)
$lblCompany.Size = New-Object System.Drawing.Size(420, 18)
$lblCompany.ForeColor = $cViolet
$lblCompany.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblCompany)

# status pill (top right)
$statusCard = New-Object System.Windows.Forms.Label
$statusCard.Location = New-Object System.Drawing.Point(756, 18)
$statusCard.Size = New-Object System.Drawing.Size(160, 42)
$statusCard.BackColor = $cPanel2
$statusCard.ForeColor = $cAmber
$statusCard.Text = "STARTING"
$statusCard.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$statusCard.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($statusCard)

$lblVersion = New-Object System.Windows.Forms.Label
$lblVersion.Location = New-Object System.Drawing.Point(756, 64)
$lblVersion.Size = New-Object System.Drawing.Size(160, 16)
$lblVersion.ForeColor = $cDim
$lblVersion.Text = ""
$lblVersion.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$lblVersion.Font = New-Object System.Drawing.Font("Segoe UI", 8)
$form.Controls.Add($lblVersion)

# ---- KPI row ----
$kpiTitles = @("CALLS TODAY", "QUALIFIED TODAY", "QUALIFY RATE", "LAST SCORE")
$kpiValues = @()
for ($i = 0; $i -lt 4; $i++) {
  $x = 24 + $i * 220
  $card = New-Card $form $x 104 208 68
  New-CardLabel $card 12 34 184 $kpiTitles[$i] $cDim 8 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleCenter) $false | Out-Null
  New-CardLabel $card 12 8 184 "-" $cText 20 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleCenter) $false | ForEach-Object { $kpiValues += $_ }
}

# ---- left card: live operational status ----
$mainCard = New-Card $form 24 188 560 350

New-CardLabel $mainCard 24 14 100 "MODE" $cDim 8 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleLeft) $false | Out-Null
$lblMode = New-CardLabel $mainCard 24 32 512 "SYSTEM READY" $cText 15 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleLeft) $false

New-CardLabel $mainCard 24 66 100 "STATUS" $cDim 8 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleLeft) $false | Out-Null
$lblLine = New-CardLabel $mainCard 24 84 512 "" $cDim 9 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.ContentAlignment]::MiddleLeft) $true

# divider
$lblStrategy = New-CardLabel $mainCard 24 138 120 "STRATEGY" $cDim 8 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleLeft) $false
$lblStrategy.Text = "PREPARED WITH"
$lblStrategyVal = New-CardLabel $mainCard 24 158 512 "Analyzing best-performing tactics..." $cViolet 9 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.ContentAlignment]::MiddleLeft) $true

New-CardLabel $mainCard 24 224 80 "AGENT ID" $cDim 8 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleLeft) $false | Out-Null
$lblAgentId = New-CardLabel $mainCard 24 242 512 "" $cText 8 ([System.Drawing.FontStyle]::Regular) ([System.Drawing.ContentAlignment]::MiddleLeft) $false

# live signal area (bottom of left card)
New-CardLabel $mainCard 24 276 120 "LIVE SIGNAL" $cDim 8 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleLeft) $false | Out-Null
$lblSignal = New-CardLabel $mainCard 300 268 236 "idle" $cGreen 8 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleRight) $false

# ---- right card: activity log ----
$logCard = New-Card $form 596 188 320 350
New-CardLabel $logCard 16 12 200 "ACTIVITY LOG" $cDim 8 ([System.Drawing.FontStyle]::Bold) ([System.Drawing.ContentAlignment]::MiddleLeft) $false | Out-Null
$lstActivity = New-Object System.Windows.Forms.ListBox
$lstActivity.Location = New-Object System.Drawing.Point(16, 34)
$lstActivity.Size = New-Object System.Drawing.Size(288, 300)
$lstActivity.BackColor = $cBg
$lstActivity.ForeColor = $cText
$lstActivity.BorderStyle = [System.Windows.Forms.BorderStyle]::None
$lstActivity.Font = New-Object System.Drawing.Font("Consolas", 9)
$logCard.Controls.Add($lstActivity)

# ---- bottom bar ----
$ticker = New-Object System.Windows.Forms.Label
$ticker.Location = New-Object System.Drawing.Point(24, 552)
$ticker.Size = New-Object System.Drawing.Size(600, 40)
$ticker.ForeColor = $cGreen
$ticker.Font = New-Object System.Drawing.Font("Consolas", 10)
$form.Controls.Add($ticker)

$btnTest = New-Object System.Windows.Forms.Button
$btnTest.Text = "Run a test call"
$btnTest.Location = New-Object System.Drawing.Point(756, 548)
$btnTest.Size = New-Object System.Drawing.Size(160, 40)
$btnTest.BackColor = $cPanel2
$btnTest.ForeColor = $cText
$btnTest.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnTest.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($btnTest)

$btnTest.Add_Click({
  if ($testRunning) { return }
  $testRunning = $true
  $btnTest.Enabled = $false
  $ticker.ForeColor = $cAmber
  $ticker.Text = "> Starting test call... listen out for the AI."
  if (Test-Path -LiteralPath $testRunner) {
    try { Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File",$testRunner) } catch {}
  } elseif (Test-Path -LiteralPath $agentExe) {
    try { Start-Process -FilePath $agentExe -ArgumentList @("--call-once") -WorkingDirectory $PSScriptRoot } catch {}
  }
  Start-Sleep -Milliseconds 9000
  $testRunning = $false
  $btnTest.Enabled = $true
  $ticker.ForeColor = $cGreen
})

# ---- console renderer (professional equalizer, no cartoon) ----
function Update-Console([System.Drawing.Graphics]$g) {
  $bx = 32; $by = 304; $barW = 10; $gap = 14; $bars = 30
  $active = ($ui.mode -eq "listening" -or $ui.mode -eq "speaking" -or $ui.mode -eq "calling")

  # status dot + subtle pulse ring (top-left of the signal strip)
  $cDot = if ($ui.status -eq "ONLINE") { $cGreen } elseif ($ui.status -eq "OFFLINE" -or $ui.status -eq "DISABLED") { $cRed } else { $cAmber }
  $dotX = 34; $dotY = 208
  if ($active) {
    $ringR = 12 + 8 * (0.5 + 0.5 * [math]::Sin($phase / 5.0))
    $g.DrawEllipse((New-Pen ([System.Drawing.Color]::FromArgb(90, $cDot.R, $cDot.G, $cDot.B)) 2), [single]($dotX - $ringR), [single]($dotY - $ringR), [single]($ringR * 2), [single]($ringR * 2))
  }
  $g.FillEllipse((New-Solid $cDot), [single]($dotX - 6), [single]($dotY - 6), 12, 12)

  # thin baseline
  $g.DrawLine((New-Pen $cBorder 1), [single]$bx, [single]($by + 34), [single]($bx + $bars * $gap - $gap + $barW), [single]($by + 34))

  # equalizer
  $segCols = @($cCyan, $cViolet)
  for ($i = 0; $i -lt $bars; $i++) {
    $bh = 4
    if ($ui.mode -eq "listening") { $bh = 8 + 26 * [math]::Abs([math]::Sin($phase / 3.0 + $i * 0.55)) }
    elseif ($ui.mode -eq "speaking") { $bh = 6 + 18 * [math]::Abs([math]::Sin($phase / 5.0 + $i * 0.4)) }
    elseif ($ui.mode -eq "calling") { $bh = 5 + 6 * [math]::Sin($phase / 4.0 + $i) }
    else { $bh = 3.5 + 2.5 * [math]::Sin($phase / 9.0 + $i * 0.6) }
    if ($bh -lt 3) { $bh = 3 }
    $col = $segCols[$i % 2]
    $op = if ($active) { 230 } else { 130 }
    $bCol = [System.Drawing.Color]::FromArgb($op, $col.R, $col.G, $col.B)
    $g.FillRectangle((New-Solid $bCol), [single]($bx + $i * $gap), [single]($by + 34 - $bh), [single]$barW, [single]$bh)
  }
  $g.Dispose()
}

$mainCard.Add_Paint({ param($s, $e) Update-Console($e.Graphics) })

# ---- states -> labels ----
function Update-Labels {
  $statusText = $ui.status.ToUpper()
  $stCol = $cAmber
  switch ($statusText) {
    "ONLINE"   { $stCol = $cGreen;   $statusCard.BackColor = [System.Drawing.Color]::FromArgb(6, 40, 28) }
    "OFFLINE"  { $stCol = $cRed;     $statusCard.BackColor = [System.Drawing.Color]::FromArgb(48, 16, 20) }
    "DISABLED" { $stCol = $cRed;     $statusCard.BackColor = [System.Drawing.Color]::FromArgb(48, 16, 20) }
    "CALLING"  { $stCol = $cAmber;   $statusCard.BackColor = [System.Drawing.Color]::FromArgb(48, 38, 10) }
    default    { $stCol = $cAmber;   $statusCard.BackColor = [System.Drawing.Color]::FromArgb(48, 38, 10) }
  }
  $statusCard.ForeColor = $stCol
  $statusCard.Text = $statusText

  switch ($ui.mode) {
    "listening" { $lblMode.Text = "Listening to a call";  $lblMode.ForeColor = $cCyan;   $lblSignal.Text = "listening"; $lblSignal.ForeColor = $cCyan }
    "speaking"  { $lblMode.Text = "AI speaking";          $lblMode.ForeColor = $cViolet; $lblSignal.Text = "speaking"; $lblSignal.ForeColor = $cViolet }
    "calling"   { $lblMode.Text = "Calling a lead";       $lblMode.ForeColor = $cAmber;  $lblSignal.Text = "calling";  $lblSignal.ForeColor = $cAmber }
    default     { $lblMode.Text = "System ready";         $lblMode.ForeColor = $cGreen;  $lblSignal.Text = "idle";     $lblSignal.ForeColor = $cGreen }
  }

  if ($ui.strategy) {
    $lblStrategyVal.Text = $ui.strategy.name + " - " + $ui.strategy.source
  }

  if ($ui.company) { $lblCompany.Text = $ui.company.ToUpper() } else { $lblCompany.Text = "" }
  if ($ui.version) { $lblVersion.Text = "v" + $ui.version }
  if ($ui.machineId) { $lblAgentId.Text = $ui.machineId } else { $lblAgentId.Text = "" }
  if ($ui.line) { $ticker.Text = "> " + $ui.line }

  if ($ui.stats) {
    $vals = @(
      [string]$ui.stats.today,
      [string]$ui.stats.qualifiedToday,
      [string]($ui.stats.qualifiedRate.ToString() + "%"),
      [string]$ui.stats.lastScore
    )
    for ($i = 0; $i -lt $vals.Count; $i++) { $kpiValues[$i].Text = $vals[$i] }
  }

  $stale = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $ui.ts) > 25000
  if ($stale -and $ui.ts -ne 0) {
    $statusCard.ForeColor = $cRed
    $statusCard.Text = "OFFLINE"
    $lblSignal.Text = "offline"
    $lblSignal.ForeColor = $cRed
  }
}

# ---- timer ----
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 250
$lastLogKey = ""
$timer.Add_Tick({
  $script:phase++
  if ($phase % 4 -eq 0) { $script:blink++ }
  Read-Status
  Update-Labels
  $mainCard.Invalidate()

  $key = ""
  foreach ($e in $ui.logs) { $key += $e.msg + "|" }
  if ($key -ne $lastLogKey) {
    $lastLogKey = $key
    $lstActivity.Items.Clear()
    foreach ($e in $ui.logs) {
      $t = ""
      if ($e.at) { try { $t = ([datetime]::Parse($e.at).ToLocalTime()).ToString("HH:mm") } catch {} }
      [void]$lstActivity.Items.Add(($t + "  " + $e.msg))
    }
  }
})
$timer.Start()

Read-Status
Update-Labels

[void]$form.ShowDialog()