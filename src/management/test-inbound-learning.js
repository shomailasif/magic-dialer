const { handleInboundText, answerInboundCall } = require("./agent/inbound");
const { learn } = require("./agent/brain");

/**
 * Tests for incoming calls/texts + AI learning.
 * Run: node test-inbound-learning.js (expect RESULT: PASS)
 */

let failures = 0;
function check(name, cond) {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}`);
}

// --- Incoming texts ---
const price = handleInboundText({ product: "Acme Solar", message: "How much does it cost?" });
check("inbound price text -> replies warmly", price.leadLikely === true && /price|what you're looking/.test(price.text.toLowerCase()));

const buy = handleInboundText({ product: "Acme Solar", message: "Hi, I want to sign up!" });
check("inbound buy text -> sale inquiry", buy.leadLikely === true);

const stop = handleInboundText({ product: "Acme Solar", message: "Please stop" });
check("inbound 'stop' -> does NOT treat as a lead", stop.leadLikely === false);

// --- Incoming call ---
const call = answerInboundCall({ product: "Acme Solar" });
check("inbound call -> friendly greeting exists", typeof call.text === "string" && call.text.includes("Autumn"));

// --- AI learning ---
let learning = {};
const afterGood = learn(learning, { goodLead: true });
const afterBad = learn(afterGood, { goodLead: false });
const key = "charm_flow";
check("learning records a technique score", typeof afterBad.techniqueScores === "object" && typeof afterBad.techniqueScores[key] === "number");
check("learning improves after a good lead", (afterGood.techniqueScores[key] || 0) > 0);
check("learning pulls down after a bad result", afterBad.techniqueScores[key] < afterGood.techniqueScores[key]);

console.log(`\n=== RESULT: ${failures === 0 ? "PASS — inbound calls/texts + AI learning all work" : `FAIL (${failures})`} ===`);
process.exit(failures === 0 ? 0 : 1);
