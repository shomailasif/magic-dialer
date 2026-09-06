// Agent-language E2E: the portal stores a per-customer `lang` (en/es/fr/de/pt/
// hi/auto), surfaces it on the heartbeat config for the agent, and persists it
// through the admin edit form. This is what lets one Magic Dialer fleet speak
// six languages from the operator dashboard without touching agent PCs.
const { start } = require("./portal/server");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "md-lang-"));
const dbFile = path.join(tmp, "lang.db");
const PORT = 9500 + Math.floor(Math.random() * 200);
const base = `http://127.0.0.1:${PORT}`;

let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) { pass++; console.log("  [PASS] " + name); }
  else { fail++; console.log("  [FAIL] " + name); }
}

async function api(pathname, opts = {}, cookie) {
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

(async () => {
  console.log("===== Agent language (lang) plumbing =====");
  process.env.PORTAL_ID = "main";
  const srv = await start({ dbPath: dbFile, port: PORT, adminPassword: "lang-pass-2026" });

  const cookie = (await api("/login", { method: "POST", body: { password: "lang-pass-2026" } })).setCookie.split(";")[0];

  // Register a customer with the default language.
  const reg = await api("/api/register", { method: "POST", body: { product: "Heating oil delivery", leadFields: ["NAME", "MC"], contactEmail: "a@b.c", persona: "Jeanne" } }, cookie);
  const token = reg.data.token;
  check("registered (default lang)", reg.status === 200 && !!token);

  // Heartbeat before any lang edit -> defaults to en.
  const hb1 = await api("/api/heartbeat", { method: "POST", body: { token } });
  check("heartbeat defaults lang to en", hb1.data && hb1.data.config && hb1.data.config.lang === "en");

  // Admin PATCH sets Spanish.
  const patch = await api(`/api/customer/${token}`, { method: "PATCH", body: { settings: { lang: "es", searchEnabled: true } } }, cookie);
  check("admin can set lang=es", patch.status === 200 && patch.data.customer && patch.data.customer.settings && patch.data.customer.settings.lang === "es");

  // Heartbeat now returns es -> the agent applies it via applyPortalConfig.
  const hb2 = await api("/api/heartbeat", { method: "POST", body: { token } });
  check("heartbeat carries configured lang", hb2.data.config.lang === "es");

  // Every supported value survives the round-trip.
  for (const lang of ["fr", "de", "pt", "hi", "auto"]) {
    const p = await api(`/api/customer/${token}`, { method: "PATCH", body: { settings: { lang } } }, cookie);
    const h = await api("/api/heartbeat", { method: "POST", body: { token } });
    check(`lang ${lang} round-trips`, p.status === 200 && h.data.config.lang === lang);
  }

  // Invalid values are rejected by the agent-side guard and never leak.
  const bad = await api(`/api/customer/${token}`, { method: "PATCH", body: { settings: { lang: "xx" } } }, cookie);
  const hbBad = await api("/api/heartbeat", { method: "POST", body: { token } });
  check("invalid lang never reaches the agent (stays 'auto')", bad.status === 200 && hbBad.data.config.lang === "auto");

  srv.close && srv.close();
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}

  console.log("");
  console.log(`===== RESULT: ${pass} passed, ${fail} failed =====`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });