# Audio + speech-recognition diagnostics for Magic Dialer
Get-PnpDevice -Class AudioEndpoint -ErrorAction SilentlyContinue | Select-Object FriendlyName, Status, InstanceId | Out-String

Write-Output "---- raw SAPI recognition (8s, speak if you can) ----"
Add-Type -AssemblyName System.Speech
try {
  $r = New-Object System.Speech.Recognition.SpeechRecognitionEngine
  $r.SetInputToDefaultAudioDevice()
  $r.InitialSilenceTimeout = New-Object System.TimeSpan(0,0,8)
  $r.EndSilenceTimeout = New-Object System.TimeSpan(0,0,2)
  $g = New-Object System.Speech.Recognition.DictationGrammar
  $r.LoadGrammar($g)
  $res = $r.RecognizeSync()
  if ($res) { Write-Output ("HEARD:" + $res.Text) } else { Write-Output "HEARD:(nothing - silence timeout)" }
} catch {
  Write-Output ("ERR:" + $_.Exception.Message)
}