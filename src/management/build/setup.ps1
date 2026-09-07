# Magic Dialer - one-time setup form (premium wizard)
# Captures what the customer sells, their lead info, email, the portal URL and
# access key from their provider; writes the agent config; then starts the agent.
# Free, no extra tools - uses Windows' built-in .NET Forms.
# ASCII-only (PowerShell 5.1 reads non-ASCII badly).

$ErrorActionPreference = "Stop"

$configDir  = Join-Path $env:USERPROFILE ".magicdialer"
$configPath = Join-Path $configDir "config.json"

# Prefill with existing config if present (so re-running setup shows old values).
$existing = @{}
if (Test-Path -LiteralPath $configPath) {
  try { $existing = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json -AsHashtable } catch {}
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$logoFile = Join-Path $PSScriptRoot "logo-256.png"
$iconFile = Join-Path $PSScriptRoot "logo.ico"

$cBg      = [System.Drawing.Color]::FromArgb(6, 9, 18)
$cPanel   = [System.Drawing.Color]::FromArgb(11, 18, 32)
$cPanel2  = [System.Drawing.Color]::FromArgb(15, 23, 42)
$cCyan    = [System.Drawing.Color]::FromArgb(34, 211, 238)
$cViolet  = [System.Drawing.Color]::FromArgb(139, 92, 246)
$cGreen   = [System.Drawing.Color]::FromArgb(52, 211, 153)
$cRed     = [System.Drawing.Color]::FromArgb(248, 113, 113)
$cText    = [System.Drawing.Color]::FromArgb(226, 232, 240)
$cDim     = [System.Drawing.Color]::FromArgb(148, 163, 184)

$form = New-Object System.Windows.Forms.Form
$form.Text        = "Magic Dialer - Setup"
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.ClientSize  = New-Object System.Drawing.Size(680, 760)
$form.BackColor   = $cBg
if (Test-Path -LiteralPath $iconFile) {
  $form.Icon = New-Object System.Drawing.Icon($iconFile)
}

$logoBox = New-Object System.Windows.Forms.PictureBox
$logoBox.Location = New-Object System.Drawing.Point(20, 16)
$logoBox.Size = New-Object System.Drawing.Size(60, 60)
$logoBox.SizeMode = [System.Windows.Forms.PictureBoxSizeMode]::Zoom
if (Test-Path -LiteralPath $logoFile) { $logoBox.Image = [System.Drawing.Image]::FromFile($logoFile) }
$form.Controls.Add($logoBox)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Magic Dialer"
$title.Location = New-Object System.Drawing.Point(92, 16)
$title.Size = New-Object System.Drawing.Size(400, 32)
$title.ForeColor = $cCyan
$title.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($title)

$sub = New-Object System.Windows.Forms.Label
$sub.Text = "One-minute setup - this PC will start calling on its own"
$sub.Location = New-Object System.Drawing.Point(94, 50)
$sub.Size = New-Object System.Drawing.Size(460, 18)
$sub.ForeColor = $cDim
$form.Controls.Add($sub)

$lblLive = New-Object System.Windows.Forms.Label
$lblLive.Location = New-Object System.Drawing.Point(440, 22)
$lblLive.Size = New-Object System.Drawing.Size(210, 44)
$lblLive.BackColor = $cPanel2
$lblLive.ForeColor = $cGreen
$lblLive.Text = "LIVE PREVIEW"
$lblLive.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$lblLive.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($lblLive)

function New-Label($text, $y) {
  $l = New-Object System.Windows.Forms.Label
  $l.Text = $text
  $l.Location = New-Object System.Drawing.Point(20, $y)
  $l.Size = New-Object System.Drawing.Size(460, 18)
  $l.ForeColor = $cDim
  $l.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
  $form.Controls.Add($l)
  return $l
}

function New-Field($y, $defaultText = "") {
  $t = New-Object System.Windows.Forms.TextBox
  $t.Location = New-Object System.Drawing.Point(20, ($y + 18))
  $t.Size = New-Object System.Drawing.Size(460, 28)
  $t.BackColor = $cPanel
  $t.ForeColor = $cText
  $t.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
  $t.Font = New-Object System.Drawing.Font("Segoe UI", 11)
  $t.Text = $defaultText
  $form.Controls.Add($t)
  return $t
}

# --- fields ---
$y = 84
$def = ""; if ($existing -and $existing.ContainsKey("companyName")) { $def = $existing["companyName"] }
$form.Controls.Add((New-Label "Your company name (the AI introduces itself as your company)" $y))
$company = New-Field $y $def
$y += 56

$def = "Shomail"
if ($existing -and $existing.ContainsKey("persona")) { $def = $existing["persona"] }
$form.Controls.Add((New-Label "Agent's first name (the AI's name on calls)" $y))
$persona = New-Field $y $def
$y += 56

$def = ""; if ($existing -and $existing.ContainsKey("product")) { $def = $existing["product"] }
$form.Controls.Add((New-Label "What do you sell / your service?" $y))
$product = New-Field $y $def
$y += 56

$def = ""; if ($existing -and $existing.ContainsKey("leadFields")) { $def = ($existing["leadFields"] -join ", ") }
$form.Controls.Add((New-Label "Info you want from each qualified lead (comma-separated)" $y))
$lead = New-Field $y $def
$y += 56

$def = ""; if ($existing -and $existing.ContainsKey("contactEmail")) { $def = $existing["contactEmail"] }
$form.Controls.Add((New-Label "Email address for qualified leads" $y))
$email = New-Field $y $def
$y += 56

$def = ""; if ($existing -and $existing.ContainsKey("callbackNumber")) { $def = $existing["callbackNumber"] }
$form.Controls.Add((New-Label "Service call-back number (optional - 'our manager will call you back')" $y))
$callback = New-Field $y $def
$y += 56

$def = ""; if ($existing -and $existing.ContainsKey("callbackIn")) { $def = $existing["callbackIn"] }
$form.Controls.Add((New-Label "Manager calls back within, e.g. '30 minutes' (optional)" $y))
$callbackIn = New-Field $y $def
$y += 56

$def = ""; if ($existing -and $existing.ContainsKey("portalUrl")) { $def = $existing["portalUrl"] }
$form.Controls.Add((New-Label "Portal URL (from your provider)" $y))
$portal = New-Field $y $def
$y += 56

$def = ""; if ($existing -and $existing.ContainsKey("token")) { $def = $existing["token"] }
$form.Controls.Add((New-Label "Access key (from your provider)" $y))
$token = New-Field $y $def
$y += 56

# --- live self-intro preview panel ---
$preview = New-Object System.Windows.Forms.Panel
$preview.Location = New-Object System.Drawing.Point(500, 80)
$preview.Size = New-Object System.Drawing.Size(160, 560)
$preview.BackColor = $cPanel
$preview.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
$form.Controls.Add($preview)

$pvTitle = New-Object System.Windows.Forms.Label
$pvTitle.Text = "AI SELF-INTRO"
$pvTitle.Location = New-Object System.Drawing.Point(510, 88)
$pvTitle.Size = New-Object System.Drawing.Size(150, 18)
$pvTitle.ForeColor = $cDim
$pvTitle.Font = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($pvTitle)

$pvBody = New-Object System.Windows.Forms.Label
$pvBody.Location = New-Object System.Drawing.Point(510, 112)
$pvBody.Size = New-Object System.Drawing.Size(150, 520)
$pvBody.ForeColor = $cCyan
$pvBody.Font = New-Object System.Drawing.Font("Consolas", 9)
$pvBody.Text = ""
$form.Controls.Add($pvBody)

function Update-Preview {
  $name = $persona.Text.Trim()
  if (-not $name) { $name = "(agent name)" }
  $comp = $company.Text.Trim()
  if (-not $comp) { $comp = "(your company)" }
  $pvBody.Text = "This is $name from $comp.`r`n`r`nThe reason I'm calling is simple: your truck makes money loaded and burns money empty. I keep owner-operators loaded back-to-back at top rates. That's the whole call."
}

$persona.Add_TextChanged({ Update-Preview })
$company.Add_TextChanged({ Update-Preview })

# --- buttons ---
$ok = New-Object System.Windows.Forms.Button
$ok.Text = "Save and Start"
$ok.Location = New-Object System.Drawing.Point(20, ($y + 4))
$ok.Size = New-Object System.Drawing.Size(180, 42)
$ok.BackColor = $cViolet
$ok.ForeColor = [System.Drawing.Color]::White
$ok.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$ok.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($ok)

$cancel = New-Object System.Windows.Forms.Button
$cancel.Text = "Cancel"
$cancel.Location = New-Object System.Drawing.Point(210, ($y + 4))
$cancel.Size = New-Object System.Drawing.Size(100, 42)
$cancel.BackColor = $cPanel2
$cancel.ForeColor = $cText
$cancel.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$form.Controls.Add($cancel)

$msg = New-Object System.Windows.Forms.Label
$msg.Location = New-Object System.Drawing.Point(20, ($y + 54))
$msg.Size = New-Object System.Drawing.Size(460, 42)
$msg.ForeColor = $cRed
$msg.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Controls.Add($msg)

function Write-ConfigNoBom($path, $obj) {
  $json = $obj | ConvertTo-Json -Depth 6
  [System.IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding($false)))
}

