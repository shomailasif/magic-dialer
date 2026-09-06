// End-to-end audio loop test: speak through speakers while the mic listens.
const { speak } = require("./agent/voice");
const { hear } = require("./agent/hear");

(async () => {
  console.log("Starting speaker -> microphone loop test...");
  const playing = speak("Attention please. This is a microphone test. One two three four.");
  await new Promise((r) => setTimeout(r, 700));
  const heard = await hear({ timeoutMs: 9000 });
  console.log("HEARD=" + JSON.stringify(heard));
  console.log(heard ? "LOOP TEST: PASS (mic hears audio)" : "LOOP TEST: FAIL (mic heard nothing)");
  await playing;
  process.exit(heard ? 0 : 2);
})().catch((e) => { console.error("crash", e); process.exit(1); });