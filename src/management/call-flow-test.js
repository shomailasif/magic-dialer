const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const { start } = require("./portal/server");
const { runCall } = require("./agent/call-runner");

/**
 * Automated test of the whole AI call flow (no audio needed):
 *   - a GOOD lead is qualified, and archived/emailed
 *   - a NOT-INTERESTED lead is not qualified
 *   - escalation to a live human happens ONLY as a last resort
 * Run: node call-flow-test.js (expect PASS lines, RESULT: PASS)
 */

const PORT = 9100;
const URL = `http://localhost:${PORT}`;
const DB = path.join(os.tmpdir(), "autodial-callflow.db");
fs.rmSync(DB, { force: true });

// Build a fake hear that returns the next answer string in sequence.
function answerer(lines) {
  let i = 0;
  return async () => (i < lines.length ? lines[i++] : null);
}
const noopSpeak = async () => true;

let COOKIE = null;
function post(url, body) {
  const headers = { "Content-Type": "application/json" };
  if (COOKIE) headers.Cookie = COOKIE;
  return fetch(url, { method: "POST", headers, body: JSON.stringify(body) }).then((r) => r.json());
}
async function getJson(url) {
  const headers = {};
  if (COOKIE) headers.Cookie = COOKIE;
  const res = await fetch(url, { headers });
  const j = await res.json();
  console.log(`  [getJson ${url} -> ${res.status}]`);
  return j;
}
async function login() {
  const r = await fetch(URL + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "demopass" }),
  });
  const sc = r.headers.get("set-cookie");
  if (sc) COOKIE = sc.split(";")[0];
  return r.ok;
}

let failures = 0;
function check(name, cond) {
  if (!cond) failures++;
  console.log(`${cond ? "PASS" : "FAIL"}: ${name}`);
}

async function main() {
  console.log("Starting portal (isolated DB)...");
  const server = await start({ dbPath: DB, port: PORT, adminPassword: "demopass" });

  // Wait for readiness.
  for (let i = 0; i < 30; i++) {
    try { await fetch(URL + "/api/heartbeat", { method: "POST", body: "{}" }); break; } catch { await new Promise((r) => setTimeout(r, 300)); }
  }
  await login();

  const cust = await post(`${URL}/api/register`, {
    product: "Acme Roofing (roof repair)",
    leadFields: ["team size", "budget"],
    contactEmail: "acme@example.com",
    persona: "high-energy friendly female",
  });
  check("customer registered", !!cust.token && cust.product === "Acme Roofing (roof repair)");

  // --- GOOD LEAD: interested, asks cost ---
  const goodspeaker = answerer(["Oh, hi! Not bad at all.", "Sure! We're looking for someone soon.", "Yes, how much would a roof cost?"]);
  const good = await runCall({
    product: "Acme Roofing (roof repair)",
    leadFields: ["team size", "budget"],
    speak: noopSpeak,
    listen: goodspeaker,
    contactEmail: cust.contactEmail,
  });
  check("good lead scored as QUALIFIED", good.goodLead === true);
  check("good lead NOT escalated", good.escalateToHuman === false);

  const post1 = await post(`${URL}/api/call-result`, { token: cust.token, ...good });
  check("call result archived on portal", post1.ok === true);
  check("good-lead email went out (outbox)", post1.emailed && post1.emailed.delivered === false && !!post1.emailed.outboxFile);  // --- NOT-INTERESTED lead ---
  const none = await runCall({
    product: "Acme Roofing (roof repair)",
    leadFields: ["team size", "budget"],
    speak: noopSpeak,
    listen: answerer(["No thanks.", "I'm not interested.", "Please stop calling."]),
    contactEmail: cust.contactEmail,
  });
  check("not-interested lead NOT qualified", none.goodLead === false);

  // --- LAST RESORT only: lead keeps asking for a real person ---
  const asksHuman = await runCall({
    product: "Acme Roofing (roof repair)",
    leadFields: ["team size", "budget"],
    speak: noopSpeak,
    listen: answerer(["Can I talk to a real person?", "A real human please."]),
    contactEmail: cust.contactEmail,
  });
  check("escalates to human when lead asks for one", asksHuman.escalateToHuman === true);

  // Archive the other calls too.
  await post(`${URL}/api/call-result`, { token: cust.token, ...none });
  await post(`${URL}/api/call-result`, { token: cust.token, ...asksHuman });

  // Normal good lead should NOT escalate (already checked above).

  const list = await getJson(URL + "/api/calls");
  check("portal lists recorded calls", Array.isArray(list.calls) && list.calls.length >= 2);

  // Outbox check
  const out = await getJson(URL + "/api/outbox");
  check("outbox recorded the good-lead email", Array.isArray(out.outbox) && out.outbox.length >= 1);

  console.log(`\n=== RESULT: ${failures === 0 ? "PASS — AI call flow, qualification, escalation, and email all work" : `FAIL (${failures} problems)`} ===`);
  server.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error("TEST ERROR:", e); process.exit(1); });
