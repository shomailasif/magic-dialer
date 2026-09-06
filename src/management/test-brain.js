// Behavior tests for the charm brain + call runner (no audio - scripted input).
const { runCall } = require("./agent/call-runner");

const CUSTOMER = {
  product: "Dispatch Services to truckers for USA and canada",
  leadFields: ["NAME", "MC NUMBER", "PHONE NUMBER", "TEXT REQUEST", "TRUCK TYPE"],
  persona: "Shomail",
  companyName: "ZAZ Logistics",
  contactEmail: "test@example.com",
};

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok) {
  if (ok) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; failures.push(name); console.log(`  [FAIL] ${name}`); }
}

function makeListen(script) {
  const q = [...script];
  return async () => (q.length ? q.shift() : null);
}

async function run(script, opts = {}) {
  return runCall({ ...CUSTOMER, ...opts, speak: () => {}, listen: makeListen(script) });
}

function agentText(r) {
  return r.transcript.filter((t) => t.role === "agent").map((t) => t.text);
}
function allLower(r) {
  return agentText(r).join("\n").toLowerCase();
}
function last(r) {
  const lines = agentText(r);
  return lines[lines.length - 1] || "";
}

(async () => {
  console.log("===== Engaged lead: charm, digits, name, service callback close =====");
  const engaged = await run([
    "I'm doing great thanks",
    "my name is Mike Thomas",
    "eight eight nine nine zero one",
    "four two three five five five zero one nine nine",
    "Need a 53ft dry van, cross border",
    "53ft flatbed",
  ], { callbackNumber: "800-555-0100", callbackIn: "30 minutes" });
  const eng = allLower(engaged);
  check("opens as the customer's company (ZAZ Logistics)", eng.includes("this is shomail from zaz logistics"));
  check("opens with a reason/hook, not a survey", !eng.includes("name situation") && !eng.includes("so glad i got through"));
  check("says a rapport moment after the greeting",
    eng.includes("less than a minute") || eng.includes("before i let you go") || eng.includes("before i go") || eng.includes("keeping this short") || eng.includes("real quick"));
  check("goodLead=true", engaged.goodLead === true);
  check("high score", engaged.score >= 0.7);
  check("reflected MC digits back (889901)", eng.includes("889901"));
  check("captured the lead name Mike", eng.includes("mike"));
  check("service close: manager call-back in 30 minutes from 800-555-0100",
    /manager will call you back in 30 minutes from 800-555-0100/.test(last(engaged)));
  check("no canned 'situation' phrasing anywhere", !eng.includes("situation"));

  console.log("===== Not interested (soft pivot, then graceful exit) =====");
  const dis = await run(["No thanks, not interested", "I said no thanks"]);
  const disAll = allLower(dis);
  check("not a lead", dis.goodLead === false);
  check("gave one soft pivot before exiting", /\b(understand|no commitment|no problem at all|hear you|safe one|fair enough|that's a fair answer|fair answer|totally fair)\b/.test(disAll));
  check("ended politely (graceful close)", /(hear you|take care|safe one|no problem at all|commit to anything|you lose nothing|take you off the list|give us a shout)/.test(last(dis)));
  check("did NOT ask field questions after rejection", !disAll.includes("your mc number") && !disAll.includes("can i grab your"));

  console.log("===== Total silence (no answer ever) =====");
  const silent = await run([]);
  const silAll = allLower(silent);
  check("not a lead", silent.goodLead === false);
  check("checked the line was open", silAll.includes("hello?") || silAll.includes("cut off") || silAll.includes("you still there"));
  check("closed gracefully on dead air (<=4 agent lines)", agentText(silent).length <= 4);

  console.log("===== Patchy answers (silence then answer) =====");
  const patchy = await run(["Hello", "", "MC 4455", "", "53ft", "", "Dallas", "", "Afternoon"]);
  check("call completed (closed)", patchy.transcript.length > 3);
  check("asked again after silence (retry occurred)", allLower(patchy).includes("didn't quite catch") || allLower(patchy).includes("say your"));

  console.log("===== Asks for a human =====");
  const human = await run(["Actually can I talk to a real person?"]);
  check("escalates to a human", human.escalateToHuman === true);
  check("transfers politely", allLower(human).includes("real people") || allLower(human).includes("real person"));

  console.log("===== Product sale (no callback): dispatcher close instead =====");
  const product = await run([
    "I'm great",
    "my name is Jen",
    "seven seven seven zero one two",
    "one two three four",
    "Sure, we need a reefer for this week",
    "53",
  ]);
  check("goodLead for product sale", product.goodLead === true);
  check("uses a real product close (not manager callback)", /(one load|backup|here's what happens next|set up your profile|next load|calendar|shake hands)/.test(allLower(product)));
  check("does NOT fake a manager call-back with no number set", !/manager will call you back/.test(allLower(product)));

  console.log("===== Own-voice echo must not be mistaken for the lead =====");
  // The opening contains "...tell you why I called." - the recognizer echoes
  // that fragment back as if the lead said it. It must be filtered as
  // self-echo (re-ask), not recorded as an answer.
  const echo = await run(["tell you why i called", "doing good", "John", "MC 7788", "555-0123", "Need a dry van"]);
  const echoAgent = agentText(echo).join(" ");
  const echoLeads = echo.transcript.filter((t) => t.role === "lead").map((t) => t.text);
  check("echoed fragment is NOT recorded as lead answer", !echoLeads.includes("tell you why i called"));
  check("line re-check fired after the echo", /are you still there|line dropped/.test(echoAgent));
  check("call still reaches the fields after echo was filtered", echoLeads.includes("doing good"));

  console.log("===== Every configured field is asked (no silent cap) =====");
  const full = await run([
    "I'm good",
    "John",
    "MC 101",
    "555-1000",
    "sure, need a load",
    "53",
    "Dallas",
    "today",
  ], { leadFields: ["NAME", "MC", "PHONE", "PICKUP", "TRUCK", "ORIGIN", "TIME"] });
  const fullAgent = agentText(full).join(" ").toLowerCase();
  check("asks all 7 configured fields", ["name", "mc", "phone", "pickup", "truck", "origin", "time"].every((f) => fullAgent.includes(f)));
  check("qualified with all answers", full.goodLead === true);

  console.log("===== Objection-aware pivots from the market playbook =====");
  const busy = await run(["I'm driving", "ok six pm", "MC 882", "555-0102", "Need a load", "53"]);
  check("busy driver gets a pinned callback slot", /(parked|shut down|call you|what time|calling you back)/.test(allLower(busy)));
  check("busy driver pivot is not pushy", !/not interested|no thanks/.test(allLower(busy)));

  const hasDisp = await run(["I already have my own dispatcher", "they're fine", "MC 112", "555-0103", "Need a reefer", "53"]);
  check("existing-dispatcher objection gets the one-load trial", /(one load|compare numbers|side by side|backup|why i'm calling)/.test(allLower(hasDisp)));

  const slowMarket = await run(["market is bad right now", "let me think", "MC 223", "555-0104", "dry van", "53"]);
  check("slow-market objection uses loss aversion", /(buck eighty eight|dollars a mile|walking away|leave.*behind|three grand|negotiate|tariff|counter every load)/.test(allLower(slowMarket)));

  const sendInfo = await run(["send me some info", "i book my own loads", "MC 334", "555-0105", "flatbed", "53"]);
  check("send-info objection qualifies before sending", /(who books|who.*handles|handle|dispatcher|one-pager|one pager)/.test(allLower(sendInfo)));

  console.log("===== Strategy learning tracks per-strategy wins =====");
  const learn = require("./agent/brain").learn;
  const before = { strategyScores: {}, techniqueScores: {}, calls: 0 };
  const afterGood = learn(before, { goodLead: true, strategies: ["hook_reason_first", "close_assumptive"] });
  const afterBad = learn(afterGood, { goodLead: false, strategies: ["hook_reason_first"] });
  check("good call bumps the strategies used", afterGood.strategyScores.hook_reason_first === 1 && afterGood.strategyScores.close_assumptive === 1);
  check("bad call nudges used strategies down", afterBad.strategyScores.hook_reason_first === 0.85);
  check("charm flow score tracks wins", afterGood.techniqueScores.charm_flow === 1);
  const top = require("./agent/brain").topStrategy(afterGood);
  check("topStrategy reports the winner for the cockpit", top && top.key === "hook_reason_first");
  const res = await run(["no thanks", "I said no"], { learning: afterGood });
  check("learned brain still reports strategies used", Array.isArray(res.strategies) && res.strategies.length >= 3);

  console.log("");
  console.log(`===== RESULT: ${pass} passed, ${fail} failed =====`);
  if (failures.length) console.log("Failures: " + failures.join(" | "));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(2); });