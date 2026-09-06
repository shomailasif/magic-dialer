Add-Type -AssemblyName System.Drawing
$assets = "C:\Users\USER\Documents\Default Project\autodial-ai\src\management\build\assets"
$bmp = [System.Drawing.Bitmap]::FromFile((Join-Path $assets "logo-256.png"))
$h = $bmp.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($h)
$fs = [System.IO.File]::Create((Join-Path $assets "logo.ico"))
$ico.Save($fs)
$fs.Close()
$bmp.Dispose()
"ico rebuilt: " + [math]::Round((Get-Item (Join-Path $assets "logo.ico")).Length / 1KB, 1) + " KB"