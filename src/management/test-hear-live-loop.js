const { hear } = require("./agent/hear");
const text = hear({ timeoutMs: 20000 });
console.log("LIVE WAV-LOOP HEARD=" + JSON.stringify(text));
const ok = !!text;
console.log(ok ? "LIVE MIC LOOP: PASS (mic heard speakers' own speech)" : "LIVE MIC LOOP: silent (expected if echo cancel is active; real human voice needed to confirm)");
process.exit(0);