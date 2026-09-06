// Multi-portal isolation E2E.
//
// Launch scenario: the operator ships "different admin portals" (separate
// deployments, each with its own PORTAL_ID + admin password). The guarantee
// required by the business is: NO portal can see or count the users of another
// portal - even when two portals share the SAME database.
//
// This test runs two portal instances against the SAME sqlite file with
// different PORTAL_IDs and proves neither leaks users, calls, disable-power or
// outbox mail to the other.
const { start } = require("./portal/server");
const { sendEmail, listOutbox } = require("./portal/mailer");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "md-iso-"));
const dbFile = path.join(tmp, "shared.db");
const PA = 9100 + Math.floor(Math.random() * 300);
const PB = PA + 400;
const baseA = `http://127.0.0.1:${PA}`;
const baseB = `http://127.0.0.1:${PB}`;

let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log("  [PASS] " + name); }
  else { fail++; console.log("  [FAIL] " + name); }
}

function usePortal(id) { process.env.PORTAL_ID = id; }

async function api(base, pathname, opts = {}, cookie) {
  const res = await fetch(base + pathname, {
    method: opts.method || "GET",
    headers: { ...(opts.body != null ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  let data = null;
  if (ct.includes("application/json")) { try { data = JSON.parse(text); } catch {} }
  return { status: res.status, data, text, setCookie: res.headers.get("set-cookie") };
}

async function login(base, password) {
  const r = await api(base, "/login", { method: "POST", body: { password } });
  return r.setCookie ? r.setCookie.split(";")[0] : "";
}

(async () => {
  console.log("===== Portal isolation (two admin portals, ONE shared database) =====");

  usePortal("portal-alpha");
  const srvA = await start({ dbPath: dbFile, port: PA, adminPassword: "alpha-pass-2026" });
  usePortal("portal-beta");
  const srvB = await start({ dbPath: dbFile, port: PB, adminPassword: "beta-pass-2026" });

  const cookieA = await login(baseA, "alpha-pass-2026");
  const cookieB = await login(baseB, "beta-pass-2026");
  const badA = await login(baseB, "alpha-pass-2026");
  check("each portal has its own admin password", !!cookieA && !!cookieB && cookieA.startsWith("session=") && cookieB.startsWith("session="));
  check("alpha's password does not open beta", badA === "");

  // Register 3 customers on portal A, 5 on portal B (same physical database!).
  const aTokens = [];
  for (let i = 0; i < 3; i++) {
    const r = await api(baseA, "/api/register", { method: "POST", body: { product: "Portal-A customer " + i, leadFields: ["NAME", "MC"] } }, cookieA);
    check("portal A register #" + i, r.status === 200);
    aTokens.push(r.data.token);
  }
  const bTokens = [];
  for (let i = 0; i < 5; i++) {
    const r = await api(baseB, "/api/register", { method: "POST", body: { product: "Portal-B customer " + i, leadFields: ["NAME", "MC"] } }, cookieB);
    check("portal B register #" + i, r.status === 200);
    bTokens.push(r.data.token);
  }

  // Both listen on the same table now; prove reads are scoped per portal.
  const htmlA = (await api(baseA, "/", {}, cookieA)).text;
  const htmlB = (await api(baseB, "/", {}, cookieB)).text;
  check("portal A lists all its own customers", aTokens.every((t) => htmlA.includes(t)));
  check("portal B lists all its own customers", bTokens.every((t) => htmlB.includes(t)));
  check("portal A never lists a portal-B customer", !htmlA.includes("Portal-B customer") && bTokens.every((t) => !htmlA.includes(t)));
  check("portal B never lists a portal-A customer", !htmlB.includes("Portal-A customer") && aTokens.every((t) => !htmlB.includes(t)));

  // Cross-read: B's admin must get 404 for A's customer and vice versa.
  const readBofA = await api(baseB, "/api/customer/" + aTokens[0], {}, cookieB);
  const readAofB = await api(baseA, "/api/customer/" + bTokens[0], {}, cookieA);
  check("B cannot read A's customer (404)", readBofA.status === 404);
  check("A cannot read B's customer (404)", readAofB.status === 404);
  const ownA = await api(baseA, "/api/customer/" + aTokens[0], {}, cookieA);
  check("A CAN read its own customer", ownA.status === 200 && (ownA.data.customer.product || "").includes("Portal-A"));

  // Cross-power: A cannot disable/edit B's customer.
  const disAonB = await api(baseA, "/api/disable", { method: "POST", body: { token: bTokens[1], disabled: true } }, cookieA);
  const disBonA = await api(baseB, "/api/disable", { method: "POST", body: { token: aTokens[1], disabled: true } }, cookieB);
  const patchBonA = await api(baseB, "/api/customer/" + aTokens[1], { method: "PATCH", body: { product: "HACKED" } }, cookieB);
  check("A cannot disable B's user", disAonB.status === 404);
  check("B cannot disable A's user", disBonA.status === 404);
  check("B cannot edit A's user", patchBonA.status === 404);
  const stillEnabledA = await api(baseA, "/api/customer/" + aTokens[1], {}, cookieA);
  check("A's user is still enabled after B tried to disable it", stillEnabledA.status === 200 && stillEnabledA.data.customer.disabled === 0);
  const stillProductA = await api(baseA, "/api/customer/" + aTokens[0], {}, cookieA);
  check("A's user product is intact after B's edit attempt", stillProductA.data.customer.product === "Portal-A customer 0");

  // Heartbeat isolation: an agent on portal A cannot be used/seen by portal B.
  const hbAonA = await api(baseA, "/api/heartbeat", { method: "POST", body: { token: aTokens[0], machineId: "m-" + aTokens[0] } });
  const hbAonB = await api(baseB, "/api/heartbeat", { method: "POST", body: { token: aTokens[0], machineId: "m-" + aTokens[0] } });
  check("A's agent heartbeats fine on A", hbAonA.status === 200 && hbAonA.data.ok === true);
  check("A's agent is unknown on B (no cross-recognition)", hbAonB.status === 200 && hbAonB.data.ok === false);

  // Call isolation: calls logged under their own portal only.
  await api(baseA, "/api/call-result", { method: "POST", body: { token: aTokens[0], product: "Portal-A call", score: 0.9, goodLead: true, transcript: "A transcript", strategies: ["charm"] } });
  await api(baseB, "/api/call-result", { method: "POST", body: { token: bTokens[0], product: "Portal-B call", score: 0.7, goodLead: true, transcript: "B transcript", strategies: ["charm"] } });
  const callsA = (await api(baseA, "/api/calls", {}, cookieA)).data.calls;
  const callsB = (await api(baseB, "/api/calls", {}, cookieB)).data.calls;
  check("A's call log has exactly its own call", callsA.length === 1 && callsA[0].product === "Portal-A call" && callsA[0].customer_token === aTokens[0]);
  check("B's call log has exactly its own call", callsB.length === 1 && callsB[0].product === "Portal-B call" && callsB[0].customer_token === bTokens[0]);
  check("A's log does not contain B's call", callsA.every((c) => c.product !== "Portal-B call"));
  check("B's log does not contain A's call", callsB.every((c) => c.product !== "Portal-A call"));

  // Outbox (email) isolation at the store level.
  usePortal("portal-alpha");
  await sendEmail({ to: "t@s.com", subject: "Lead (A)", text: "outbox test A" });
  usePortal("portal-beta");
  await sendEmail({ to: "t@s.com", subject: "Lead (B)", text: "outbox test B" });
  usePortal("portal-alpha");
  const outA = listOutbox();
  usePortal("portal-beta");
  const outB = listOutbox();
  check("mailboxes are separate (A sees its own only)", outA.some((o) => o.content.includes("outbox test A")) && !outA.some((o) => o.content.includes("outbox test B")));
  check("mailboxes are separate (B sees its own only)", outB.some((o) => o.content.includes("outbox test B")) && !outB.some((o) => o.content.includes("outbox test A")));

  await new Promise((r) => srvA.close(() => r()));
  await new Promise((r) => srvB.close(() => r()));
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}

  console.log("");
  console.log(`===== RESULT: ${pass} passed, ${fail} failed =====`);
  if (fail) {
    console.log("Isolation test failed - a portal can see another portal's users!");
    process.exit(1);
  }
  process.exit(0);
})().catch((e) => { console.error("CRASH", e); process.exit(2); });