const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const { HEARTBEAT_INTERVAL_MS } = require("../shared/protocol");
const { setUi } = require("./ui");
const { topStrategy } = require("./brain");

/**
 * Customer PC agent.
 *
 * Runs on a customer's machine. It:
 *   - holds a local config (machine identity + its portal + its token)
 *   - runs a one-time setup form (what they sell, lead info needed, email)
 *   - sends a heartbeat to the portal every few seconds
 *   - if the admin disables it, the agent detects the order and stops working
 *
 * This is the program that Inno Setup will wrap into the customer's .exe.
 */

function defaultConfigPath() {
  const base = process.env.AUTODIAL_HOME
    ? process.env.AUTODIAL_HOME
    : path.join(os.homedir(), ".magicdialer");
  return path.join(base, "config.json");
}

function loadConfig(cfgPath = defaultConfigPath()) {
  try {
    return JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  } catch {
    return null;
  }
}

function saveConfig(config, cfgPath = defaultConfigPath()) {
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, JSON.stringify(config, null, 2), "utf8");
}

function log(msg) {
  console.log(`[agent] ${new Date().toISOString()} ${msg}`);
}

/** Agent version surfaced in cockpit + status. */
const VERSION = "1.1.0";

/**
 * Roll a call result into the customer's lifetime + daily stats, persisted in
 * the config so the cockpit and portal can show "today / all time".
 */
/**
 * Apply the sales form + settings the admin edited on the portal. The portal
 * is the source of truth for these fields; the local setup form only seeds
 * the first values. Only meaningful values are applied and the config file is
 * rewritten only when something actually changed.
 * Returns true when the config changed.
 */
function applyPortalConfig(config, portalCfg, cfgPath) {
  if (!portalCfg || typeof portalCfg !== "object") return false;
  let changed = false;
  const set = (key, v) => {
    const jv = JSON.stringify(v);
    if (jv !== JSON.stringify(config[key])) {
      config[key] = v;
      changed = true;
    }
  };
  if (typeof portalCfg.product === "string" && portalCfg.product.trim()) set("product", portalCfg.product.trim());
  if (Array.isArray(portalCfg.leadFields) && portalCfg.leadFields.length) set("leadFields", portalCfg.leadFields.map((s) => String(s).trim()).filter(Boolean));
  if (typeof portalCfg.contactEmail === "string" && portalCfg.contactEmail.trim()) set("contactEmail", portalCfg.contactEmail.trim());
  if (typeof portalCfg.persona === "string" && portalCfg.persona.trim()) set("persona", portalCfg.persona.trim());
  if (typeof portalCfg.companyName === "string" && portalCfg.companyName.trim()) set("companyName", portalCfg.companyName.trim());
  if (typeof portalCfg.callbackNumber === "string" && portalCfg.callbackNumber.trim()) set("callbackNumber", portalCfg.callbackNumber.trim());
  if (typeof portalCfg.callbackIn === "string" && portalCfg.callbackIn.trim()) set("callbackIn", portalCfg.callbackIn.trim());
  if (Array.isArray(portalCfg.callList)) set("callList", portalCfg.callList.map((n) => String(n).trim()).filter(Boolean));
  if (typeof portalCfg.searchEnabled === "boolean") set("searchEnabled", portalCfg.searchEnabled);
  if (typeof portalCfg.lang === "string" && /^(en|es|fr|de|pt|hi|auto)$/.test(portalCfg.lang.trim())) set("lang", portalCfg.lang.trim());
  if (typeof portalCfg.voiceStyle === "string" && /^(human|frank|friendly)$/.test(portalCfg.voiceStyle.trim())) set("voiceStyle", portalCfg.voiceStyle.trim());
  if (changed) {
    saveConfig(config, cfgPath);
    pushActivity(config, "Admin updated the sales form from the portal - applied.");
    console.log(`[agent] applied portal config: ${JSON.stringify({
      product: config.product, leadFields: config.leadFields || [], companyName: config.companyName || null,
      callbackNumber: config.callbackNumber || null, callbackIn: config.callbackIn || null,
      callList: (config.callList || []).length, searchEnabled: config.searchEnabled, lang: config.lang,
    })}`);
  }
  return changed;
}

