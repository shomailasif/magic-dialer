// Learning + friendly-off-script checks (pure, no audio, no internet):
//   - an unexpected question gets a warm product answer, not the script
//   - off-script small talk gets a friendly line and is remembered
//   - a recurring phrase becomes a learned intent that is used next call
//   - learning persists (carries strategyScores / calls) across calls
//   - negative stays negative regardless of the friendliness layer
const assert = require("node:assert");
const { runCall } = require("./agent/call-runner");

let pass = 0;
let fail = 0;
function check(name, fn) {
  try { fn(); pass++; console.log("  [PASS] " + name); }
  catch (e) { fail++; console.log("  [FAIL] " + name + " — " + e.message); }
}

async function run(opts) {
  const said = [];
  return runCall({
    product: "dispatch services",
    leadFields: ["NAME", "MC"],
    persona: "Shomail",
    companyName: "ZAZ Logistics",
    learning: opts.learning || {},
    locale: "en",
    speak: async (t) => { said.push(t); },
    listen: opts.listen,
  }).then((r) => ({ r, said }));
}

// Queued replies: undefined = silence.
const flows = {
  questionCall: (async function* () {
    yield "how was your day";       // unexpected question
    yield "yes";                    // then answers the first field
    yield "roger";                  // MC answer
    yield undefined;
  })(),
  smallTalkCall: (async function* () {
    yield "this market is wild lately"; // off-script, not objection/soft
    yield "yes";
    yield "mc8890";
    yield undefined;
  })(),
};

const qListen = async () => (await flows.questionCall.next()).value;
const sListen = async () => (await flows.smallTalkCall.next()).value;

(async () => {
  console.log("===== Friendly + self-learning behavior =====");

  let lead = (await run({ listen: qListen }));
  const transcriptA = lead.r.transcript.map((t) => t.text).join(" | ");
  check("unexpected question gets a real answer, not the script", () => {
    const line = lead.said.find((t) => /dispatch services/i.test(t));
    assert.ok(line, "no product-backed answer found: " + JSON.stringify(lead.said));
  });
  check("call completed scoring normally", () => {
    assert.ok(typeof lead.r.score === "number" && lead.r.learning.calls === 1);
  });

  let second = (await run({ learning: lead.r.learning, listen: sListen }));
  check("small talk stays friendly (no hangup on odd reply)", () => {
    assert.ok(!second.r.escalateToHuman, "escalated after small talk");
    assert.ok(second.said.some((t) => /straight|honest|fair|real/i.test(t)), "no friendly-pool line");
  });
  check("learning carried across calls (stays persistent)", () => {
    assert.strictEqual(second.r.learning.calls, 2);
  });
  check("missed utterance was recorded for learning", () => {
    assert.ok(second.r.learning.unhandled.length >= 1, "no unhandled entries");
  });

  // Recur same small-talk phrase -> becomes a learned intent used next call.
  const again = (async function* () {
    yield "this market is wild lately";
    yield "yes";
    yield "mc7";
    yield undefined;
  })();
  const third = await run({ learning: second.r.learning, listen: async () => (await again.next()).value });
  check("recurring phrase is auto-learned as a custom intent", () => {
    const sigs = Object.keys(third.r.learning.customIntent || {});
    assert.ok(sigs.length >= 1, "no custom intent learned: " + JSON.stringify(sigs));
  });

  // Fourth call with the SAME phrase proves the learned answer gets used now.
  const again2 = (async function* () {
    yield "this market is wild lately";
    yield "yes";
    yield "mc7";
    yield undefined;
  })();
  const fourth = await run({ learning: third.r.learning, listen: async () => (await again2.next()).value });
  check("learned answer is used when the same thing comes up again", () => {
    assert.ok(fourth.r.strategies.includes("ai_custom_intent"), "learned intent not used: " + JSON.stringify(fourth.r.strategies));
  });

  // A clear no is still a no — the friendliness layer never overrides it.
  const noListen = (async function* () {
    yield "no thanks";
    yield "no";
    yield undefined;
  })();
  const noCall = await run({ learning: {}, listen: async () => (await noListen.next()).value });
  check("hard rejection still closes gracefully", () => {
    assert.ok(noCall.r.score < 0.6, "rejection scored as a lead");
  });

  console.log(pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });