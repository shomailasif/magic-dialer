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
$ticker.Location = New-Object System.Drawing.Point(24, 500)
$ticker.Size = New-Object System.Drawing.Size(912, 32)
$ticker.ForeColor = $cGreen
$ticker.Font = New-Object System.Drawing.Font("Consolas", 10)
$form.Controls.Add($ticker)

function Get-NumE164([string]$raw) {
  $d = ($raw -replace '\D', "")
  if ($d.Length -lt 10) { return "" }
  if ($d.Length -ge 12 -and $d.StartsWith("00")) { $d = $d.Substring(2) }
  elseif ($d.Length -eq 11 -and $d.StartsWith("0")) { $d = "92" + $d.Substring(1) }
  elseif ($d.Length -eq 10) { $d = "1" + $d }
  return "+" + $d
}
function Go-Get([string]$url) {
  $r = [System.Net.HttpWebRequest]::Create($url)
  $r.Method = "GET"; $r.Timeout = 20000
  $rr = $r.GetResponse()
  try { return (New-Object IO.StreamReader($rr.GetResponseStream())).ReadToEnd() } finally { $rr.Close() }
}

# ---- auto-dialer: START -> dials the list for hours, STOP -> stops ----
$script:autoActive = $false
$cfgMain = $null
try { $cfgMain = Get-Content -LiteralPath (Join-Path $cfgDir "config.json") -Raw | ConvertFrom-Json } catch {}
$script:token  = if ($cfgMain) { [string]$cfgMain.token } else { "" }
$script:portal = if ($cfgMain) { [string]$cfgMain.portalUrl } else { "" }
$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "START AUTO-CALLS"
$btnStart.Location = New-Object System.Drawing.Point(24, 548)
$btnStart.Size = New-Object System.Drawing.Size(150, 40)
$btnStart.BackColor = [System.Drawing.Color]::FromArgb(10, 96, 54); $btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnStart.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = "STOP"
$btnStop.Location = New-Object System.Drawing.Point(184, 548)
$btnStop.Size = New-Object System.Drawing.Size(140, 40)
$btnStop.BackColor = [System.Drawing.Color]::FromArgb(120, 24, 32); $btnStop.ForeColor = [System.Drawing.Color]::White
$btnStop.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnStop.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$btnStop.Enabled = $false
$form.Controls.Add($btnStop)

$btnStart.Add_Click({
  if ($script:autoActive) { return }
  $cfg0 = Get-Cfg
  $nums = @()
  foreach ($n in @($cfg0.callList)) { $e = Get-NumE164 ([string]$n); if ($e) { $nums += $e } }
  if ($nums.Count -eq 0) { $ticker.ForeColor = $cRed; $ticker.Text = "> No numbers. Add numbers in Manage first."; return }
  $script:autoActive = $true
  $btnStart.Enabled = $false; $btnStop.Enabled = $true
  try {
    $json = @{ token = $script:token; numbers = $nums } | ConvertTo-Json -Compress -Depth 4
    $cc = New-Object System.Net.CookieContainer
    $null = Post-JsonBody ($script:portal + "/api/autocall") $json $cc
    $ticker.ForeColor = $cCyan; $ticker.Text = "> AUTO-DIALING started - $($nums.Count) numbers queued. Press STOP anytime."
  } catch {
    $ticker.ForeColor = $cRed; $ticker.Text = "> Start failed: " + $_.Exception.Message
    $script:autoActive = $false; $btnStart.Enabled = $true; $btnStop.Enabled = $false
  }
})

$btnStop.Add_Click({
  if (-not $script:autoActive) { return }
  try {
    $json = @{ token = $script:token } | ConvertTo-Json -Compress
    $cc = New-Object System.Net.CookieContainer
    $null = Post-JsonBody ($script:portal + "/api/autocall/stop") $json $cc
  } catch {}
  $ticker.ForeColor = $cRed; $ticker.Text = "> STOPPING - finishing the current call..."
  $btnStop.Enabled = $false
})

