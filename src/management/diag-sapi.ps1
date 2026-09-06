# End-to-end SAPI check WITHOUT a human:
# 1) Synthesize a WAV of speech.
# 2) Feed it into the SAME recognition engine hear() uses (Recognize()) via wave file.
#    If the engine transcribes it, the previously-broken code path is now proven working.
Add-Type -AssemblyName System.Speech

$outWav = "C:\Users\USER\AppData\Local\Temp\opencode\spch.wav"

$syn = New-Object System.Speech.Synthesis.SpeechSynthesizer
$syn.SetOutputToWaveFile($outWav)
$syn.Speak("Hello, this is a microphone test. The quick brown fox jumps over the lazy dog.")
$syn.Dispose()
Write-Output ("synthesized wav bytes: " + (Get-Item $outWav).Length)

$r = New-Object System.Speech.Recognition.SpeechRecognitionEngine
$r.SetInputToWaveFile($outWav)
$r.InitialSilenceTimeout = New-Object System.TimeSpan(0,0,30)
try {
  $res = $r.Recognize()
  if ($res) { Write-Output ("ENGINE HEARD: " + $res.Text) } else { Write-Output "ENGINE HEARD: (nothing)" }
} catch {
  Write-Output ("ENGINE ERR: " + $_.Exception.Message)
}