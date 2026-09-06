// Headless proof of the exact hear() code path (grammar + Recognize) using a
// pre-synthesized speech WAV - no human/ microphone needed.
const { hear } = require("./agent/hear");

const WAV = "C:\\Users\\USER\\AppData\\Local\\Temp\\opencode\\spch.wav";
const fs = require("node:fs");
if (!fs.existsSync(WAV)) {
  console.log("SKIP: no spch.wav (run diag-sapi first)");
  process.exit(0);
}

(async () => {
  const text = await hear({ timeoutMs: 60000, waveFile: WAV });
  console.log("WAV TEXT = " + JSON.stringify(text));
  const ok = text && /hello|test|microphone|quick|brown|fox|magic/.test(text);
  console.log(ok ? "HEAR-PIPELINE: PASS (grammar + Recognize works headless)" : "HEAR-PIPELINE: FAIL");
  process.exit(ok ? 0 : 1);
})().catch((e) => console.error("crash", e));