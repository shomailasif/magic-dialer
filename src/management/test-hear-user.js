const { hear } = require("./agent/hear");
(async () => {
  console.log('LISTENING for 10 seconds. SAY SOMETHING NOW (e.g. "Test one two three")...');
  const r = await hear({ timeoutMs: 10000 });
  console.log("HEARD=" + JSON.stringify(r));
  console.log(r ? "HEARING TEST: PASS" : "HEARING TEST: FAIL (nothing recognized)");
  process.exit(r ? 0 : 2);
})().catch((e) => { console.error("crash", e); process.exit(1); });