function bumpStats(config, result) {
  const day = new Date().toISOString().slice(0, 10);
  const s = config.stats || { since: day, day, calls: 0, qualified: 0, today: 0, qualifiedToday: 0, lastScore: 0, bestScore: 0, qualifiedRate: 0 };
  if (s.day !== day) {
    s.day = day;
    s.today = 0;
    s.qualifiedToday = 0;
  }
  s.calls++;
  s.today++;
  if (result.goodLead) {
    s.qualified++;
    s.qualifiedToday++;
  }
  s.lastScore = result.score;
  if (result.score > (s.bestScore || 0)) s.bestScore = result.score;
  s.qualifiedRate = Math.round((100 * s.qualified) / Math.max(1, s.calls)) / 100;
  config.stats = s;
  return s;
}

/** Keep a bounded, newest-first activity feed written to status.json. */
function pushActivity(config, msg) {
  const feed = (config.activity || []).slice(0, 29);
  feed.unshift({ at: new Date().toISOString(), msg });
  config.activity = feed;
  return feed;
}

function post(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
}

/** Hide our own console and open the animated cockpit (packaged exe only). */
function showCockpit(configDir) {
  const isPacked = path.basename(process.execPath).toLowerCase().includes("magicdialer");
  if (!isPacked) return;
  if (process.env.MAGICDIALER_NO_COCKPIT === "1") return;
  try {
    spawn("powershell.exe", [
      "-NoProfile", "-WindowStyle", "Hidden", "-Command",
      "Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class HC{[DllImport(\"kernel32.dll\")]public static extern IntPtr GetConsoleWindow();[DllImport(\"user32.dll\")]public static extern bool ShowWindow(IntPtr h,int c);}';[HC]::ShowWindow([HC]::GetConsoleWindow(),0)",
    ], { stdio: "ignore" });
    const cockpit = path.join(path.dirname(process.execPath), "cockpit.ps1");
    if (fs.existsSync(cockpit)) {
      spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", cockpit], { stdio: "ignore" });
    }
  } catch { /* cockpit is optional */ }
}

const { createInterface } = require("node:readline");

