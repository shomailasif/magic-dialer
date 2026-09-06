// Unit tests for the agent's portal-config application: the admin edits the
// sales form on the portal and the agent must persist only meaningful changes,
// rewrite the config only when something changed, and surface stats/activity.
const { applyPortalConfig, bumpStats } = require("./agent/agent");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log("  [PASS] " + name); }
  else { fail++; console.log("  [FAIL] " + name); }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "md-agent-test-"));
const cfgPath = path.join(tmp, "config.json");

const config = {
  machineId: "x",
  token: "t",
  product: "Dispatch Services to truckers",
  leadFields: ["NAME", "MC NUMBER"],
  contactEmail: "sa@zazlogistics.com",
  persona: "Shomail",
  portalUrl: "http://localhost:8787",
};

check("portal edit applies product", (() => {
  const changed = applyPortalConfig(config, { product: "Dispatch Services to truckers across borders" }, cfgPath);
  return changed === true && config.product === "Dispatch Services to truckers across borders";
})());

check("only writes the config file when nothing changed", (() => {
  applyPortalConfig(config, { product: config.product, persona: config.persona }, cfgPath);
  applyPortalConfig(config, { product: config.product, persona: config.persona }, cfgPath);
  const mtimeRest1 = fs.statSync(cfgPath).mtimeMs;
  applyPortalConfig(config, { product: config.product, persona: config.persona }, cfgPath);
  const mtimeRest2 = fs.statSync(cfgPath).mtimeMs;
  return Math.abs(mtimeRest1 - mtimeRest2) < 5;
})());

check("extended settings arrive (company, callback, call list, search flag)", (() => {
  const changed = applyPortalConfig(config, {
    companyName: "ZAZ Logistics",
    callbackNumber: "800-555-0100",
    callbackIn: "30 minutes",
    callList: ["800-555-1001", " 800-555-1002 "],
    searchEnabled: true,
  }, cfgPath);
  return changed === true &&
    config.companyName === "ZAZ Logistics" &&
    config.callbackNumber === "800-555-0100" &&
    config.callbackIn === "30 minutes" &&
    config.searchEnabled === true &&
    Array.isArray(config.callList) && config.callList.length === 2 && config.callList[1] === "800-555-1002";
})());

check("call-list update is detected (new content overwrites)", (() => {
  const changed = applyPortalConfig(config, { callList: ["800-555-0002", "800-555-0001"] }, cfgPath);
  return changed === true && config.callList.length === 2 && config.callList[0] === "800-555-0002";
})());

check("admin clearing the call list clears it (empty array is a valid command)", (() => {
  const changed = applyPortalConfig(config, { callList: [] }, cfgPath);
  return changed === true && Array.isArray(config.callList) && config.callList.length === 0;
})());

check("empty product / empty leadFields / null company are never applied", (() => {
  const before = JSON.stringify(config);
  applyPortalConfig(config, { product: "", leadFields: [], companyName: null, callbackNumber: "" }, cfgPath);
  return JSON.stringify(config) === before && config.companyName === "ZAZ Logistics";
})());

check("config file was persisted with the applied fields", (() => {
  const saved = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  return saved.product === config.product && saved.companyName === "ZAZ Logistics" && saved.searchEnabled === true && (saved.activity || []).some((a) => a.msg.includes("portal"));
})());

check("bumpStats rolls over daily counters", (() => {
  const c = { stats: { since: "2026-01-01", day: "2000-01-01", calls: 5, qualified: 2, today: 5, qualifiedToday: 2, lastScore: 0.5, bestScore: 0.9, qualifiedRate: 0.4 } };
  const s = bumpStats(c, { goodLead: true, score: 0.85 });
  return s.today === 1 && s.qualifiedToday === 1 && s.calls === 6 && s.qualified === 3 && s.lastScore === 0.85 && s.bestScore === 0.9;
})());

console.log("");
console.log(`RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);