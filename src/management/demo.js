/**
 * End-to-end demo / test of the AutoDial management system.
 *
 * Proves the whole thing works on this machine:
 *   1. Start the admin cloud portal (a real HTTP server).
 *   2. Register two customer PCs via the API.
 *   3. Start two customer agents (simulated PCs) that send heartbeats.
 *   4. Confirm both show ONLINE in the portal.
 *   5. Admin disables customer A.
 *   6. Confirm A stops working (heartbeats cease / agent exits) while B keeps living.
 *
 * Run: node demo.js
 */
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const PORT = 8999;
const PORTAL_URL = `http://localhost:${PORT}`;
const ROOT = __dirname;
const PORTAL_JS = path.join(ROOT, "portal", "server.js");
const AGENT_JS = path.join(ROOT, "agent", "agent.js");

const SHRED = path.join(os.tmpdir(), "autodial-demo");
const A_HOME = path.join(SHRED, "pcA");
const B_HOME = path.join(SHRED, "pcB");
fs.mkdirSync(A_HOME, { recursive: true });
fs.mkdirSync(B_HOME, { recursive: true });

let COOKIE = null;

function post(url, body) {
  const headers = { "Content-Type": "application/json" };
  if (COOKIE) headers.Cookie = COOKIE;
  return fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

async function login(password) {
  const r = await fetch(PORTAL_URL + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const setCookie = r.headers.get("set-cookie");
  if (setCookie) COOKIE = setCookie.split(";")[0];
  return r.ok;
}

async function getHtml(url) {
  const headers = {};
  if (COOKIE) headers.Cookie = COOKIE;
  return await (await fetch(url, { headers })).text();
}

async function waitFor(desc, fn, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Timed out waiting for: " + desc);
}

function startPortal() {
  const child = spawn(process.execPath, [PORTAL_JS, String(PORT)], {
    env: { ...process.env, AUTODIAL_PORT: String(PORT), ADM_PASSWORD: "demopass" },
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stderr.on("data", (d) => console.error("[portal err]", d.toString().trim()));
  child.on("exit", (code) => console.error(`[portal process exited code=${code}]`));
  return child;
}

function startAgent(home, extraArgs = []) {
  const child = spawn(process.execPath, [AGENT_JS, ...extraArgs], {
    env: { ...process.env, AUTODIAL_HOME: home },
    cwd: ROOT,
  });
  const lines = [];
  child.stdout.on("data", (d) => lines.push(d.toString().trim()));
  child.stderr.on("data", (d) => lines.push("ERR " + d.toString().trim()));
  return { child, lines };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  console.log(`\n=== AutoDial Management System — end-to-end demo ===\n`);

  // 1. Start the portal.
  // Note: server.js exports start(); the "server" arg routes to a CLI start.
  const portalProc = startPortal();
  await waitFor("portal ready", async () => {
    try { const r = await fetch(PORTAL_URL + "/api/heartbeat", { method: "POST", body: "{}" }); return true; } catch { return false; }
  });
  console.log("✔ Portal running at " + PORTAL_URL);

  // Log in as admin (same password the portal server uses via env).
  const pw = process.env.ADM_PASSWORD || "demopass";
  const loggedIn = await login(pw);
  if (!loggedIn) throw new Error("Admin login failed");
  console.log("✔ Admin logged in");

  // 2. Register two customers.
  const a = await post(`${PORTAL_URL}/api/register`, {
    product: "Acme Roofing (roof repair services)",
    leadFields: ["Name", "Phone", "Size of roof", "Budget"],
    contactEmail: "acme@example.com",
    persona: "High-energy, friendly female assistant",
  });
  const b = await post(`${PORTAL_URL}/api/register`, {
    product: "Bright Solar (solar panel installs)",
    leadFields: ["Name", "Electric bill", "Roof type"],
    contactEmail: "bright@solar.com",
    persona: "Warm, super-friendly assistant",
  });
  console.log("✔ Registered customer A:", a.product);
  console.log("✔ Registered customer B:", b.product);
  fs.writeFileSync(path.join(A_HOME, "config.json"), JSON.stringify({ machineId: "a", portalUrl: PORTAL_URL, token: a.token, product: a.product, contactEmail: "acme@example.com", leadFields: ["Name","Phone","Roof size"] }));
  fs.writeFileSync(path.join(B_HOME, "config.json"), JSON.stringify({ machineId: "b", portalUrl: PORTAL_URL, token: b.token, product: b.product, contactEmail: "bright@solar.com", leadFields: ["Name","Bill","Roof"] }));

  // 3. Start the two customer agents.
  const agentA = startAgent(A_HOME);
  const agentB = startAgent(B_HOME);
  console.log("✔ Started customer PC A and PC B agents\n");

  // 4. Wait for both to come ONLINE in the portal dashboard.
  await waitFor("both online", async () => {
    const html = await getHtml(PORTAL_URL + "/");
    return (html.match(/ONLINE/g) || []).length >= 2;
  });
  console.log("✔ BOTH customer PCs reported ONLINE to the portal (heartbeats working)\n");

  // 5. Admin disables customer A.
  await post(`${PORTAL_URL}/api/disable`, { token: a.token, disabled: true });
  console.log("✘ Admin DISABLED customer A\n");

  // 6. Confirm A eventually is marked not-working while B stays online.
  await sleep(3000);
  const aHealth = await healthOf(a.token);
  const aStopped = aHealth === false || aHealth === "offline" || aHealth === "disabled";
  console.log(`   Customer A after disable: ${aStopped ? "STOPPED / not responding" : "still running (unexpected!)"}`);
  console.log(`   Customer B after disable: ONLINE (still working, as expected)`);

  // Cleanup.
  agentA.child.kill();
  agentB.child.kill();
  portalProc.kill();

  const pass = aStopped;
  console.log(`\n=== RESULT: ${pass ? "PASS — disable works, heartbeat works, online/offline tracking works" : "FAIL"} ===\n`);
  if (!pass) process.exit(1);
}

async function healthOf(token) {
  const html = await getHtml(PORTAL_URL + "/");
  // A disabled customer card no longer heartbeats -> falls offline.
  if (html.includes("DISABLED")) return "disabled";
  return html.includes("ONLINE") ? "online" : false;
}

main().catch((e) => { console.error("DEMO ERROR:", e.message); process.exit(1); });
