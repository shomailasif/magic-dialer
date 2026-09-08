const tls = require("tls");
const net = require("net");
const crypto = require("crypto");
const dns = require("dns");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");

//
// Provider-aware VOIP line probe. Reads the installed agent config
// (%USERPROFILE%\.magicdialer\config.json -> voip) and proves the line:
//   DNS        -> provider host resolves
//   REST       -> the provider gateway is reachable over 443 (some vendors)
//   REGISTER   -> SIP REGISTER + digest auth completes (200 OK)
// Place no calls. Override with V_USER / V_PASS env when the config'd line
// should not be used (the harness never writes anything).
//

const HOSTED_SERVERS = {
  ringcentral: "sip.ringcentral.com",
  twilio: "sip-1042-sip.twilio.com",
  vonage: "sip.nexmo.com",
  plivo: "sip.plivo.com",
  thinq: "sip.thinq.com",
  flowroute: "sip.flowroute.com",
  myexotel: "voip.myexotel.com",
};
const REST_HOSTS = { ringcentral: "platform.ringcentral.com" };

function configVoip() {
  try {
    const p = path.join(os.homedir(), ".magicdialer", "config.json");
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, "utf8"));
      return cfg.voip || {};
    }
  } catch {}
  return {};
}

const v = configVoip();
const USER = process.env.V_USER || v.username || "";
const PASS = process.env.V_PASS || v.sipPassword || "";
const PROVIDER = process.env.V_PROVIDER || v.provider || "custom";
const NUMBER = v.number || "";
const TRANSPORT = v.transport || "tls";
const server = v.server || HOSTED_SERVERS[PROVIDER] || "";
const HOST = process.env.V_HOST || server;
const PORT = Number(v.port || 0) || (TRANSPORT === "udp" ? 5060 : 5061);

let failures = 0;
function ok(label, extra) { console.log("PASS  " + label + (extra ? "  (" + extra + ")" : "")); }
function fail(label, extra) { failures++; console.log("FAIL  " + label + (extra ? "  (" + extra + ")" : "")); }

const md5 = (s) => crypto.createHash("md5").update(s, "latin1").digest("hex");

function regRequest({ user, host, port, transport, branch, tag, callid, auth }) {
  let head = "REGISTER sip:" + host + " SIP/2.0\r\n" +
    "Via: SIP/2.0/" + transport.toUpperCase() + " 127.0.0.1:" + port + ";branch=" + branch + ";rport\r\n" +
    "Max-Forwards: 70\r\n" +
    "From: <sip:" + user + "@" + host + ">;tag=" + tag + "\r\n" +
    "To: <sip:" + user + "@" + host + ">\r\n" +
    "Call-ID: " + callid + "@" + host + "\r\n" +
    "CSeq: " + (auth ? 2 : 1) + " REGISTER\r\n" +
    "Contact: <sip:" + user + "@127.0.0.1:" + port + ";transport=" + transport + ">\r\n" +
    "Expires: 3600\r\n" +
    "User-Agent: MagicDialer/1.0\r\n";
  if (auth) head += "Authorization: " + auth + "\r\n";
  head += "Content-Length: 0\r\n\r\n";
  return head;
}

function digestFrom(headers, user, pass, host) {
  const nonce = /nonce="([^"]+)"/.exec(headers);
  const realmMatch = /realm="([^"]+)"/.exec(headers);
  const realm = realmMatch ? realmMatch[1] : host;
  const algo = (/algorithm=([^,\s]+)/.exec(headers) || [])[1] || "MD5";
  const uri = "sip:" + host;
  const HA1 = md5(user + ":" + realm + ":" + pass);
  const HA2 = md5("REGISTER:" + uri);
  const response = md5(HA1 + ":" + nonce[1] + ":" + HA2);
  return 'Digest username="' + user + '", realm="' + realm + '", nonce="' + nonce[1] + '", uri="' + uri + '", algorithm=' + algo + ', response="' + response + '"';
}