function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question + " ", (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

/**
 * Agent main loop. `opts.configPath` lets the demo point at different
 * machines on one computer. If `opts.setup` is true, run the setup form.
 */
async function runAgent(opts = {}) {
  const cfgPath = opts.configPath || defaultConfigPath();
  let config = loadConfig(cfgPath);

  // If there's no config, the customer just registered; we need a token.
  // The demo passes token+portalUrl in. A real install would prompt for them.
  if (!config || !config.token) {
    log("No config yet — starting setup.");
    config = config || {};
    config.machineId = config.machineId || crypto.randomUUID();
    config.lang = config.lang || "en";
    config.voiceStyle = config.voiceStyle || "human";
    config.portalUrl = opts.portalUrl || (await ask("Magic Dialer portal URL (from your admin):"));
    config.token = opts.token || (await ask("Your Magic Dialer access token (from your admin):"));
    saveConfig(config, cfgPath);
    log("Config saved.");
  }

  if (opts.setup === true) {
    log("");
    log("============================================================");
    log("                 MAGIC DIALER — 1-minute setup");
    log("============================================================");
    log("");
    config.product = await ask("What do you sell / what services do you provide?");
    config.leadFieldsRaw = await ask("What do you need from a qualified lead (comma-separated)?");
    config.contactEmail = await ask("Where should qualified leads be emailed?");
    config.leadFields = config.leadFieldsRaw.split(",").map((s) => s.trim()).filter(Boolean);

    // Optional per-customer VOIP/call line. Every customer's line differs, so
    // we capture it here (at install) instead of baking it into the installer.
    log("Optional: your phone/VOIP line (press Enter on each to skip and configure later)");
    config.voip = config.voip || {};
    config.voip.provider = (await ask("VOIP/SIP provider (e.g. Twilio, Asterisk)? (Enter = none yet):")).trim() || config.voip.provider || "";
    config.voip.number = (await ask("Your outbound phone number? (Enter = none yet):")).trim() || config.voip.number || "";
    config.voip.username = (await ask("SIP username/account? (Enter = none yet):")).trim() || config.voip.username || "";
    config.voip.server = (await ask("SIP domain/server (e.g. sip.example.com)? (Enter = none yet):")).trim() || config.voip.server || "";
    if (!config.voip.provider && !config.voip.number && !config.voip.username && !config.voip.server) {
      config.voip.ready = false; // no line yet — outbound/inbound calls deferred
    } else {
      config.voip.ready = true;
    }

    saveConfig(config, cfgPath);
    log("Setup complete. Your Magic Dialer agent is now running.");
    log("The portal will show this PC as ONLINE. Right now the agent makes voice");
    log("calls through this PC's microphone + speakers (a full phone line needs a provider).");
  }

  const configDir = path.dirname(cfgPath);
  showCockpit(configDir);
  const productLabel = config.product || "Magic Dialer customer";

  // One status writer for the cockpit: always carries brand + stats + feed.
  const ui = (patch) => setUi(configDir, {
    version: VERSION,
    agent: (config.persona || "autumn").toLowerCase().includes("female") ? "Autumn" : "Atlas",
    company: config.companyName || "our team",
    product: productLabel,
    machineId: config.machineId,
    stats: config.stats || null,
    strategy: (config.learning ? topStrategy(config.learning) : null),
    callListCount: Array.isArray(config.callList) ? config.callList.length : 0,
    logs: (config.activity || []).slice(0, 12),
    ...patch,
  });

  ui({ status: "STARTING", mode: "idle", line: "Starting Magic Dialer agent..." });

  const portal = config.portalUrl.replace(/\/+$/, "");

  // Optional: run one live voice call before entering the heartbeat loop.
  // `--call` makes the agent speak through the speakers and listen through
  // the mic (free). A real phone line plugs in as a different speak/listen.
  if (opts.call === true) {
    const { voiceCall } = require("./call");
    try {
      const result = await voiceCall({
        product: config.product,
        leadFields: config.leadFields || [],
        persona: config.persona,
        companyName: config.companyName,
        callbackNumber: config.callbackNumber,
        callbackIn: config.callbackIn,
        contactEmail: config.contactEmail,
        token: config.token,
        portal,
        learning: config.learning,
        locale: config.lang || "en",
        voiceStyle: config.voiceStyle || "human",
        onLog: (m) => { log(m); ui({ line: m }); },
        onMode: (m) => ui({ mode: m }),
      });
      config.learning = result.learning;
      bumpStats(config, result);
      pushActivity(config, `Call done - score ${result.score}, ${result.goodLead ? "QUALIFIED LEAD" : "no lead"}. Strategy: ${(result.strategies || []).slice(0, 3).join(", ") || "intro"}${result.goodLead ? ". EMAILED to " + (config.contactEmail || "the portal") : ""}`);
      saveConfig(config, cfgPath);
      const finalLine = `Call result - score ${result.score}, ${result.goodLead ? "QUALIFIED LEAD" : "no lead"}.`;
      log(finalLine);
      ui({ mode: "idle", line: finalLine });
    } catch (e) {
      log("Voice call failed: " + e.message);
      ui({ mode: "idle", line: "Voice call failed - retrying later." });
    }
  }

  // Heartbeat + obey disable loop.
  while (true) {
    try {
      const res = await post(`${portal}/api/heartbeat`, { token: config.token, voipReady: !!(config.voip && config.voip.ready) });
      if (res.status === 200 && res.body) {
        if (res.body.disabled) {
          log("DISABLED by admin - stopping work. This PC will not run again until re-enabled.");
          ui({ status: "DISABLED", mode: "off", line: "Disabled by admin." });
          process.exit(0);
        }
        applyPortalConfig(config, res.body.config, cfgPath);
        const hl = `heartbeat OK (${res.body.config ? res.body.config.product || "customer" : "customer"})`;
        log(hl);
        ui({ status: "ONLINE", line: hl });
      } else {
        log(`heartbeat rejected (status ${res.status}) - not a registered customer.`);
        ui({ status: "OFFLINE", line: "Heartbeat rejected - check your access key." });
      }
    } catch (err) {
      log(`heartbeat failed (${err.code || err.message}) - retrying.`);
      ui({ status: "OFFLINE", line: "Reconnecting to portal..." });
    }
    await new Promise((r) => setTimeout(r, HEARTBEAT_INTERVAL_MS));
  }
}

module.exports = { runAgent, loadConfig, saveConfig, defaultConfigPath, applyPortalConfig, bumpStats, pushActivity };

// Allow running directly: node agent.js [token] [portalUrl] [--setup] [--call]
if (require.main === module) {
  const argv = process.argv.slice(2);
  const setup = argv.includes("--setup");
  const call = argv.includes("--call");
  const rest = argv.filter((a) => a !== "--setup" && a !== "--call");
  runAgent({ token: rest[0], portalUrl: rest[1], setup, call }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
