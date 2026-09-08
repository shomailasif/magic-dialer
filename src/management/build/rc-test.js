const tls = require("tls");
const crypto = require("crypto");
const dns = require("dns");
const https = require("https");

const PASS = process.env.RC_PASS;
const USER = process.env.RC_USER || "4807166685";

let failures = 0;
function ok(label, extra) { console.log("PASS  " + label + (extra ? "  (" + extra + ")" : "")); }
function fail(label, extra) { failures++; console.log("FAIL  " + label + (extra ? "  (" + extra + ")" : "")); }

const md5 = (s) => crypto.createHash("md5").update(s, "latin1").digest("hex");

function regRequest({ user, host, branch, tag, callid, auth }) {
  let head = "REGISTER sip:" + host + " SIP/2.0\r\n" +
    "Via: SIP/2.0/TLS 127.0.0.1:5099;branch=" + branch + ";rport\r\n" +
    "Max-Forwards: 70\r\n" +
    "From: <sip:" + user + "@" + host + ">;tag=" + tag + "\r\n" +
    "To: <sip:" + user + "@" + host + ">\r\n" +
    "Call-ID: " + callid + "@" + host + "\r\n" +
    "CSeq: " + (auth ? 2 : 1) + " REGISTER\r\n" +
    "Contact: <sip:" + user + "@127.0.0.1:5099;transport=tls>\r\n" +
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

function sipRegister(host, port, userLabel, cb) {
  const socket = tls.connect({ host: host, port: port, servername: host, rejectUnauthorized: false }, () => {
    console.log("      (TLS " + host + ":" + port + " handshake OK, sending REGISTER)");
    socket.write(regRequest({ user: userLabel, host: host, branch: "z9hG4bK-a" + Date.now(), tag: "t1", callid: "cid1" }));
  });
  let buf = "";
  let authed = false;
  const timer = setTimeout(() => { try { socket.destroy(); } catch (e) {} cb("timeout"); }, 15000);
  socket.on("error", (e) => { clearTimeout(timer); try { socket.destroy(); } catch (x) {} cb("error:" + e.code + " " + e.message); });
  socket.on("data", (d) => {
    buf += d.toString("latin1");
    if (buf.indexOf("\r\n\r\n") === -1) return;
    if (buf.split("\r\n\r\n")[0].indexOf("100 Trying") !== -1) { buf = ""; return; }
    const head = buf.split("\r\n\r\n")[0];
    const code = (/\s(\d{3})\s/.exec(head) || [])[1];
    if (code === "401" && !authed) {
      authed = true;
      const user = userLabel;
      const auth = digestFrom(head, user, PASS, host);
      buf = "";
      socket.write(regRequest({ user: user, host: host, branch: "z9hG4bK-b" + Date.now(), tag: "t2", callid: "cid1", auth: auth }));
      return;
    }
    clearTimeout(timer);
    try { socket.destroy(); } catch (e) {}
    cb(code);
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
  console.log("RingCentral line test  ::  user " + USER + "  pass len " + (PASS ? PASS.length : 0));
  console.log("(REGISTER only - no calls are placed during this test)\n");

  if (!PASS) { fail("password supplied"); return; }

  const resolves = [];
  for (const h of ["sip.ringcentral.com", "sip.phone.ringcentral.com", "platform.ringcentral.com"]) {
    await new Promise((res) => dns.resolve4(h, (e, a) => { resolves.push(h + "=" + (e ? "NONE" : a.join(","))); res(); }));
  }
  const okDns = resolves.some((r) => r.indexOf("NONE") === -1);
  okDns ? ok("DNS resolution for ringcentral domains", resolves.join(" ; ")) : fail("DNS resolution");

  const rest = await restReach("platform.ringcentral.com");
  rest.indexOf("http") === 0 ? ok("REST platform reachable", rest) : fail("REST platform reachable", rest);

  const variants = [];
  if (!/^\+/.test(USER)) variants.push("+" + USER);
  variants.push(USER);

  const endpointPairs = [["sip.ringcentral.com", 5061]];

  let anyOk = false;
  for (const v of variants) {
    for (const [h, p] of endpointPairs) {
      const verdict = await new Promise((res) => sipRegister(h, p, v, res));
      if (verdict === "200") { ok("SIP Direct-IP REGISTER authenticated (" + h + ":" + p + ") as username " + v); anyOk = true; break; }
      else if (verdict === "403") { fail("SIP REGISTER rejected - bad password/username (" + h + " as " + v + ")", verdict); break; }
      else if (verdict === "401") { fail("SIP REGISTER could not authenticate nonce (" + h + " as " + v + ")", verdict); break; }
      else { fail("SIP REGISTER reachability (" + h + ":" + p + " as " + v + ")", verdict); }
    }
    if (anyOk) break;
  }

  const numDigits = USER.replace(/\D/g, "");
  if (numDigits.length === 10) ok("Phone number format accepted (10-digit US)", USER);
  else fail("Phone number format check", USER + " -> " + numDigits.length + " digits");

  console.log("\nResult: " + (failures === 0 ? "ALL CHECKS PASSED - line is ready" : failures + " check(s) failed"));
  process.exit(failures === 0 ? 0 : 1);
})();