$autoTimer = New-Object System.Windows.Forms.Timer
$autoTimer.Interval = 2500
$autoTimer.Add_Tick({
  if (-not $script:autoActive) { return }
  try {
    $s = Go-Get ($script:portal + "/api/autocall/status?token=" + [Uri]::EscapeDataString($script:token))
    $j = $s | ConvertFrom-Json
    if ($j.ok) {
      $b = $j.batch
      if ($b.running) {
        $ticker.ForeColor = $cCyan
        if ($b.current) { $ticker.Text = "> Calling $($b.current.number)  [$($b.done)/$($b.total)]" }
        else { $ticker.Text = "> Auto-dialing...  [$($b.done)/$($b.total) called]" }
      } else {
        $script:autoActive = $false; $btnStart.Enabled = $true; $btnStop.Enabled = $false
        $ticker.ForeColor = $cGreen; $ticker.Text = "> Finished: $($b.done)/$($b.total) numbers processed. Press START to run again."
      }
    }
  } catch {}
})
$autoTimer.Start()

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

# ======================= Manage agent =======================
$btnManage = New-Object System.Windows.Forms.Button
$btnManage.Text = "Manage"
$btnManage.Location = New-Object System.Drawing.Point(588, 548)
$btnManage.Size = New-Object System.Drawing.Size(152, 40)
$btnManage.BackColor = $cPanel2
$btnManage.ForeColor = $cViolet
$btnManage.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnManage.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($btnManage)

function Get-Cfg { try { Get-Content -LiteralPath (Join-Path $cfgDir "config.json") -Raw | ConvertFrom-Json } catch { $null } }

function Post-JsonBody([string]$url, [string]$json, [System.Net.CookieContainer]$cc, [string]$method) {
  if (-not $method) { $method = "POST" }
  $req = [System.Net.HttpWebRequest]::Create($url)
  $req.Method = $method.ToUpper()
  $req.ContentType = "application/json"
  $req.CookieContainer = $cc
  $req.Timeout = 30000
  if ($json) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $req.ContentLength = $bytes.Length
    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
  }
  $resp = $req.GetResponse()
  $rd = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
  $body = $rd.ReadToEnd(); $rd.Close(); $resp.Close()
  return $body
}

# ---- pull readable text out of a PDF (uncompressed text streams) ----
function Get-PdfText([string]$path) {
  $bytes = [System.IO.File]::ReadAllBytes($path)
  $s = [System.Text.Encoding]::ASCII.GetString($bytes)
  $out = New-Object System.Text.StringBuilder
  foreach ($m in [regex]::Matches($s, '\(((?:[^()\\]|\\.)*)\)\s*Tj')) {
    $txt = $m.Groups[1].Value
    $txt = $txt -replace '\\\(', "("
    $txt = $txt -replace '\\\)', ")"
    $txt = $txt -replace '\\\\', "\"
    [void]$out.Append($txt + " ")
  }
  return $out.ToString()
}

