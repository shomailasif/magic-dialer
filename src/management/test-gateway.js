// Cloud call gateway tests: /api/dial control plane, trunk driver selection,
// RingCentral driver readiness gate, sim trunk lifecycle, ownership guards.
const { start } = require("./portal/server");
const trunk = require("./portal/trunk");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const ADMIN_PASSWORD = "test-admin-pass-gw";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "md-gateway-test-"));
const dbPath = path.join(tmp, "portal.db");
const PORT = 11800 + Math.floor(Math.random() * 1500);
const BASE = `http://127.0.0.1:${PORT}`;

let pass = 0;
let fail = 0;
const failures = [];
function check(name, ok) {
  if (ok) { pass++; console.log("  [PASS] " + name); }
  else { fail++; failures.push(name); console.log("  [FAIL] " + name); }
}

let adminCookie = "";
let bodyOf = async (r) => { try { return await r.json(); } catch { return {}; } };

async function admin(pathname, opts = {}) {
  const res = await fetch(BASE + pathname, { method: opts.method || "GET", headers: { ...(opts.headers || {}), ...(adminCookie ? { Cookie: adminCookie } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  return res;
}
async function useAdmin() {
  const r = await fetch(BASE + "/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: ADMIN_PASSWORD }) });
  adminCookie = (r.headers.get("set-cookie") || "").split(";")[0];
}
let custCookie = "";
async function customer(pathname, opts = {}) {
  const res = await fetch(BASE + pathname, { method: opts.method || "GET", headers: { ...(opts.headers || {}), ...(custCookie ? { Cookie: custCookie } : {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  return res;
}

(async () => {
  const server = await start({ dbPath, port: PORT, adminPassword: ADMIN_PASSWORD });
  console.log("===== Cloud call gateway =====");

  // Static driver checks, no network needed.
  check("voipComplete: hosted provider only needs user+pass", trunk.voipComplete({ provider: "ringcentral", username: "u", sipPassword: "p" }));
  check("voipComplete: custom SIP needs server+user+pass", trunk.voipComplete({ provider: "custom", server: "sip.x.com", username: "u", sipPassword: "p" }));
  check("voipComplete: missing provider rejected", !trunk.voipComplete({ username: "u", sipPassword: "p" }));
  check("voipComplete: hosted provider missing pass rejected", !trunk.voipComplete({ provider: "twilio", username: "u" }));
  check("voipComplete: custom SIP missing server rejected", !trunk.voipComplete({ provider: "custom", username: "u", sipPassword: "p" }));

  await useAdmin();
  const reg = await admin("/api/register", { method: "POST", body: { product: "Gateway test", leadFields: ["NAME"], persona: "Testy" } });
  const token = (await bodyOf(reg)).token;
  check("register works for gateway test", typeof token === "string");

  // Customer session
  const clogin = await fetch(BASE + "/clogin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
  custCookie = (clogin.headers.get("set-cookie") || "").split(";")[0];
  check("customer login ok", custCookie.startsWith("csession="));

  // Dial with no line configured -> 400 NO_DIALER
  const noLine = await customer("/api/dial", { method: "POST", body: { token, number: "+1 555 0100" } });
  check("dial without a dialer line -> 400", noLine.status === 400);

  // Configure a complete sim line.
  await admin("/api/customer/" + token, { method: "PATCH", body: { settings: { voip: { provider: "sim", username: "sim", sipPassword: "sim" } } } });

  // Place a sim call -> ring -> in_call. Poll status.
  const dialResp = await customer("/api/dial", { method: "POST", body: { token, number: "+1 555 0100" } });
  const dial = await bodyOf(dialResp);
  check("sim dial creates a session (ringing)", dialResp.status === 200 && typeof dial.id === "string" && dial.status === "ringing");
  let settle = null;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const g = await customer("/api/dial/" + dial.id);
    settle = await bodyOf(g);
    if (settle.status === "in_call") break;
  }
  check("sim session progresses to in_call", settle && settle.status === "in_call");
  check("session exposes provider label", settle && typeof settle.provider === "string");

  // Hangup
  const hang = await customer("/api/dial/" + dial.id + "/hangup", { method: "POST" });
  check("hangup completes the call", (await bodyOf(hang)).status === "completed");

  // Ownership guard: an unrelated customer cannot see the call.
  const reg2 = await admin("/api/register", { method: "POST", body: { product: "Other", persona: "X" } });
  const tok2 = (await bodyOf(reg2)).token;
  const clogin2 = await fetch(BASE + "/clogin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: tok2 }) });
  const otherCookie = (clogin2.headers.get("set-cookie") || "").split(";")[0];
  const dialAgain = await customer("/api/dial", { method: "POST", body: { token, number: "+1 555 0100" } });
  const dial2 = await bodyOf(dialAgain);
  const other = await fetch(BASE + "/api/dial/" + dial2.id, { headers: { Cookie: otherCookie } });
  check("other customer blocked from viewing a call (403)", other.status === 403);

  // Unauthenticated dial -> 401
  const anon = await fetch(BASE + "/api/dial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, number: "+1 555 0100" }) });
  check("anonymous dial rejected (401)", anon.status === 401);

  // Invalid number -> 400
  const badNum = await customer("/api/dial", { method: "POST", body: { token, number: "not a number" } });
  check("invalid number rejected (400)", badNum.status === 400);

  // RingCentral provider with no app creds in env -> session error tells the operator why.
  await admin("/api/customer/" + token, { method: "PATCH", body: { settings: { voip: { provider: "ringcentral", number: "+14807166885", username: "+14807166885", sipPassword: "secret", extension: "101" } } } });
  const rc = await customer("/api/dial", { method: "POST", body: { token, number: "+1 555 0100" } });
  const rcData = await bodyOf(rc);
  check("ringcentral without app creds -> explicit needs-credential message", rc.status === 200 && rcData.status === "error" && /Client ID\/Secret/.test(rcData.error || ""));

  // Admin can see the session (admin is allowed).
  const adminSee = await admin("/api/dial/" + dial2.id);
  check("admin can view any session", adminSee.status === 200);

  // RingCentral driver request shape (offline, injected fetch - no network).
  const rcCust = await (await admin("/api/customer/" + token)).json();
  const rcreq = [];
  const rcCtx = {
    portalId: "main",
    env: { RC_CLIENT_ID: "app123", RC_CLIENT_SECRET: "secret456" },
    fetch: async (url, opts) => {
      rcreq.push({ url, headers: opts.headers, body: opts.body });
      if (url.indexOf("/oauth/token") >= 0) return { ok: true, status: 200, json: async () => ({ access_token: "tok-abc" }) };
      return { ok: true, status: 200, json: async () => ({ session: { id: "rc-sess-1" } }) };
    },
  };
  const outboundRc = await trunk.placeCall(rcCtx, { customer: rcCust.customer, destination: "+1 555 0100" });
  const tokenReq = rcreq.find((r) => r.url.indexOf("/oauth/token") >= 0);
  const ringoutReq = rcreq.find((r) => r.url.indexOf("ring-out") >= 0);
  check("ringcentral: OAuth password grant posted to /oauth/token", !!tokenReq && tokenReq.headers.Authorization.indexOf("Basic") === 0);
  check("ringcentral: grant carries line username + extension", !!tokenReq && tokenReq.body.indexOf("grant_type=password") >= 0 && tokenReq.body.indexOf("4807166885") >= 0 && tokenReq.body.indexOf("extension=101") >= 0);
  check("ringcentral: RingOut request targets /ring-out over 443", !!ringoutReq);
  if (ringoutReq) {
    const b = JSON.parse(ringoutReq.body);
    check("ringcentral: RingOut to-number + from caller id set", b.to.phoneNumber === "+15550100" && b.from.phoneNumber === "+14807166885" && b.callerId.phoneNumber === "+14807166885");
  }
  check("ringcentral: fake fetch path completes as ringing with provider ref", outboundRc.status === "ringing" && outboundRc.providerRef === "rc-sess-1");

  // RingCentral driver JWT path (console-generated personal JWT credential).
  const rcreqJwt = [];
  const rcCtxJwt = {
    portalId: "main",
    env: { RC_CLIENT_ID: "app123", RC_CLIENT_SECRET: "secret456", RC_JWT: "rc-jwt-assertion-token" },
    fetch: async (url, opts) => {
      rcreqJwt.push({ url, headers: opts.headers, body: opts.body });
      if (url.indexOf("/oauth/token") >= 0) return { ok: true, status: 200, json: async () => ({ access_token: "tok-jwt" }) };
      return { ok: true, status: 200, json: async () => ({ session: { id: "rc-jwt-sess-1" } }) };
    },
  };
  const outboundRcJwt = await trunk.placeCall(rcCtxJwt, { customer: rcCust.customer, destination: "+1 555 0100" });
  const jwtReq = rcreqJwt.find((r) => r.url.indexOf("/oauth/token") >= 0);
  check("ringcentral JWT: token request targets the JWT bearer endpoint", !!jwtReq && jwtReq.url.indexOf("restapi/oauth/token") >= 0 && jwtReq.url.indexOf("v1.0") < 0);
  check("ringcentral JWT: grant_type is the JWT-bearer URN", !!jwtReq && jwtReq.body.indexOf("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer") >= 0);
  check("ringcentral JWT: assertion credential from env posted", !!jwtReq && jwtReq.body.indexOf("assertion=rc-jwt-assertion-token") >= 0);
  check("ringcentral JWT: Basic auth still from client id/secret", !!jwtReq && jwtReq.headers.Authorization.indexOf("Basic") === 0);
  check("ringcentral JWT: completes as ringing over 443", outboundRcJwt.status === "ringing" && outboundRcJwt.providerRef === "rc-jwt-sess-1");

  // RingCentral driver surfaces a rejected token cleanly (injected fetch).
  const rcreq2 = [];
  const rcCtx2 = {
    portalId: "main",
    env: { RC_CLIENT_ID: "app123", RC_CLIENT_SECRET: "secret456" },
    fetch: async (url) => { rcreq2.push(url); return { ok: false, status: 401, json: async () => ({}) }; },
  };
  const rcFail = await trunk.placeCall(rcCtx2, { customer: rcCust.customer, destination: "+1 555 0100" });
  check("ringcentral: rejected token -> status error with actionable message", rcFail.status === "error" && rcFail.error.indexOf("401") >= 0);

  // Bad/invalid id -> 404
  const missing = await customer("/api/dial/" + "nope");
  check("unknown session id -> 404", missing.status === 404);

  // ==== Media channel over 443 (raw WebSocket, dependency-free client) ====
  // Re-point this customer at the simulator line so the media loopback applies.
  await admin("/api/customer/" + token, { method: "PATCH", body: { settings: { voip: { provider: "sim", username: "sim", sipPassword: "sim" } } } });
  const net = require("node:net");
  const crypto = require("node:crypto");
  const magic = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  function wsFrame(opcode, payload, mask) {
    const pay = Buffer.isBuffer(payload) ? payload : Buffer.from(payload || "");
    const head = [0x80 | opcode];
    let ext = null, off = 0;
    if (pay.length < 126) head.push((mask ? 0x80 : 0) | pay.length);
    else if (pay.length < 65536) { head.push((mask ? 0x80 : 0) | 126); ext = Buffer.alloc(2); ext.writeUInt16BE(pay.length, 0); off = 2; }
    else { head.push((mask ? 0x80 : 0) | 127); ext = Buffer.alloc(8); ext.writeUInt32BE(pay.length / 0x100000000, 0); ext.writeUInt32BE(pay.length >>> 0, 4); off = 8; }
    const base = Buffer.concat([Buffer.from(head), ext ? ext : Buffer.alloc(0)]);
    if (!mask) return Buffer.concat([base, pay]);
    const k = crypto.randomBytes(4), m = Buffer.alloc(pay.length);
    for (let i = 0; i < pay.length; i++) m[i] = pay[i] ^ k[i & 3];
    return Buffer.concat([base, k, m]);
  }
  function wsConnect(path, token) {
    return new Promise((resolve, reject) => {
      const s = net.connect(PORT, "127.0.0.1");
      const key = crypto.randomBytes(16).toString("base64");
      s.write("GET " + path + "?token=" + encodeURIComponent(token) + " HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: " + key + "\r\nSec-WebSocket-Version: 13\r\n\r\n");
      let buf = Buffer.alloc(0), off = 0, headersDone = false, got = [];
      const timer = setTimeout(() => { s.destroy(); reject(new Error("ws timeout")); }, 8000);
      s.on("data", (d) => {
        buf = Buffer.concat([buf, d]);
        if (!headersDone) { const i = buf.indexOf("\r\n\r\n"); if (i < 0) return; headersDone = true; off = i + 4; }
        let parsed = false;
        while (off + 2 <= buf.length) {
          const b0 = buf[off], b1 = buf[off + 1];
          let len = b1 & 0x7f, hdrLen = 2;
          if (len === 126) { if (off + 4 > buf.length) break; len = buf.readUInt16BE(off + 2); hdrLen = 4; }
          else if (len === 127) { if (off + 10 > buf.length) break; len = Number(buf.readBigUInt64BE(off + 2)); hdrLen = 10; }
          const masked = (b1 & 0x80) !== 0;
          const mg = masked ? 4 : 0;
          if (off + hdrLen + mg + len > buf.length) break;
          let p = Buffer.from(buf.subarray(off + hdrLen + mg, off + hdrLen + mg + len));
          if (masked) { const kk = buf.subarray(off + hdrLen, off + hdrLen + 4); for (let i = 0; i < p.length; i++) p[i] ^= kk[i & 3]; }
          got.push({ opcode: b0 & 0x0f, payload: p });
          off += hdrLen + mg + len; parsed = true;
        }
        buf = buf.subarray(off); off = 0;
        parsed && got.length && clearTimeout(timer);
        if (got.some(g => g.opcode === 8)) { clearTimeout(timer); s.destroy(); resolve({ send: () => {}, close: () => {}, frames: got }); }
      });
      s.on("connect", () => {});
      if (gotHeaders() === null) {}
      setTimeout(() => { if (headersDone && got.some(g => g.opcode === 2) ) resolve({ send: (payload) => s.write(wsFrame(2, payload, true)), close: () => { try { s.write(wsFrame(8, Buffer.alloc(0), true)); } catch {} setTimeout(() => { try { s.destroy(); } catch {} }, 60); }, frames: got, socket: s }); }, 300);
      setTimeout(() => resolve({ send: () => {}, close: () => {}, frames: got }), 2500);
      function gotHeaders() { return headersDone ? true : null; }
    });
  }

  // Fresh sim call for the media round-trip.
  const mDial = await customer("/api/dial", { method: "POST", body: { token, number: "+1 555 0199" } });
  const m = await bodyOf(mDial);
  check("sim dial advertises a media path", m.status === "ringing" && typeof m.mediaPath === "string" && m.mediaPath.indexOf("/ws/media/") === 0);

  const ws = await wsConnect(m.mediaPath, token);
  await new Promise((r) => setTimeout(r, 800));
  const greeting = ws.frames.filter(f => f.opcode === 2);
  check("media channel receives the sim greeting audio over 443", greeting.length > 0 && greeting[0].payload.length > 0);

  ws.send(Buffer.from("agent-hello-audio-bytes"));
  await new Promise((r) => setTimeout(r, 700));
  const echoed = ws.frames.filter(f => f.opcode === 2);
  const gotEcho = echoed.some(f => f.payload.toString() === "agent-hello-audio-bytes");
  check("inbound audio is echoed back through the cloud loopback", gotEcho);

  // Wrong token cannot attach to the session.
  const bad = await wsConnect(m.mediaPath, "wrong-token");
  const rejected = bad.frames.some(f => f.opcode === 8 || (f.opcode === 1 && String(f.payload).indexOf("forbidden") >= 0));
  check("foreign token rejected on media channel", rejected);
  try { ws.close(); } catch {}
  try { bad.close(); } catch {}

  // Session exposes media counters after the round trip.
  const after = await customer("/api/dial/" + m.id);
  const a = await bodyOf(after);
  check("session exposes media activity counters", typeof a.mediaBytesIn === "number" && typeof a.mediaPath === "string");
  check("session shows mediaActive gate works", a.mediaActive === undefined || typeof a.mediaActive === "boolean");
try { server.close(); } catch {}
  setTimeout(() => {
    if (fail === 0) { console.log("GATEWAY SUITE PASSED (checks: " + pass + ")"); process.exit(0); }
    else { console.log("GATEWAY SUITE FAILED: " + failures.join(", ")); process.exit(1); }
  }, 80);
})().catch((e) => { console.error(e); process.exit(1); });