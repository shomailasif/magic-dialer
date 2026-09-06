// Deep end-to-end test of the admin portal: login, register, heartbeat,
// call-result with strategies, transcript API, disable control, installer
// download, and auth guards. Uses a throwaway DB + random port so it never
// touches the live deployment.
const { start } = require("./portal/server");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const ADMIN_PASSWORD = "test-admin-pass-2026";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "md-portal-test-"));
const dbPath = path.join(tmp, "portal.db");
const PORT = 8800 + Math.floor(Math.random() * 2000);
const BASE = `http://127.0.0.1:${PORT}`;

// Give the download route something to serve.
const installPath = path.join(__dirname, "..", "..", "..", "deploy", "MagicDialer-Setup.exe");
let installExists = fs.existsSync(installPath);

// The cloud (Postgres) deployment already has a live customers/calls table, so
// CREATE TABLE IF NOT EXISTS is not enough - the new columns must be migrated
// via ALTER TABLE. Guard that the source keeps those migrations.
const dbSrc = fs.readFileSync(path.join(__dirname, "portal", "db.js"), "utf8");
const PG_MIGRATIONS = ["settings TEXT", "call_list TEXT", "leads_found TEXT", "leads_searched_at BIGINT", "ADD COLUMN IF NOT EXISTS voip_ready", "ADD COLUMN IF NOT EXISTS strategies"];

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok) {
  if (ok) { pass++; console.log("  [PASS] " + name); }
  else { fail++; failures.push(name); console.log("  [FAIL] " + name); }
}

let cookie = "";
async function api(pathname, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body) headers["Content-Type"] = "application/json";
  if (cookie) headers["Cookie"] = cookie;
  const res = await fetch(BASE + pathname, { method: opts.method || "GET", headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}

(async () => {
  const server = await start({ dbPath, port: PORT, adminPassword: ADMIN_PASSWORD });

  console.log("===== Portal E2E =====");

  check("db.js carries Postgres migrations for the business-platform columns", PG_MIGRATIONS.every((m) => dbSrc.includes(m)));

  const loginPage = await fetch(BASE + "/login");
  const loginHtml = await loginPage.text();
  check("login page serves the brand", loginHtml.includes("Magic Dialer") && loginPage.status === 200);

  const badLogin = await api("/login", { method: "POST", body: { password: "nope" } });
  check("wrong password rejected (401)", badLogin.status === 401);

  const goodLogin = await api("/login", { method: "POST", body: { password: ADMIN_PASSWORD } });
  cookie = goodLogin.setCookie ? goodLogin.setCookie.split(";")[0] : "";
  check("correct password issues a session cookie", goodLogin.status === 200 && cookie.startsWith("session="));

  const unauthed = await fetch(BASE + "/api/calls");
  check("calls API requires admin login", unauthed.status === 401);

  const reg = await api("/api/register", {
    method: "POST",
    body: { product: "Dispatch Services to truckers", leadFields: ["NAME", "MC"], contactEmail: "customer@example.com", persona: "Shomail" },
  });
  check("register creates a customer with a token", reg.status === 200 && typeof reg.data.token === "string" && typeof reg.data.machineId === "string");
  const token = reg.data.token;

  const hb = await api("/api/heartbeat", { method: "POST", body: { token, voipReady: true } });
  check("agent heartbeat registers online + returns config", hb.status === 200 && hb.data.ok === true && hb.data.config.product === "Dispatch Services to truckers");

  const callPost = await api("/api/call-result", {
    method: "POST",
    body: {
      token,
      product: "Dispatch Services to truckers",
      transcript: [{ role: "agent", text: "This is Shomail from ZAZ Logistics." }, { role: "lead", text: "go ahead" }, { role: "agent", text: "great" }],
      score: 0.8,
      goodLead: true,
      escalateToHuman: false,
      strategies: ["hook_reason_first", "close_assumptive"],
      summary: "QUALIFIED LEAD",
      contactEmail: "customer@example.com",
    },
  });
  check("call result accepted (+ lead email path handled gracefully)", callPost.status === 200 && callPost.data.ok === true);

  const calls = await api("/api/calls");
  const mine = calls.data ? calls.data.calls.find((c) => c.product === "Dispatch Services to truckers") : null;
  check("call listed with strategies stored", mine && JSON.parse(mine.strategies).includes("hook_reason_first"));

  const detail = await api("/api/call?id=" + (mine ? mine.id : -1));
  const lines = detail.data && detail.data.call ? detail.data.call.transcript : "";
  check("single-call API returns transcript", typeof lines === "string" && lines.includes("ZAZ Logistics"));

  const dis = await api("/api/disable", { method: "POST", body: { token, disabled: true } });
  check("admin can disable a customer", dis.status === 200 && dis.data.disabled === true);
  const hb2 = await api("/api/heartbeat", { method: "POST", body: { token } });
  check("disabled customer is told to stop (disabled:true)", hb2.data && hb2.data.disabled === true);

  // --- Business-platform features: settings, call list, lead finding, edits ---
  const reg2 = await api("/api/register", {
    method: "POST",
    body: {
      product: "Heating oil delivery",
      leadFields: ["NAME", "PHONE", "ADDRESS"],
      contactEmail: "oil@example.com",
      persona: "Atlas",
      settings: { companyName: "Arctic Heat Co", callbackNumber: "800-555-0200", callbackIn: "2 hours", searchEnabled: true },
      callList: ["800-555-1001", "800-555-1002"],
    },
  });
  check("register accepts settings + initial call list", reg2.status === 200 && reg2.data.settings && reg2.data.settings.companyName === "Arctic Heat Co" && Array.isArray(reg2.data.callList) && reg2.data.callList.length === 2);
  const token2 = reg2.data.token;

  const hb2b = await api("/api/heartbeat", { method: "POST", body: { token: token2 } });
  check("heartbeat returns extended config (company, callback, call list, search flag)", hb2b.data.config.companyName === "Arctic Heat Co" && hb2b.data.config.callbackNumber === "800-555-0200" && hb2b.data.config.callList.length === 2 && hb2b.data.config.searchEnabled === true);

  const unauthPatch = await fetch(BASE + "/api/customer/" + token, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product: "x" }) });
  check("customer PATCH requires admin login", unauthPatch.status === 401);

  const patched = await api("/api/customer/" + token, {
    method: "PATCH",
    body: { product: "Dispatch Services to truckers across borders", settings: { companyName: "ZAZ Logistics", callbackNumber: "800-555-0100", callbackIn: "30 minutes", searchEnabled: true } },
  });
  check("admin edits the sales form through PATCH", patched.status === 200 && patched.data.customer.product === "Dispatch Services to truckers across borders" && patched.data.customer.settings.companyName === "ZAZ Logistics");

  const hb3 = await api("/api/heartbeat", { method: "POST", body: { token } });
  check("heartbeat reflects the edited sales form", hb3.data.config.companyName === "ZAZ Logistics" && hb3.data.config.product === "Dispatch Services to truckers across borders" && hb3.data.config.searchEnabled === true);

  const cl = await api("/api/customer/" + token + "/calllist", { method: "POST", body: { numbers: ["800-555-1001", "800-555-1002"] } });
  check("admin saves a call list", cl.status === 200 && cl.data.callList.length === 2);
  const hb4 = await api("/api/heartbeat", { method: "POST", body: { token } });
  check("heartbeat delivers the call list to the agent", Array.isArray(hb4.data.config.callList) && hb4.data.config.callList.length === 2);

  process.env.SEARCH_FIXED_JSON = JSON.stringify([
    { company: "Swift Freight Lines", source: "https://swift-freight.com", snippet: "Trucking company in need of dispatch services" },
    { company: "Transcan Hauling", source: "https://transcan-hauling.ca", snippet: "Canada-wide hauling brokerage" },
  ]);
  const ls = await api("/api/customer/" + token + "/leads/search", { method: "POST", body: {} });
  check("lead search returns + stores deterministic leads", ls.status === 200 && Array.isArray(ls.data.leads) && ls.data.leads.length === 2 && ls.data.leads[0].company === "Swift Freight Lines");
  const searchId = ls.data.leads[0].id;
  const leadsGet = await api("/api/customer/" + token + "/leads");
  check("GET leads returns stored leads + searched-at stamp", leadsGet.data.leads.length === 2 && leadsGet.data.searchedAt > 0);
  const rm = await api("/api/customer/" + token + "/leads/remove", { method: "POST", body: { id: searchId } });
  check("dismissed lead is removed", rm.status === 200 && rm.data.leads.length === 1 && rm.data.leads.every((l) => l.id !== searchId));
  delete process.env.SEARCH_FIXED_JSON;

  const download = await fetch(BASE + "/download/setup", { redirect: "manual" });
  const bytes = await download.arrayBuffer();
  const dlOk = installExists
    ? (download.status === 200 && bytes.byteLength > 0)
    : (download.status === 302 && String(download.headers.get("location") || "").includes("github.com/shomailasif/magic-dialer/releases/latest/download/MagicDialer-Setup.exe"));
  check("installer download serves bytes (or redirects to the GitHub release asset)", dlOk);

  const dash = await fetch(BASE + "/", { headers: { Cookie: cookie } });
  const dashHtml = await dash.text();
  check("dashboard shows the business platform UI (stat cards, sidebar, download link)", dashHtml.includes("Qualified calls") && dashHtml.includes("Command center") && dashHtml.includes("Download installer") && dashHtml.includes("Edit") && dashHtml.includes("Magic Dialer - Console"));

  await new Promise((r) => server.close(() => r()));
  console.log("");
  console.log(`===== RESULT: ${pass} passed, ${fail} failed =====`);
  if (failures.length) console.log("Failures: " + failures.join(" | "));
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("CRASH", e); process.exit(2); });