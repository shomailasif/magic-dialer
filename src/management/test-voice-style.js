// Voice-v2 unit checks (pure, no audio hardware, no internet):
//   - edgeVoiceFor picks a distinct voice per style (human/frank/friendly)
//   - styles are locale-aware across all six shipped languages
//   - invalid styles normalize to "human" and never change the chosen voice
//   - styleRate paces frank a touch faster and leaves human/friendly alone
//   - English default (human) keeps the exact legacy voice, so upgrades hear
//     the same "en-US-JennyNeural" until the operator picks a style.
const assert = require("node:assert");
const { edgeVoiceFor, normalizeStyle, styleRate } = require("./agent/voice");

let pass = 0;
let fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log("  [PASS] " + name); }
  catch (e) { fail++; console.log("  [FAIL] " + name + " — " + e.message); }
}

check("English human keeps the legacy Jenny voice", () => {
  assert.strictEqual(edgeVoiceFor("en", "human"), "en-US-JennyNeural");
  assert.strictEqual(edgeVoiceFor("en"), "en-US-JennyNeural");
  assert.strictEqual(edgeVoiceFor("en-US", "human"), "en-US-JennyNeural");
});

check("frank selects a distinct direct voice per language", () => {
  assert.strictEqual(edgeVoiceFor("en", "frank"), "en-US-DavisNeural");
  assert.strictEqual(edgeVoiceFor("es", "frank"), "es-ES-AlvaroNeural");
  assert.strictEqual(edgeVoiceFor("fr", "frank"), "fr-FR-RemyNeural");
  assert.strictEqual(edgeVoiceFor("de", "frank"), "de-DE-ConradNeural");
  assert.strictEqual(edgeVoiceFor("pt", "frank"), "pt-BR-AntonioNeural");
  assert.strictEqual(edgeVoiceFor("hi", "frank"), "hi-IN-MadhurNeural");
});

check("friendly selects a warm distinct voice", () => {
  assert.strictEqual(edgeVoiceFor("en", "friendly"), "en-US-AriaNeural");
  assert.strictEqual(edgeVoiceFor("es", "friendly"), "es-ES-ElviraNeural");
  assert.strictEqual(edgeVoiceFor("hi", "friendly"), "hi-IN-SwaraNeural");
});

check("all three styles differ from each other in English", () => {
  const voices = ["human", "frank", "friendly"].map((s) => edgeVoiceFor("en", s));
  assert.strictEqual(new Set(voices).size, 3);
});

check("region-specific locales resolve through their base language", () => {
  assert.strictEqual(edgeVoiceFor("es-MX", "human"), "es-MX-DaliaNeural");
  assert.strictEqual(edgeVoiceFor("fr-CA", "frank"), "fr-CA-AntoineNeural");
  assert.strictEqual(edgeVoiceFor("en-GB", "frank"), "en-GB-RyanNeural");
});

check("unknown locales fall back to a valid voice", () => {
  const v = edgeVoiceFor("en", "human");
  assert.match(edgeVoiceFor("xx-YY", "human"), /Neural$/);
  assert.match(edgeVoiceFor("missing", "frank"), /Neural$/);
  assert.strictEqual(edgeVoiceFor("missing", "human"), v);
});

check("invalid styles normalize to human and keep the human voice", () => {
  assert.strictEqual(normalizeStyle("FRANK"), "frank");
  assert.strictEqual(normalizeStyle("robot"), "human");
  assert.strictEqual(normalizeStyle(""), "human");
  assert.strictEqual(normalizeStyle(undefined), "human");
  const human = edgeVoiceFor("en", "human");
  assert.strictEqual(edgeVoiceFor("en", "robot"), human);
  assert.strictEqual(edgeVoiceFor("en", "SOMETHING"), human);
});

check("frank speech is paced slightly faster; human/friendly unchanged", () => {
  assert.strictEqual(styleRate("human", 1), 1);
  assert.strictEqual(styleRate("friendly", 1), 1);
  assert.strictEqual(styleRate("frank", 1), 1.06);
  assert.strictEqual(styleRate("frank", 0.5), 0.53);
  assert.strictEqual(styleRate(undefined, 1), 1);
});

console.log(""); 
console.log(`===== RESULT: ${pass} passed, ${fail} failed =====`);
process.exit(fail ? 1 : 0);