# ---- pull text out of a .xlsx (it is a zip of xml) ----
function Get-XlsxText([string]$path) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [System.IO.Compression.ZipFile]::OpenRead($path)
  $ss = ""; $sheet = ""
  try {
    foreach ($e in $zip.Entries) {
      $n = $e.FullName
      if ($n -eq "xl/sharedStrings.xml") {
        $sr = New-Object System.IO.StreamReader($e.Open()); $ss = $sr.ReadToEnd(); $sr.Close()
      } elseif ($n -match '^xl/worksheets/sheet1\.xml$') {
        $sr = New-Object System.IO.StreamReader($e.Open()); $sheet = $sr.ReadToEnd(); $sr.Close()
      }
    }
  } finally { $zip.Dispose() }
  $out = New-Object System.Text.StringBuilder
  $map = @{}
  if ($ss) {
    $i = 0
    foreach ($x in [regex]::Matches($ss, '<si>.*?</si>', [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
      $txt = [regex]::Replace($x.Value, '<[^>]+>', "")
      $map[$i] = $txt; $i++
    }
  }
  if ($sheet) {
    $reRow = [regex]::Match($sheet, '<dimension[^>]*/>')
    foreach ($row in [regex]::Matches($sheet, '<row[^>]*>.*?</row>', [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
      $cells = @()
      foreach ($c in [regex]::Matches($row.Value, '<c[^>]*>.*?</c>', [System.Text.RegularExpressions.RegexOptions]::Singleline)) {
        $t = $null
        if ($c.Value -match 't="s"') {
          if ($c.Value -match '<v>(\d+)</v>') { $t = $map[[int]$Matches[1]] }
        } elseif ($c.Value -match '<is><t[^>]*>([^<]*)</t></is>') { $t = $Matches[1] }
        elseif ($c.Value -match '<v>([^<]*)</v>') { $t = $Matches[1] }
        if ($null -ne $t -and ($t.ToString().Trim().Length -gt 0)) { $cells += $t.ToString().Trim() }
      }
      if ($cells.Count -gt 0) { [void]$out.AppendLine(($cells -join " ")) }
    }
  }
  return $out.ToString()
}

# ---- grab numbers out of a messy raw list; keep names/notes ----
function Convert-ListText([string]$raw) {
  $entries = @{}
  $order = New-Object System.Collections.ArrayList
  $phoneRx = '(?:^|\D)((?:\+?\d{1,3}[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]*\d{3}[\s.-]*\d{4})(?:\D|$)'
  foreach ($ln in ($raw -split "`r?`n")) {
    $line = $ln.Trim()
    if ($line.Length -eq 0) { continue }
    $spans = @()
    $pos = 0
    while ($pos -le $line.Length - 1) {
      $sub = $line.Substring($pos)
      $m = [regex]::Match($sub, $phoneRx)
      if (-not $m.Success) { break }
      $start = $pos + $m.Index
      $end = $start + $m.Length
      $digits = ($m.Groups[1].Value -replace '\D', "")
      if ($digits.Length -ge 10) { $spans += [pscustomobject]@{ s = $start; e = $end; digits = $digits } }
      $pos = $end
      if ($m.Length -eq 0) { break }
    }
    foreach ($sp in $spans) {
      $digits = $sp.digits
      if ($digits.Length -gt 10) { $digits = $digits.Substring($digits.Length - 10) }
      $lbl = ""
      $prev = 0
      foreach ($o in $spans) { $lbl += $line.Substring($prev, $o.s - $prev) + " "; $prev = $o.e }
      $lbl += $line.Substring($prev)
      $lbl = [regex]::Replace($lbl, '[,;:|\d\-\.\(\)\+]', " ")
      $lbl = [regex]::Replace($lbl, '\s{2,}', " ").Trim()
      if ($lbl.Length -lt 2) { $lbl = "" }
      if ($entries.ContainsKey($digits)) {
        if ($lbl -and -not $entries[$digits]) { $entries[$digits] = $lbl }
      } else {
        $entries[$digits] = $lbl
        [void]$order.Add($digits)
      }
    }
  }
  $out = @()
  foreach ($n in $order) {
    $lbl = $entries[$n]
    if ($lbl) { $out += ($lbl + " | " + $n) } else { $out += $n }
  }
  return $out
}

# merge new entries into the existing box (no duplicates; upgrade a plain number with a name when known)
function Merge-ListText([string[]]$newEntries, [string]$existing) {
  $merged = New-Object System.Collections.ArrayList
  $known = @{}
  foreach ($e in ($existing -split "`r?`n")) {
    $t = $e.Trim()
    if ($t.Length -eq 0) { continue }
    [void]$merged.Add($t)
    $parts = $t -split '\|'
    $num = $parts[$parts.Count - 1].Trim()
    $d = ($num -replace '\D', "")
    if ($d.Length -gt 10) { $d = $d.Substring($d.Length - 10) }
    if ($d.Length -ge 10) { $known[$d] = $t }
  }
  $added = 0
  foreach ($en in $newEntries) {
    $parts = $en -split '\|'
    $num = $parts[$parts.Count - 1].Trim()
    $d = ($num -replace '\D', "")
    if ($d.Length -gt 10) { $d = $d.Substring($d.Length - 10) }
    if ($known.ContainsKey($d)) {
      $old = $known[$d]
      if ($old -notmatch '\|' -and $en -match '\|') {
        for ($i = 0; $i -lt $merged.Count; $i++) {
          $cParts = $($merged[$i]) -split '\|'
          $cNum = $cParts[$cParts.Count - 1].Trim()
          $cD = ($cNum -replace '\D', "")
          if ($cD.Length -gt 10) { $cD = $cD.Substring($cD.Length - 10) }
          if ($cD -eq $d) { $merged[$i] = $en; $known[$d] = $en; break }
        }
      }
    } else {
      $known[$d] = $en
      [void]$merged.Add($en)
      $added++
    }
  }
  return [pscustomobject]@{ Text = ($merged -join "`r`n"); New = $added; Found = $newEntries.Count }
}

function Show-ManageForm {
  $cfg = Get-Cfg
  if (-not $cfg) { [System.Windows.Forms.MessageBox]::Show("No agent config found.", "Magic Dialer"); return }
  $portal = $cfg.portalUrl
  $token  = $cfg.token
  $voip   = $cfg.voip

  $f2 = New-Object System.Windows.Forms.Form
  $f2.Text = "Manage agent"
  $f2.StartPosition = "CenterParent"
  $f2.FormBorderStyle = "FixedDialog"
  $f2.MaximizeBox = $false; $f2.MinimizeBox = $false
  $f2.BackColor = $cBg
  $f2.ClientSize = New-Object System.Drawing.Size(520, 706)
  $f2.AutoScroll = $true

  function Add-Lbl($f, $x, $y, $w, $txt) {
    $l = New-Object System.Windows.Forms.Label
    $l.Text = $txt; $l.Location = New-Object System.Drawing.Point($x, $y)
    $l.Size = New-Object System.Drawing.Size($w, 20); $l.ForeColor = $cDim
    $l.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $f.Controls.Add($l); return $l
  }
  function Add-Txt($f, $x, $y, $w, $h) {
    $tb = New-Object System.Windows.Forms.TextBox
    $tb.Location = New-Object System.Drawing.Point($x, $y)
    $tb.Size = New-Object System.Drawing.Size($w, $h)
    $tb.BackColor = $cPanel2; $tb.ForeColor = $cText
    $tb.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
    $f.Controls.Add($tb); return $tb
  }

  Add-Lbl $f2 24 20 280 "AGENT NAME (SAYS THIS ON CALLS)"
  $tName   = Add-Txt $f2 24 42 472 26
  $tName.Text = [string]$cfg.persona
  Add-Lbl $f2 24 82 280 "PRODUCT / SERVICE"
  $tProd   = Add-Txt $f2 24 104 472 26
  $tProd.Text = [string]$cfg.product
  Add-Lbl $f2 24 144 270 "NUMBERS TO CALL (TYPE OR IMPORT A LIST)"
  $btnImp  = New-Object System.Windows.Forms.Button
  $btnImp.Text = "Import file..."
  $btnImp.Location = New-Object System.Drawing.Point(298, 140)
  $btnImp.Size = New-Object System.Drawing.Size(198, 26)
  $btnImp.BackColor = $cPanel2; $btnImp.ForeColor = $cCyan
  $btnImp.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $btnImp.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
  $f2.Controls.Add($btnImp)
  $tNums   = Add-Txt $f2 24 168 472 92
  $tNums.Multiline = $true
  $tNums.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
  $tNums.WordWrap = $false
  $tNums.Font = New-Object System.Drawing.Font("Consolas", 9)
  $tNums.Text = (@($cfg.callList | ForEach-Object { [string]$_ }) -join "`r`n")

  Add-Lbl $f2 24 278 472 "CALL OUT LINE (VOIP PROVIDER - PRIVATE TO THIS PC)"

  $voipNum       = if ($voip) { [string]$voip.number } else { "" }
  $voipUsr       = if ($voip) { [string]$voip.username } else { "" }
  $voipPwd       = if ($voip) { [string]$voip.sipPassword } else { "" }
  $voipExt       = if ($voip) { [string]$voip.extension } else { "" }
  $voipProvider  = if ($voip) { [string]$voip.provider } else { "" }
  $voipServer    = if ($voip) { [string]$voip.server } else { "" }
  $voipPort      = if ($voip) { [string]$voip.port } else { "" }
  $voipTransport = if ($voip) { [string]$voip.transport } else { "" }
  $voipAppId     = if ($voip) { [string]$voip.appClientId } else { "" }
  $voipAppSecret = if ($voip) { [string]$voip.appClientSecret } else { "" }
  $voipAppJwt    = if ($voip) { [string]$voip.appJwt } else { "" }

  $cmbProv = New-Object System.Windows.Forms.ComboBox
  $cmbProv.Items.AddRange(@("ringcentral","twilio","vonage","plivo","flowroute","thinq","myexotel","asterisk","freepbx","generic","sim","custom"))
  $cmbProv.Text = $voipProvider
  $cmbProv.Location = New-Object System.Drawing.Point(24, 300)
  $cmbProv.Size = New-Object System.Drawing.Size(472, 26)
  $cmbProv.BackColor = $cPanel2; $cmbProv.ForeColor = $cText
  $cmbProv.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDown
  $f2.Controls.Add($cmbProv)

  Add-Lbl $f2 24 338 230 "CALLER ID / NUMBER"
  Add-Lbl $f2 270 338 226 "EXTENSION (OPTIONAL)"
  $tVNum = Add-Txt $f2 24 360 230 26; $tVNum.Text = $voipNum
  $tVExt = Add-Txt $f2 270 360 226 26; $tVExt.Text = $voipExt
  Add-Lbl $f2 24 398 230 "SIP USERNAME / AUTH ID"
  Add-Lbl $f2 270 398 226 "SIP PASSWORD"
  $tVUsr = Add-Txt $f2 24 420 230 26; $tVUsr.Text = $voipUsr
  $tVPwd = Add-Txt $f2 270 420 226 26; $tVPwd.Text = $voipPwd

  # Custom SIP servers carry their own server/port/transport (hosted defaults are read-only).
  $hostedProviders = @("ringcentral","twilio","vonage","plivo","flowroute","thinq","myexotel")
  $defaultServers  = @{ ringcentral = "sip.ringcentral.com"; twilio = "sip-1042-sip.twilio.com"; vonage = "sip.nexmo.com"; plivo = "sip.plivo.com"; thinq = "sip.thinq.com"; flowroute = "sip.flowroute.com"; myexotel = "voip.myexotel.com" }
  $lblSrv = Add-Lbl $f2 24 462 210 "SIP SERVER (CUSTOM PROVIDERS)"
  $lblPrt = Add-Lbl $f2 270 462 90 "PORT"
  $lblTrn = Add-Lbl $f2 380 462 116 "TRANSPORT"
  $tVSrv = Add-Txt $f2 24 484 230 26; $tVSrv.Text = $voipServer
  $tVPrt = Add-Txt $f2 270 484 90 26; $tVPrt.Text = $voipPort
  $tVTrn = Add-Txt $f2 380 484 116 26; $tVTrn.Text = $voipTransport

  function Update-VoipFields {
    $isRC = ($cmbProv.Text -eq "ringcentral")
    if ($hostedProviders -contains $cmbProv.Text) {
      $tVSrv.Text = [string]$defaultServers[$cmbProv.Text]
      $tVSrv.Enabled = $false; $tVPrt.Enabled = $false; $tVTrn.Enabled = $false
    } else {
      $tVSrv.Enabled = $true; $tVPrt.Enabled = $true; $tVTrn.Enabled = $true
    }
    $tRCId.Enabled = $isRC; $tRCSecret.Enabled = $isRC; $tRCJwt.Enabled = $isRC
  }
  $cmbProv.Add_SelectedIndexChanged({ Update-VoipFields })
  $cmbProv.Add_TextChanged({ Update-VoipFields })
  Update-VoipFields

  # RingCentral app credentials - the customer's OWN account. If left blank,
  # calls fall back to the portal's shared test line. Get these at
  # developer.ringcentral.com under your app (Authentication -> App Client ID &
  # Secret; optionally the personal JWT credential line).
  $lblRCA = Add-Lbl $f2 24 524 230 "RINGCENTRAL APP CLIENT ID"
  $lblRCS = Add-Lbl $f2 270 524 226 "RINGCENTRAL APP CLIENT SECRET"
  $tRCId = Add-Txt $f2 24 546 230 26; $tRCId.Text = $voipAppId
  $tRCSecret = Add-Txt $f2 270 546 226 26; $tRCSecret.Text = $voipAppSecret
  $lblRCJ = Add-Lbl $f2 24 578 472 "PERSONAL JWT TOKEN (OPTIONAL - PREFERRED BY RINGCENTRAL)"
  $tRCJwt = Add-Txt $f2 24 600 472 26; $tRCJwt.Text = $voipAppJwt

  $lblMg = Add-Lbl $f2 24 672 472 30
  $lblMg.Text = "Changes are applied by the live agent on its next heartbeat. For calls: type full numbers with country code (e.g. +92 300 1234567)."
  $lblMg.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)

  $btnImp.Add_Click({
    $ofd = New-Object System.Windows.Forms.OpenFileDialog
    $ofd.Title = "Pick a call list (PDF / Excel / CSV / TXT)"
    $ofd.Filter = "Call lists (*.txt;*.csv;*.xlsx;*.xls;*.pdf)|*.txt;*.csv;*.xlsx;*.xls;*.pdf|All files (*.*)|*.*"
    if ($ofd.ShowDialog($f2) -ne [System.Windows.Forms.DialogResult]::OK) { return }
    $path = $ofd.FileName
    $lblMg.ForeColor = $cAmber
    $lblMg.Text = "Reading " + [System.IO.Path]::GetFileName($path) + "..."
    try {
      $raw = ""
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      if ($ext -eq ".pdf") { $raw = Get-PdfText $path }
      elseif ($ext -eq ".xlsx") { $raw = Get-XlsxText $path }
      elseif ($ext -eq ".xls") {
        try {
          $excel = New-Object -ComObject Excel.Application
          $excel.Visible = $false
          $wb = $excel.Workbooks.Open($path)
          $ws = $wb.Worksheets.Item(1)
          $used = $ws.UsedRange
          $rows = $used.Rows.Count
          $cols = $used.Columns.Count
          $lines = New-Object System.Collections.ArrayList
          for ($r = 1; $r -le $rows; $r++) {
            $cells = @()
            for ($c2 = 1; $c2 -le $cols; $c2++) {
              $v = [string]$used.Cells.Item($r, $c2).Text
              if ($v) { $cells += $v }
            }
            if ($cells.Count -gt 0) { [void]$lines.Add(($cells -join " ")) }
          }
          $raw = $lines -join "`r`n"
          $wb.Close($false)
          $excel.Quit()
          [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
        } catch {
          $lblMg.ForeColor = $cRed
          $lblMg.Text = "That .xls could not open here. In Excel: File > Save As > .xlsx or .csv, then import again."
          return
        }
      }
      else { $raw = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8) }

      $newEntries = @(Convert-ListText $raw)
      if ($newEntries.Count -eq 0) {
        $lblMg.ForeColor = $cRed
        $lblMg.Text = "No phone numbers found in that file. If it is a scanned PDF, export it to .csv or .txt first."
        return
      }
      $res = Merge-ListText $newEntries $tNums.Text
      $tNums.Text = $res.Text
      $lblMg.ForeColor = $cGreen
      $lblMg.Text = "Imported " + $res.New + " new number(s) (found " + $res.Found + "). Names and notes kept next to each entry. Review, then Save."
    } catch {
      $lblMg.ForeColor = $cRed
      $lblMg.Text = "Couldn't read the file: " + $_.Exception.Message
    }
  })

  $btnSave = New-Object System.Windows.Forms.Button
  $btnSave.Text = "Save"
  $btnSave.Location = New-Object System.Drawing.Point(24, 626)
  $btnSave.Size = New-Object System.Drawing.Size(110, 44)
  $btnSave.BackColor = $cPanel2; $btnSave.ForeColor = $cGreen
  $btnSave.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $btnSave.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
  $f2.Controls.Add($btnSave)

  $btnCancel = New-Object System.Windows.Forms.Button
  $btnCancel.Text = "Close"
  $btnCancel.Location = New-Object System.Drawing.Point(144, 626)
  $btnCancel.Size = New-Object System.Drawing.Size(100, 44)
  $btnCancel.BackColor = $cPanel2; $btnCancel.ForeColor = $cDim
  $btnCancel.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $f2.Controls.Add($btnCancel)
  $btnCancel.Add_Click({ $f2.Close() })

  $btnCall = New-Object System.Windows.Forms.Button
  $btnCall.Text = "CALL NUMBERS NOW"
  $btnCall.Location = New-Object System.Drawing.Point(254, 626)
  $btnCall.Size = New-Object System.Drawing.Size(242, 44)
  $btnCall.BackColor = $cPanel2; $btnCall.ForeColor = $cViolet
  $btnCall.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
  $btnCall.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
  $f2.Controls.Add($btnCall)

  $btnCall.Add_Click({
    $logPath = Join-Path $env:TEMP "magicdialer-dial.log"
    $Tag = ((Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))
    Add-Content $logPath ("[$Tag] CALL pressed. portal=$portal tokenLen=$($token.Length)")
    $nums = @($tNums.Text -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
    if ($nums.Count -eq 0) { $lblMg.ForeColor = $cRed; $lblMg.Text = "No numbers yet. Type the numbers above, then click CALL NUMBERS NOW."; Add-Content $logPath ("[$Tag] no numbers"); return }
    Add-Content $logPath ("[$Tag] numbers: " + ($nums -join " | "))
    $lblMg.ForeColor = $cAmber; $lblMg.Text = "Logging in as this agent..."; [System.Windows.Forms.Application]::DoEvents()
    try {
      $cc = New-Object System.Net.CookieContainer
      $loginJson = @{ token = $token } | ConvertTo-Json -Compress
      $null = Post-JsonBody ($portal + "/clogin") $loginJson $cc
      Add-Content $logPath ("[$Tag] clogin OK")
      $lblMg.ForeColor = $cAmber; $lblMg.Text = "IMPORTANT: RingOut rings THIS line first - answer it, then the called number rings."
      [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 1500; [System.Windows.Forms.Application]::DoEvents()
      $placed = 0; $ringing = 0
      foreach ($rawNum in $nums) {
        $d = ($rawNum -replace '\D', "")
        if ($d.Length -lt 10) { $lblMg.ForeColor = $cRed; $lblMg.Text = "'$rawNum' looks incomplete - skipped."; Add-Content $logPath ("[$Tag] skip '$rawNum'"); [System.Windows.Forms.Application]::DoEvents(); continue }
        if ($d.Length -ge 12 -and $d.StartsWith("00")) { $d = $d.Substring(2) }                 # 00 international prefix
        elseif ($d.Length -eq 11 -and $d.StartsWith("0")) { $d = "92" + $d.Substring(1) }      # national 0xx -> +92
        elseif ($d.Length -eq 10) { $d = "1" + $d }                                             # US/CA local -> +1
        $e164 = "+" + $d
        $lblMg.ForeColor = $cCyan; $lblMg.Text = "Calling $e164 ..."; [System.Windows.Forms.Application]::DoEvents()
        try {
          $dialJson = @{ token = $token; number = $e164 } | ConvertTo-Json -Compress
          $resp = Post-JsonBody ($portal + "/api/dial") $dialJson $cc
          Add-Content $logPath ("[$Tag] dial $e164 -> " + $resp)
          $j = $resp | ConvertFrom-Json
          if ($j.ok) { $placed++; if ($j.status -eq "ringing") { $ringing++ }; $lblMg.ForeColor = $cGreen; $lblMg.Text = "$e164 -> $($j.status)." }
          else { $lblMg.ForeColor = $cRed; $lblMg.Text = "$e164 failed: $($j.error)"; Add-Content $logPath ("[$Tag] dial $e164 server-error: " + $j.error) }
        } catch {
          Add-Content $logPath ("[$Tag] dial $e164 EXCEPTION: " + $_.Exception.Message)
          $lblMg.ForeColor = $cRed; $lblMg.Text = "$e164 error: $($_.Exception.Message)"
        }
        [System.Windows.Forms.Application]::DoEvents()
        if ($placed -lt $nums.Count) { Start-Sleep -Seconds 2; [System.Windows.Forms.Application]::DoEvents() }
      }
      if ($placed -gt 0) { $lblMg.ForeColor = $cGreen; $lblMg.Text = "Done - $placed call(s) placed ($ringing ringing)." } else { $lblMg.ForeColor = $cRed; $lblMg.Text = "No calls could be placed." }
      Add-Content $logPath ("[$Tag] done placed=$placed ringing=$ringing")
    } catch {
      Add-Content $logPath ("[$Tag] OUTER EXCEPTION: " + $_.Exception.Message)
      $lblMg.ForeColor = $cRed; $lblMg.Text = "Login/dial failed: " + $_.Exception.Message
    }
  })

  $btnSave.Add_Click({
    $lblMg.ForeColor = $cAmber; $lblMg.Text = "Saving... please wait"
    $cc = New-Object System.Net.CookieContainer
    $voipProvider = $cmbProv.Text.Trim()
    $voipServer = if ($tVSrv.Enabled) { $tVSrv.Text.Trim() } else { "" }
    $voipObj = @{
      provider = $voipProvider; number = $tVNum.Text.Trim(); extension = $tVExt.Text.Trim()
      username = $tVUsr.Text.Trim(); sipPassword = $tVPwd.Text
      server = $voipServer; port = $tVPrt.Text.Trim(); transport = $tVTrn.Text.Trim()
      appClientId = $tRCId.Text.Trim(); appClientSecret = $tRCSecret.Text.Trim(); appJwt = $tRCJwt.Text.Trim()
    }
    if ($voipServer -eq "") { $voipObj.Remove("server") }
    if (-not $voipObj.appClientId) { $voipObj.Remove("appClientId") }
    if (-not $voipObj.appClientSecret) { $voipObj.Remove("appClientSecret") }
    if (-not $voipObj.appJwt) { $voipObj.Remove("appJwt") }
    try {
      $loginJson = @{ token = $token } | ConvertTo-Json -Compress
      $null = Post-JsonBody ($portal + "/clogin") $loginJson $cc
      $patchJson = @{ product = $tProd.Text; persona = $tName.Text; settings = @{ voip = $voipObj } } | ConvertTo-Json -Compress -Depth 5
      $null = Post-JsonBody ($portal + "/api/customer/" + $token) $patchJson $cc "PATCH"
      $nums = @($tNums.Text -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
      $callJson = @{ numbers = $nums } | ConvertTo-Json -Compress -Depth 4
      $null = Post-JsonBody ($portal + "/api/customer/" + $token + "/calllist") $callJson $cc
      $c2 = Get-Cfg
      if ($c2) {
        $c2.persona = $tName.Text
        $c2.product = $tProd.Text
        $c2.callList = $nums
        $c2.voip = @{
        provider = $voipProvider; number = $tVNum.Text.Trim(); extension = $tVExt.Text.Trim()
        username = $tVUsr.Text.Trim(); sipPassword = $tVPwd.Text
        server = $voipServer; port = $tVPrt.Text.Trim(); transport = $tVTrn.Text.Trim()
        appClientId = $tRCId.Text.Trim(); appClientSecret = $tRCSecret.Text.Trim(); appJwt = $tRCJwt.Text.Trim()
        ready = ($voipProvider -ne "" -and $tVNum.Text.Trim() -ne "" -and $tVUsr.Text.Trim() -ne "" -and ($hostedProviders -contains $voipProvider -or $voipServer -ne ""))
      }
        [System.IO.File]::WriteAllText((Join-Path $cfgDir "config.json"), ($c2 | ConvertTo-Json -Depth 8), (New-Object System.Text.UTF8Encoding($false)))
      }
      $lblMg.ForeColor = $cGreen; $lblMg.Text = "Saved. The agent applies it on its next heartbeat (~seconds)."
    } catch {
      $lblMg.ForeColor = $cRed; $lblMg.Text = "Failed: " + $_.Exception.Message
    }
  })

  [void]$f2.ShowDialog($form)
}

$btnManage.Add_Click({ Show-ManageForm })

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