$ok.Add_Click({
  $portalText  = $portal.Text.Trim()
  $tokenText   = $token.Text.Trim()
  $companyText = $company.Text.Trim()
  $personaText = $persona.Text.Trim()
  $prodText    = $product.Text.Trim()
  $leadText    = $lead.Text.Trim()
  $emailText   = $email.Text.Trim()
  $cbText      = $callback.Text.Trim()
  $cbInText    = $callbackIn.Text.Trim()
  if (-not $portalText -or -not $tokenText -or -not $companyText -or -not $prodText) {
    $msg.Text = "Please fill in: company name, what you sell, portal URL and access key."
    return
  }
  if (-not $personaText) { $personaText = "Shomail" }
  $leadArr = @($leadText -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $new = @{
    machineId      = if ($existing -and $existing.ContainsKey("machineId")) { $existing["machineId"] } else { [guid]::NewGuid().ToString() }
    portalUrl      = $portalText
    token          = $tokenText
    companyName    = $companyText
    product        = $prodText
    leadFields     = $leadArr
    contactEmail   = $emailText
    callbackNumber = if ($cbText) { $cbText } else { $null }
    callbackIn     = if ($cbInText) { $cbInText } else { $null }
    persona        = $personaText
    voip           = if ($existing -and $existing.ContainsKey("voip")) { $existing["voip"] } else { @{ ready = $false } }
  }
  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
  Write-ConfigNoBom $configPath $new
  $form.Close()
  $agent = Join-Path $PSScriptRoot "MagicDialer.exe"
  if (Test-Path -LiteralPath $agent) {
    # Run under the self-healing watchdog so the agent always restarts if it dies.
    Start-Process -FilePath $agent -ArgumentList @("--watchdog") -WindowStyle Hidden -WorkingDirectory $PSScriptRoot
  }
})
$cancel.Add_Click({ $form.Close() })

Update-Preview

[void]$form.ShowDialog()