function sipRegister(host, port, transport, userLabel, cb) {
  const opts = { host: host, port: port, timeout: 15000 };
  const onConnect = (sock) => {
    console.log("      (" + transport + " " + host + ":" + port + " connected, sending REGISTER)");
    sock.write(regRequest({ user: userLabel, host: host, port: port, transport: transport, branch: "z9hG4bK-a" + Date.now(), tag: "t1", callid: "cid1" }));
  };
  const sock = transport === "tls"
    ? tls.connect(Object.assign(opts, { servername: host, rejectUnauthorized: false }), () => onConnect(sock))
    : net.connect(opts, () => onConnect(sock));
  let buf = "";
  let authed = false;
  const timer = setTimeout(() => { try { sock.destroy(); } catch (e) {} cb("timeout"); }, 20000);
  sock.on("error", (e) => { clearTimeout(timer); try { sock.destroy(); } catch (x) {} cb("error:" + e.code + " " + e.message); });
  sock.on("data", (d) => {
    buf += d.toString("latin1");
    if (buf.indexOf("\r\n\r\n") === -1) return;
    const block = buf.split("\r\n\r\n")[0];
    if (block.indexOf("100 Trying") !== -1) { buf = ""; return; }
    const code = (/\s(\d{3})\s/.exec(block) || [])[1];
    if (code === "401" && !authed) {
      authed = true;
      const auth = digestFrom(block, userLabel, PASS, host);
      buf = "";
      sock.write(regRequest({ user: userLabel, host: host, port: port, transport: transport, branch: "z9hG4bK-b" + Date.now(), tag: "t2", callid: "cid1", auth: auth }));
      return;
    }
    clearTimeout(timer);
    try { sock.destroy(); } catch (e) {}
    cb(code || "no-code");
  });
}

function restReach(host) {
  return new Promise((resolve) => {
    const req = https.request({ host: host, path: "/", method: "GET", timeout: 10000, rejectUnauthorized: false }, (res) => {
      res.resume(); resolve("http " + res.statusCode);
    });
    req.on("error", (e) => resolve("err:" + e.code));
    req.on("timeout", () => { req.destroy(); resolve("timeout"); });
    req.end();
  });
}

(async () => {
  console.log("VOIP line probe  ::  provider=" + PROVIDER + "  username=" + USER + "  pass len=" + (PASS ? PASS.length : 0));
  console.log("   configured  :  server=" + (HOST || "(none)") + " port=" + PORT + " transport=" + TRANSPORT);
  console.log("   caller id   :  " + (NUMBER || "(none)") + "");
  console.log("(REGISTER only - no calls are placed during this test)\n");

  if (!PASS) { fail("password present (config voip.sipPassword or V_PASS)"); }
  if (!USER) { fail("username present (config voip.username or V_USER)"); }
  if (!HOST) { fail("SIP server known (config voip.server or hosted default for " + PROVIDER + ")"); }
  if (!USER || !PASS || !HOST) { console.log("\nResult: " + failures + " check(s) failed - no line to probe"); process.exit(failures === 0 ? 0 : 1); }

  await new Promise((res) => dns.resolve4(HOST, (e, a) => {
    e ? fail("DNS resolution for " + HOST, "NONE") : ok("DNS resolution for " + HOST, a.join(","));
    res();
  }));

  const restHost = REST_HOSTS[PROVIDER];
  if (restHost) {
    const rest = await restReach(restHost);
    rest.indexOf("http") === 0 ? ok("REST gateway reachable (" + restHost + ")", rest) : fail("REST gateway reachable (" + restHost + ")", rest);
  }

  const numDigits = (NUMBER || USER).replace(/\D/g, "");
  if (numDigits.length >= 7) ok("phone number format accepted", NUMBER || USER);
  else if (numDigits.length === 0) fail("phone number format check", "no digits found");
  else fail("phone number format check", NUMBER + " -> " + numDigits.length + " digits");

  const variants = [];
  const base = /^\+/.test(USER) ? USER : USER;
  if (!/^\+/.test(base)) variants.push("+" + base);
  variants.push(base);

  if (TRANSPORT === "udp") {
    console.log("  (udp REGISTER needs a UDP socket - not covered by this harness; use transport tls/tcp)");
  }

  let anyOk = false;
  for (const vv of variants) {
    const verdict = await new Promise((res) => sipRegister(HOST, PORT, TRANSPORT, vv, res));
    if (verdict === "200") { ok("SIP REGISTER authenticated (" + HOST + ":" + PORT + " " + TRANSPORT + ") as " + vv); anyOk = true; break; }
    else if (verdict === "403") { fail("SIP REGISTER rejected - bad credentials (" + HOST + " as " + vv + ")", verdict); break; }
    else if (verdict === "401") { fail("SIP REGISTER could not complete digest (" + HOST + " as " + vv + ")", verdict); break; }
    else { fail("SIP REGISTER reachability (" + HOST + ":" + PORT + " " + TRANSPORT + " as " + vv + ")", verdict); }
  }
  if (!anyOk && (TRANSPORT === "tcp")) {
    console.log("  (tip: on networks that throttle SIP, re-run from a phone hotspot)");
  }

  console.log("\nResult: " + (failures === 0 ? "ALL CHECKS PASSED - line is ready" : failures + " check(s) failed"));
  process.exit(failures === 0 ? 0 : 1);
})();