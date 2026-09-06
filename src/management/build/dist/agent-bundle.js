#!/usr/bin/env node
"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// shared/protocol.js
var require_protocol = __commonJS({
  "shared/protocol.js"(exports2, module2) {
    "use strict";
    var HEARTBEAT_INTERVAL_MS2 = 3e3;
    var STALE_AFTER_MS = 1e4;
    function heartbeatResponse({ ok, disabled, config, reason }) {
      const body = { ok, disabled: !!disabled };
      if (disabled) body.reason = reason || "disabled";
      if (config) body.config = config;
      return body;
    }
    module2.exports = { HEARTBEAT_INTERVAL_MS: HEARTBEAT_INTERVAL_MS2, STALE_AFTER_MS, heartbeatResponse };
  }
});

// agent/ui.js
var require_ui = __commonJS({
  "agent/ui.js"(exports2, module2) {
    "use strict";
    var fs2 = require("node:fs");
    var path2 = require("node:path");
    function statusFile(configDir) {
      return path2.join(configDir, "status.json");
    }
    function setUi2(configDir, patch) {
      try {
        let cur = {};
        try {
          cur = JSON.parse(fs2.readFileSync(statusFile(configDir), "utf8"));
        } catch {
        }
        const next = Object.assign({}, cur, patch, { ts: Date.now() });
        fs2.mkdirSync(configDir, { recursive: true });
        fs2.writeFileSync(statusFile(configDir), JSON.stringify(next));
      } catch {
      }
    }
    module2.exports = { setUi: setUi2, statusFile };
  }
});

// agent/brain.js
var require_brain = __commonJS({
  "agent/brain.js"(exports2, module2) {
    "use strict";
    var STRATEGY_INFO = {
      intro_company_first: { name: "Company-first introduction", source: "customer config", why: "The lead hears your company, not ours." },
      hook_permission_timebox: { name: "Permission + timebox opener", source: "Gong Labs (300M calls)", why: "Naming a 30-second contract makes the ask tiny and reversible - ~11% success when paired with a reason." },
      hook_how_have_you_been: { name: "'How have you been?' pattern interrupt", source: "Gong Labs (90,380 calls)", why: "6.6x more meetings than baseline by refusing a sales greeting." },
      hook_reason_first: { name: "Reason-first statement", source: "CallHippo (72,000 calls)", why: "Stating the reason in the first 30 seconds = 2.1x outcomes." },
      hook_specificity: { name: "Specific observed-data opener", source: "CallHippo", why: "Specific lane/truck detail is the #1 predictor of a kept call." },
      hook_social_proof: { name: "Social-proof entrance", source: "Gong Labs", why: "Second-best opener at 11.24% - implies peer credibility." },
      rapport_we_language: { name: "We-language rapport", source: "Gong Labs", why: "Winning calls use 'we/our' 35-55% more than 'I/my'." },
      rapport_mirroring: { name: "Tone & pace mirroring", source: "Pipedrive / HubSpot", why: "Mirroring moves outcomes toward agreement 67% of the time." },
      obj_not_interested: { name: "Pattern-interrupt objection turn", source: "Prospeo / Gong", why: "~50% of 'not interested' is a reflexive brush-off before value lands - interrupt, then reframe." },
      obj_busy_callback_slot: { name: "Busy-driver callback slot", source: "Cognism", why: "Unbooked callbacks convert ~34% worse; a pinned slot saves the deal." },
      obj_send_info_qualify: { name: "Qualify-before-send", source: "Prospeo", why: "90% of 'send me info' is a polite exit; one question keeps it a conversation." },
      obj_have_dispatcher_one_load: { name: "One-load side-by-side trial", source: "Nexloads / ATRI", why: "Existing dispatcher = proof dispatch pays; a one-load comparison wins without attacking." },
      obj_rates_loss_aversion: { name: "Loss-aversion rate reframe", source: "Kahneman & Tversky / OOIDA", why: "Spot ~$1.88/mi for 3+ years; frame as money donated, not money to earn." },
      close_assumptive: { name: "Assumptive close", source: "Gong Labs", why: "'Do you have your calendar handy?' is the highest-conversion closer on record." },
      close_one_load_trial: { name: "One-load prove-it close", source: "Sandler", why: "Small reversible commitments convert; ideal after 2+ positive qualifiers." },
      close_backup_two_weeks: { name: "Backup-dispatcher offer", source: "RAIN Group", why: "Low-risk entry with an existing provider - nothing to switch, everything to compare." },
      close_callback_number: { name: "Service manager call-back", source: "customer config", why: "A named number + time makes the next step concrete for service sales." }
    };
    var POOLS = {
      opening: [
        { key: "hook_permission_timebox", base: 1.4, pool: [
          "This is {agent} from {company}. I know this is a cold call - you can hang up right now, or give me twenty seconds to tell you why I called. Your choice.",
          "I'll be straight with you - I know you've got somewhere to be. Can I have thirty seconds to tell you what we do, and then I'm gone either way?"
        ] },
        { key: "hook_reason_first", base: 1.6, pool: [
          "The reason I'm calling is simple: your truck makes money loaded and burns money empty. I keep owner-operators loaded back-to-back at top rates. That's the whole call.",
          "This is {agent} from {company}. The reason for this call is one thing - I stop owner-operators from sitting a day between loads. Can I explain that in thirty seconds?"
        ] },
        { key: "hook_specificity", base: 1.5, pool: [
          "I was checking what's moving out of your area on your rig type this week, and there's a lane running at above board rate. Are you running under your own authority right now?",
          "Quick one from our dispatch desk - we're filling reloads this week and I wanted to see if you're still taking freight in your area. Would that help right now?"
        ] },
        { key: "hook_how_have_you_been", base: 0.9, pool: [
          "{agent} from {company} - how have you been?"
        ] },
        { key: "hook_social_proof", base: 1.2, pool: [
          "We work with owner-operators running out of your area keep them rolling back-to-back - have you heard our name tossed around?",
          "Most of the drivers we talk to were self-dispatching until the empty miles added up - that's exactly who we built this for. Is that you right now?"
        ] }
      ],
      rapport: [
        { key: "rapport_we_language", base: 1.5, pool: [
          "That's great to hear. Before I let you go - a couple of quick seconds and we'll have a real answer for you.",
          "Love it. This will take less than a minute, and we'll have my dispatcher follow up with something concrete.",
          "Awesome. Keeping this short - we'll make it worth your time."
        ] },
        { key: "rapport_mirroring", base: 1.1, pool: [
          "No rush on my end - take your time.",
          "I hear you've got a full plate, so we'll keep this simple. One thing at a time.",
          "I know you're either rolling or about to roll, so I'll be quick with you."
        ] }
      ],
      pivot: [
        { key: "obj_not_interested", base: 1.3, pool: [
          "Fair enough - you don't even know what we do yet, so that's a fair answer. If I told you the average guy loses two hundred dollars a load skipping the counter-offer, would that be worth thirty seconds? If not, I'll let you go right now.",
          "Totally fair. Quick one before I go, just to be safe - do you ever dispatch loads to the southern states? No commitment at all."
        ] },
        { key: "obj_busy_callback_slot", base: 1.5, pool: [
          "You're driving - I'm not going to hold you up, that's how you make your money. When do you figure you'll be shut down tonight? I'll call you when you're parked - that work?",
          "I know you're on the road, so let's pin the call instead of playing tag. What time do you usually shut down? I'll call you then."
        ] },
        { key: "obj_send_info_qualify", base: 1.4, pool: [
          "Happy to send it over, and so I send the right thing - who books your loads right now, you or a dispatcher?",
          "I'll text you a one-pager, and after your next drop I'll circle back - who'd you say handles your load-finding today?"
        ] },
        { key: "obj_have_dispatcher_one_load", base: 1.4, pool: [
          "Good - that tells me you already know dispatch pays for itself, which is why I'm calling. Real quick: what do you like most about how they work?",
          "If you already run with someone, great - here's all I'm asking: let me find you one load this week, run it through me, compare numbers side by side. If mine isn't better, you keep your guy."
        ] },
        { key: "obj_rates_loss_aversion", base: 1.2, pool: [
          "You're right - the market's been flat for years now. Spot rates have sat around a buck eighty-eight a mile. And that's exactly why it's worth having somebody negotiate every load - guys booking their own take the first offer. Twenty extra dollars a load, three loads a week - that's over three grand a year walking away. Worth a real look?",
          "When rates are flat, the fight is on the tariff, not the road. We counter every load before we book it - that's where the money shows back up. Can I show you in real numbers?"
        ] }
      ],
      closeGood: [
        { key: "close_assumptive", base: 1.5, pool: [
          "Here's what happens next - I set up your profile tonight, and first thing tomorrow I'm out looking for your next load. What time are you usually up? I'll have something waiting.",
          "If this is going to work, the next step is a fifteen-minute talk while you're parked. Do you have your calendar handy?"
        ] },
        { key: "close_one_load_trial", base: 1.5, pool: [
          "The fastest way to tell if this is worth it is one load. You approve it, you run it, you look at the numbers. If it's not better than what you were doing, we shake hands and I'm done. Deal?",
          "Give me your next drop-off city, and I'll have a load waiting by the time you unload. You don't even have to think about it - we'll do the thinking."
        ] }
      ],
      closeWarm: [
        { key: "close_backup_two_weeks", base: 1.4, pool: [
          "Since you're set up already, here's the deal - let me be your backup for two weeks on the loads they can't get you. No charge. If one of my loads pays better, you'll know exactly what I'm worth.",
          "Look, you don't have to commit to anything today. All I'm asking is that you don't book your next deadhead run until I show you what's on the board. If I've got nothing better, you lose nothing."
        ] }
      ]
    };
    function pick(arr, seed = Math.floor(Math.random() * 1e9)) {
      return arr[Math.floor(Math.abs(seed)) % arr.length];
    }
    function pickStrategy(group, scoreMap, seed) {
      const pool = POOLS[group] || [];
      if (!pool.length) return null;
      const weighted = pool.map((p) => {
        const learned = scoreMap ? Number(scoreMap[p.key] || 0) : 0;
        const w = Math.max(0.15, p.base + 0.5 * learned);
        return { p, w };
      });
      const total = weighted.reduce((s, x) => s + x.w, 0);
      let r = Math.abs(seed) % 1e3 / 1e3 * total;
      for (const x of weighted) {
        r -= x.w;
        if (r <= 0) return x.p;
      }
      return weighted[weighted.length - 1].p;
    }
    function makeBrain({ product, leadFields, persona = "high-energy friendly female", companyName = "our team", learning = {} }) {
      const fields = Array.isArray(leadFields) ? leadFields.filter(Boolean) : [];
      const agentName = friendlyName(persona);
      const company = String(companyName || "").trim() || "our team";
      const scoreMap = learning.strategyScores || {};
      const used = [];
      const intro = `This is ${agentName} from ${company}.`;
      const g = (s) => ({ group: s, used, agentName, company, intro });
      function fill(template) {
        return String(template).replace(/\{agent\}/g, agentName).replace(/\{company\}/g, company);
      }
      return {
        product,
        company,
        fields,
        persona,
        agentName,
        learning,
        used,
        strategyManifest: STRATEGY_INFO,
        opening(seed) {
          const s = pickStrategy("opening", scoreMap, seed);
          if (s) used.push(s.key);
          return `${intro} ${fill(pick(s.pool, seed + 7))}`;
        },
        rapport(seed) {
          const s = pickStrategy("rapport", scoreMap, seed);
          if (s) used.push(s.key);
          return fill(pick(s.pool, seed));
        },
        question(field, asked) {
          const f = String(field).toLowerCase();
          const pools = [
            [
              `First, can I grab your ${f}?`,
              `To make sure I route this right - what's your ${f}?`,
              `Let me get your ${f} so our team can reach you directly.`
            ],
            [
              `And your ${f}?`,
              `Follow-up for you - your ${f}?`,
              `Need your ${f} too, if you have it handy.`
            ],
            [
              `Almost there - your ${f}?`,
              `One more for the sheet - your ${f}?`
            ],
            [
              `Last one - your ${f}?`,
              `Final one, your ${f}?`
            ]
          ];
          const pool = pools[Math.min(asked, pools.length - 1)];
          return pick(pool, asked * 7 + fields.length);
        },
        retryQuestion(field) {
          return pick(
            [
              `No worries, I didn't quite catch it - can you say your ${String(field).toLowerCase()} once more?`,
              `Sorry, one crackly line - your ${String(field).toLowerCase()}?`
            ],
            String(field).length
          );
        },
        reopenOut() {
          return pick(
            [
              "Hello? Just making sure we didn't get cut off - are you still there?",
              "Hello, are you there? I think the line dropped for a second."
            ],
            2
          );
        },
        deadAirClose() {
          return `I can't hear you at the moment. I'll give you a call back a little later - take care and talk soon!`;
        },
        reflect(leadText, seed) {
          const t = String(leadText || "").toLowerCase();
          if (t.includes("good morning") || t.includes("good afternoon") || t.includes("good evening")) {
            return pick(["And a good one to you too!", "Likewise, thanks!"], seed);
          }
          if (/\bthanks\b|\bthank you\b/.test(t)) return "Anytime!";
          return pick(
            [
              "That's good to know, thanks.",
              "I really appreciate you sharing that.",
              "Perfect, that helps me a lot.",
              "Got it, that makes sense.",
              "Thanks for the detail - that's exactly what I needed."
            ],
            seed
          );
        },
        ackFor(leadText, seed) {
          const words = String(leadText || "").split(/\s+/).filter((w) => DIGIT_WORDS.has(w.toLowerCase().replace(/[^a-z]/g, "")));
          if (words.length >= 2) {
            const map = { zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", oh: "0", ten: "10", twenty: "20", thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90", hundred: "100", thousand: "1000" };
            const digits = words.map((w) => map[w.toLowerCase().replace(/[^a-z]/g, "")] || w);
            return `Great, that's saved - ${digits.join("")} ${pick(["got it.", "on the sheet.", "thank you."], seed)}`;
          }
          return pick(
            [
              "That's good to know, thanks.",
              "I really appreciate you sharing that.",
              "Perfect, that helps me a lot.",
              "Got it, that makes sense.",
              "Thanks for the detail - that's exactly what I needed."
            ],
            seed + 1
          );
        },
        pivotSoft(seed, objectionText) {
          const text = String(objectionText || "").toLowerCase();
          let group = "pivot";
          let s;
          if (/\b(driving|drive|on the road|busy|rolling|shutting down|parked now)\b/.test(text)) s = pickByKey(POOLS.pivot, "obj_busy_callback_slot", scoreMap, seed);
          else if (/info|email|send|one.pager|look at it/.test(text)) s = pickByKey(POOLS.pivot, "obj_send_info_qualify", scoreMap, seed);
          else if (/dispatcher|broker|have someone|got a guy|leased to/.test(text)) s = pickByKey(POOLS.pivot, "obj_have_dispatcher_one_load", scoreMap, seed);
          else if (/\b(market is bad|market's bad|slow market)\b|\brate\b|rates|slow|bad market|no freight|no loads|board is dead/.test(text)) s = pickByKey(POOLS.pivot, "obj_rates_loss_aversion", scoreMap, seed);
          else s = pickStrategy(group, scoreMap, seed);
          used.push(s.key);
          return fill(pick(s.pool, seed + 3));
        },
        pivotGraceful() {
          const seed = 5;
          const s = pickStrategy("pivot", scoreMap, seed);
          used.push(s.key + "_exit");
          return pick(
            [
              "Alright, I hear you - I'll take you off the list. If a hot load in your lane ever needs a truck, can our dispatcher email you as a courtesy? Either way, have a safe one.",
              "No problem at all. I'll make a note not to bother you again. If you ever want loads, just give us a shout - take care!",
              "You don't have to commit to anything today. All I'm asking is you don't book your next deadhead run until we show you what's on the board. If there's nothing better, you lose nothing - and if there is, we'll talk. Deal?"
            ],
            seed
          );
        },
        qualifyingClose(goodLead, name, { callbackNumber, callbackIn } = {}) {
          const who = name ? `, ${name}` : "";
          if (goodLead && callbackNumber) {
            used.push("close_callback_number");
            const inTime = callbackIn ? ` in ${callbackIn}` : "";
            return `Perfect${who}! My manager will call you back${inTime} from ${callbackNumber}. Keep your phone close - great talking with you!`;
          }
          if (goodLead) {
            const sIdx = Math.abs(seedNow()) % 2;
            const s = sIdx === 0 ? pickByKey(POOLS.closeGood, "close_assumptive", scoreMap, 11) : pickByKey(POOLS.closeGood, "close_assumptive", scoreMap, 11);
            const w = pickByKey(POOLS.closeWarm, "close_backup_two_weeks", scoreMap, 3);
            used.push(s.key, w.key);
            const line = `Perfect${who}. ${fill(pick(s.pool, 11))} ${fill(pick(w.pool, 3))}`;
            return line;
          }
          return `Thanks for your time today - if anything changes, you know where to find us. Take care!`;
        }
      };
    }
    function seedNow() {
      return Date.now();
    }
    function pickByKey(group, key, scoreMap, seed) {
      const s = group.find((p) => p.key === key) || group[0];
      return s;
    }
    var DIGIT_WORDS = /* @__PURE__ */ new Set(["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "oh", "ten", "twenty", "thirty", "forty", "fifty", "hundred", "thousand"]);
    var NAME_TOKENS = /* @__PURE__ */ new Set(["to", "the", "and", "of", "in", "a", "an", "for", "with", "on", "at", "my", "your", "name", "is"]);
    var DESCRIPTOR_TOKENS = /(high|energy|friendly|female|male|assistant|magic|dialer|agent|professional|business|personality|persona|helpful|polite|courteous|cheerful|energetic|smart|lady|woman|man|girl|guy|voice|service|tone|warm|natural|human|caller|verified|active|premium|default|basic|standard)/i;
    function friendlyName(persona) {
      const s = String(persona || "").trim();
      const part = s.split(/[\s,]+/).find((w) => {
        const clean2 = w.replace(/[^A-Za-z]/g, "").toLowerCase();
        if (!clean2 || clean2.length < 2 || clean2.length > 12) return false;
        if (NAME_TOKENS.has(clean2)) return false;
        if (DESCRIPTOR_TOKENS.test(clean2)) return false;
        return true;
      });
      if (!part) return "Autumn";
      const clean = part.replace(/[^a-zA-Z]/g, "").toLowerCase();
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    function scoreLead({ transcript, fields }) {
      const text = transcript.map((t) => t.role === "lead" ? t.text : "").join(" ").toLowerCase();
      const positive = /\b(yes|interested|how much|cost|price|quote|need|looking for|that sounds|go ahead|sure|okay|ok)\b/;
      const negative = /\b(no|not interested|no thanks|stop|don't call|never mind|scam|not now|busy|too busy)\b/;
      let score = 0.5;
      const posHits = (text.match(positive) || []).length;
      score += posHits * 0.3;
      if (text.includes("not interested") || text.includes("no thanks") || text.includes("stop") || text.includes("don't call")) {
        score = Math.min(score, 0.25);
      }
      const realAnswers = transcript.filter((t) => t.role === "lead" && !t.text.startsWith("(silence)")).length;
      const answeredBoth = realAnswers >= 2;
      return {
        score,
        goodLead: score >= 0.6 && answeredBoth,
        maxAttemptsOfRejection: transcript.filter((t) => t.role === "lead" && /(no|not interested|stop|don't call)/.test(t.text.toLowerCase())).length
      };
    }
    function shouldEscalate({ goodLead, maxAttemptsOfRejection, hearsHumanRequest }) {
      const askedForHuman = /(real person|human|agent|representative|someone else|talk to a person)/.test(String(hearsHumanRequest || "").toLowerCase());
      if (askedForHuman) return { escalate: true, reason: "lead asked for a human" };
      if (!goodLead && maxAttemptsOfRejection >= 2) return { escalate: true, reason: "AI exhausted options" };
      return { escalate: false, reason: "" };
    }
    function learn(learning, { goodLead, strategies }) {
      const scores = { ...learning.techniqueScores || {} };
      scores.charm_flow = Math.round(Math.max(0, (scores.charm_flow || 0) + (goodLead ? 1 : -0.2)) * 100) / 100;
      const ss = { ...learning.strategyScores || {} };
      for (const k of strategies || []) {
        ss[k] = Math.round(((ss[k] || 0) + (goodLead ? 1 : -0.15)) * 100) / 100;
      }
      return { ...learning, techniqueScores: scores, strategyScores: ss, calls: (learning.calls || 0) + 1 };
    }
    function topStrategy2(learning) {
      const ss = learning && learning.strategyScores || {};
      let best = null;
      let hv = -Infinity;
      for (const k in STRATEGY_INFO) {
        if (ss[k] > hv) {
          hv = ss[k];
          best = k;
        }
      }
      if (!best || hv <= 0) return null;
      const info = STRATEGY_INFO[best];
      return { key: best, name: info.name, source: info.source, score: hv };
    }
    module2.exports = { makeBrain, scoreLead, shouldEscalate, learn, friendlyName, topStrategy: topStrategy2, STRATEGY_INFO };
  }
});

// agent/voice.js
var require_voice = __commonJS({
  "agent/voice.js"(exports2, module2) {
    "use strict";
    var { spawnSync } = require("node:child_process");
    var http = require("node:http");
    var fs2 = require("node:fs");
    var os2 = require("node:os");
    var path2 = require("node:path");
    var TMP = path2.join(os2.tmpdir(), "autodial-voice");
    if (!fs2.existsSync(TMP)) fs2.mkdirSync(TMP, { recursive: true });
    var NEURAL_VOICES = {
      en: "en-US-JennyNeural",
      "en-us": "en-US-JennyNeural",
      "en-gb": "en-GB-SoniaNeural",
      "en-au": "en-AU-NatashaNeural",
      "en-ca": "en-CA-ClaraNeural",
      "en-in": "en-IN-NeerjaNeural",
      ar: "ar-SA-ZariyahNeural",
      zh: "zh-CN-XiaoxiaoNeural",
      "zh-cn": "zh-CN-XiaoxiaoNeural",
      "zh-tw": "zh-TW-HsiaoChenNeural",
      cs: "cs-CZ-VlastaNeural",
      da: "da-DK-ChristelNeural",
      nl: "nl-NL-ColetteNeural",
      fi: "fi-FI-SelmaNeural",
      fr: "fr-FR-DeniseNeural",
      de: "de-DE-KatjaNeural",
      el: "el-GR-AthinaNeural",
      he: "he-IL-HilaNeural",
      hi: "hi-IN-SwaraNeural",
      hu: "hu-HU-NoemiNeural",
      id: "id-ID-GadisNeural",
      it: "it-IT-ElsaNeural",
      ja: "ja-JP-NanamiNeural",
      ko: "ko-KR-SunHiNeural",
      ms: "ms-MY-YasminNeural",
      nb: "nb-NO-PernilleNeural",
      pl: "pl-PL-ZofiaNeural",
      pt: "pt-BR-FranciscaNeural",
      "pt-br": "pt-BR-FranciscaNeural",
      "pt-pt": "pt-PT-RaquelNeural",
      ro: "ro-RO-AlinaNeural",
      ru: "ru-RU-SvetlanaNeural",
      sk: "sk-SK-ViktoriaNeural",
      sl: "sl-SI-PetraNeural",
      es: "es-ES-ElviraNeural",
      "es-mx": "es-MX-DaliaNeural",
      "es-es": "es-ES-ElviraNeural",
      sv: "sv-SE-SofieNeural",
      th: "th-TH-PremwadeeNeural",
      tr: "tr-TR-EmelNeural",
      uk: "uk-UA-PolinaNeural",
      vi: "vi-VN-HoaiMyNeural"
    };
    function edgeVoiceFor(locale) {
      if (NEURAL_VOICES[locale]) return NEURAL_VOICES[locale];
      const base = String(locale).split("-")[0];
      return NEURAL_VOICES[base] || "en-US-JennyNeural";
    }
    var PYTHON = null;
    function resolvePython() {
      if (PYTHON) return PYTHON;
      const home = os2.homedir();
      const candidates = [
        process.env.AUTODIAL_PYTHON,
        process.env.PYTHON,
        path2.join(home, "AppData", "Local", "Programs", "Python", "Python312", "python.exe"),
        path2.join(home, "AppData", "Local", "Programs", "Python", "Python313", "python.exe"),
        path2.join(home, "AppData", "Local", "Programs", "Python", "Python311", "python.exe"),
        "C:\\Python312\\python.exe",
        "C:\\Python311\\python.exe",
        "python",
        "py"
      ].filter(Boolean);
      for (const c of candidates) {
        try {
          const t = spawnSync(c, ["--version"], { stdio: "ignore", timeout: 1e4 });
          if (t.status === 0) {
            PYTHON = c;
            return c;
          }
        } catch {
        }
      }
      return null;
    }
    function speakEdge(text, { locale = "en", rate = 1 } = {}) {
      if (process.env.AUTODIAL_NO_EDGE_TTS === "1") return false;
      const python = resolvePython();
      if (!python) return false;
      const file = path2.join(TMP, `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.mp3`);
      const rateArg = rate === 1 ? "+0%" : `${rate > 1 ? "+" : ""}${Math.round((rate - 1) * 60)}%`;
      const voice = edgeVoiceFor(locale);
      try {
        const r = spawnSync(
          python,
          ["-m", "edge_tts", "--voice", voice, "--rate", rateArg, "--text", text, "--write-media", file],
          { stdio: "pipe", timeout: 9e4, encoding: "utf8" }
        );
        if (r.status !== 0 || !fs2.existsSync(file) || fs2.statSync(file).size < 100) {
          if (fs2.existsSync(file)) fs2.unlinkSync(file);
          return false;
        }
        return playFile(file);
      } catch {
        if (fs2.existsSync(file)) fs2.unlinkSync(file);
        return false;
      }
    }
    async function speakHeadTTS(text, { locale = "en", rate = 1 } = {}) {
      if (process.env.AUTODIAL_NO_HEADTTS === "1") return false;
      const file = path2.join(TMP, `headtts-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.wav`);
      try {
        const ok = await synthViaServer(text, file, locale, rate);
        if (!ok || !fs2.existsSync(file) || fs2.statSync(file).size < 1e3) {
          if (fs2.existsSync(file)) fs2.unlinkSync(file);
          return false;
        }
        return playFile(file);
      } catch {
        if (fs2.existsSync(file)) fs2.unlinkSync(file);
        return false;
      }
    }
    function synthViaServer(text, outFile, locale, rate) {
      return new Promise((resolve) => {
        const data = JSON.stringify({
          input: text,
          voice: "af_bella",
          language: String(locale).split("-")[0] === "fi" ? "fi" : "en-us",
          speed: clamp(rate, 0.5, 2),
          audioEncoding: "wav"
        });
        const req = http.request(
          {
            host: "127.0.0.1",
            port: 8883,
            path: "/v1/synthesize",
            method: "POST",
            headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
          },
          (res) => {
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => {
              try {
                const j = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                if (j && j.audio) {
                  fs2.writeFileSync(outFile, Buffer.from(j.audio, "base64"));
                  resolve(true);
                  return;
                }
              } catch {
              }
              resolve(false);
            });
          }
        );
        req.on("error", () => resolve(false));
        req.setTimeout(24e4, () => {
          req.destroy();
          resolve(false);
        });
        req.write(data);
        req.end();
      });
    }
    function clamp(v, lo, hi) {
      return Math.max(lo, Math.min(hi, v));
    }
    function speakWindows(text, { rate = 1, volume = 100 } = {}) {
      const chosen = "Microsoft Zira Desktop";
      const rate10 = Math.round(rate * 10);
      const script = `
    Add-Type -AssemblyName System.Speech
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    foreach($v in $s.GetInstalledVoices()) { if($v.VoiceInfo.Name -eq '${ps(chosen)}') { $s.SelectVoice($v.VoiceInfo.Name); break } }
    $s.Rate = ${rate10}
    $s.Volume = ${Number(volume) || 100}
    $s.Speak('${ps(text)}')
  `;
      const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { stdio: "ignore", timeout: 6e4 });
      return r.status === 0;
    }
    function ps(v) {
      return v.replace(/'/g, "''");
    }
    function playFile(file) {
      const url = "file:///" + file.replace(/\\/g, "/").replace(/ /g, "%20");
      const script = "Add-Type -AssemblyName PresentationCore;$p = New-Object System.Windows.Media.MediaPlayer;$p.Open([uri]'" + url + "');while(-not $p.NaturalDuration.HasTimeSpan){ Start-Sleep -Milliseconds 50 };$d = [Math]::Max(1.0, $p.NaturalDuration.TimeSpan.TotalSeconds);$p.Play(); Start-Sleep -Milliseconds ([Math]::Min(15000, ($d * 1000) + 350));$p.Stop(); $p.Close()";
      try {
        const r = spawnSync(
          "powershell.exe",
          ["-NoProfile", "-NonInteractive", "-Command", script],
          { stdio: "ignore", timeout: 3e4 }
        );
        return r.status === 0;
      } catch {
        return false;
      }
    }
    async function speak(text, { voice, rate = 1, volume = 100, locale = "en" } = {}) {
      if (speakEdge(text, { locale, rate })) return { engine: "edge", ok: true };
      if (await speakHeadTTS(text, { locale, rate })) return { engine: "headtts", ok: true };
      const ok = speakWindows(text, { rate, volume });
      return { engine: "windows", ok };
    }
    module2.exports = { speak, speakEdge, speakHeadTTS, speakWindows, edgeVoiceFor };
  }
});

// agent/hear.js
var require_hear = __commonJS({
  "agent/hear.js"(exports2, module2) {
    "use strict";
    var { spawnSync } = require("node:child_process");
    var WORDS = [
      "yes",
      "yeah",
      "yep",
      "yup",
      "no",
      "nope",
      "nah",
      "maybe",
      "okay",
      "sure",
      "correct",
      "right",
      "wrong",
      "fine",
      "good",
      "great",
      "hello",
      "hi",
      "hey",
      "thanks",
      "thank you",
      "bye",
      "goodbye",
      "good morning",
      "good afternoon",
      "good evening",
      "mhm",
      "uh huh",
      "yes sir",
      "no sir",
      "sounds good",
      "that's fine",
      "start",
      "stop",
      "cancel",
      "repeat",
      "repeat that",
      "help",
      "hold on",
      "one second",
      "just a minute",
      "go ahead",
      "continue",
      "what",
      "what did you say",
      "I don't know",
      "i don't know",
      "not sure",
      "don't know",
      "unknown",
      "n a",
      "n/a",
      "not applicable",
      "none",
      "i don't have it",
      "i don't have that",
      "that's all",
      "that's it",
      "the number",
      "the mc",
      "the phone",
      "my name is",
      "it's",
      "it is",
      "name",
      "number",
      "mc",
      "mc number",
      "phone",
      "phone number",
      "customer",
      "dispatch",
      "trucking",
      "freight",
      "load",
      "truck",
      "driver",
      "carrier",
      "power only",
      "dry van",
      "refrigerated",
      "reefer",
      "flatbed",
      "step deck",
      "box truck",
      "straight truck",
      "semi",
      "trailer",
      "axel",
      "axle",
      "dallas",
      "houston",
      "el paso",
      "laredo",
      "chicago",
      "atlanta",
      "memphis",
      "nashville",
      "indianapolis",
      "kansas city",
      "oklahoma city",
      "denver",
      "phoenix",
      "los angeles",
      "sacramento",
      "portland",
      "seattle",
      "albany",
      "new york",
      "buffalo",
      "cleveland",
      "columbus",
      "cincinnati",
      "detroit",
      "grand rapids",
      "pittsburgh",
      "philadelphia",
      "boston",
      "today",
      "tomorrow",
      "yesterday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
      "morning",
      "afternoon",
      "evening",
      "night",
      "tonight",
      "this week",
      "next week",
      "this month",
      "next month",
      "as soon as possible",
      "immediately",
      "urgent",
      "open",
      "available",
      "empty",
      "loaded",
      "pickup",
      "delivery",
      "origin",
      "destination",
      "where",
      "when",
      "what time",
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "oh",
      "ten",
      "twenty",
      "thirty",
      "forty",
      "fifty",
      "sixty",
      "seventy",
      "eighty",
      "ninety",
      "hundred",
      "thousand"
    ];
    var PHRASES = [
      "in dallas",
      "in houston",
      "in el paso",
      "in laredo",
      "in chicago",
      "from dallas",
      "from houston",
      "to dallas",
      "to houston",
      "to chicago",
      "twenty four",
      "twenty five",
      "twenty six",
      "twenty seven",
      "twenty eight",
      "twenty nine",
      "thirty one",
      "double zero",
      "double one",
      "zero one",
      "one two three",
      "four five six",
      "seven eight nine",
      "one eight hundred"
    ];
    function listenScript({ sec, waveFile }) {
      const wordsRaw = WORDS.join(";");
      const phrasesRaw = PHRASES.join(";");
      const input = waveFile ? `$r.SetInputToWaveFile('${waveFile}')` : `$r.SetInputToDefaultAudioDevice()`;
      return `
    Add-Type -AssemblyName System.Speech
    try {
      $r = New-Object System.Speech.Recognition.SpeechRecognitionEngine
      ${input}
      $r.InitialSilenceTimeout = New-Object System.TimeSpan(0,0,${sec})
      $r.EndSilenceTimeout = New-Object System.TimeSpan(0,0,2)
      $c = New-Object System.Speech.Recognition.Choices
      $wordsRaw = "${wordsRaw}"
      foreach ($w in ($wordsRaw -split ';')) { if ($w -and $w -ne '') { [void]$c.Add([string]$w) } }
      $phrasesRaw = "${phrasesRaw}"
      foreach ($p in ($phrasesRaw -split ';')) { if ($p -and $p -ne '') { [void]$c.Add([string]$p) } }
      $g = New-Object System.Speech.Recognition.Grammar($c)
      $r.LoadGrammar($g)
      try { $r.UpdateRecognizerSetting('CFGConfidenceThreshold', 0.3) } catch { }
      $res = $r.Recognize()
      if ($res) { Write-Output ('HEARD:' + $res.Text) } else { Write-Output 'HEARD:' }
    } catch {
      Write-Output ('ERR:' + $_.Exception.Message)
    }
  `;
    }
    function hear({ timeoutMs = 6e3, waveFile = null } = {}) {
      const sec = Math.max(1, Math.round(timeoutMs / 1e3));
      const script = listenScript({ sec, waveFile });
      const r = spawnSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-Command", script],
        { stdio: ["ignore", "pipe", "pipe"], timeout: timeoutMs + 2e4 }
      );
      const out = (r.stdout || "").toString().trim();
      const line = out.split(/\r?\n/).find((l) => /^(HEARD|ERR):/.test(l));
      if (!line) return null;
      if (line.startsWith("ERR:")) {
        return null;
      }
      const text = line.slice("HEARD:".length).trim();
      return text === "" ? null : text;
    }
    module2.exports = { hear, WORDS, PHRASES };
  }
});

// agent/call-runner.js
var require_call_runner = __commonJS({
  "agent/call-runner.js"(exports2, module2) {
    "use strict";
    var { makeBrain, scoreLead, shouldEscalate, learn } = require_brain();
    var NEGATIVE = /\b(no thanks|not interested|no thank you|just say no|stop|don't call|never mind|not now|wrong number|not anymore)\b/i;
    var SOFT = /\b(driving|on the road|rolling|busy|shutting down|about to|send me some|email me|text me|more info|already have|have my own|got a guy|leased to|market is bad|market's bad|no freight|no loads|board is dead|rates are|bad market|slow right now)\b/i;
    var NAME_BORN = /\b(my name is|this is|it's|thats)\s+([a-z]+)/i;
    var NAME_TOKEN = /\b(hi|hello|hey|yes|yeah|no|sure|okay|ok|fine|thanks|good|great|correct|right)\b/i;
    async function runCall({ product, leadFields, persona, companyName, callbackNumber, callbackIn, speak, listen, contactEmail, learning }) {
      const brain = makeBrain({ product, leadFields, persona, companyName, learning });
      const transcript = [];
      const timeline = [];
      const think = () => new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 700)));
      let firstLine = true;
      let lastAgentText = "";
      const rawListen = listen;
      const listenForLead = async () => {
        const heard = await rawListen();
        if (!heard || heard.startsWith("(silence)")) return heard;
        const t = String(heard).toLowerCase();
        if (t && lastAgentText.toLowerCase().includes(t)) return null;
        return heard;
      };
      const agent = async (text) => {
        if (firstLine === false) await think();
        lastAgentText = text;
        firstLine = false;
        transcript.push({ role: "agent", text });
        return speak(text);
      };
      const lead = (text) => transcript.push({ role: "lead", text });
      const finish = (verdict2) => {
        const allLeadWords = transcript.filter((t) => t.role === "lead").map((t) => t.text).filter((t) => !t.startsWith("(silence)")).join(" ");
        const esc2 = shouldEscalate({ goodLead: verdict2.goodLead, maxAttemptsOfRejection: verdict2.maxAttemptsOfRejection, hearsHumanRequest: allLeadWords });
        return {
          product,
          company: brain.company,
          transcript,
          timeline,
          score: Number(verdict2.score.toFixed(2)),
          goodLead: verdict2.goodLead,
          escalateToHuman: esc2.escalate,
          escalateReason: esc2.reason,
          learning: learn(learning || {}, { goodLead: verdict2.goodLead, strategies: brain.used }),
          strategies: Array.from(new Set(brain.used)),
          summary: summarize(transcript, verdict2.goodLead, product),
          contactEmail: contactEmail || null
        };
      };
      let rejectionCount = 0;
      let leadName = null;
      const captureName = (answer) => {
        const t = String(answer || "").toLowerCase();
        const m = t.match(NAME_BORN);
        if (m) return m[2].charAt(0).toUpperCase() + m[2].slice(1);
        const words = t.replace(/[^a-z ]/g, "").trim().split(/\s+/).filter(Boolean);
        if (words.length === 1 && words[0].length >= 2 && words[0].length <= 12 && !NAME_TOKEN.test(words[0]) && !/not|n a|unknown|none/.test(words[0])) {
          return words[0].charAt(0).toUpperCase() + words[0].slice(1);
        }
        return null;
      };
      const isNegative = (t) => NEGATIVE.test(String(t || ""));
      const handOff = async () => {
        await agent("No problem at all - one second, I'll get you straight over to one of our real people.");
      };
      await agent(brain.opening(1));
      let reply = await listenForLead();
      if (!reply) {
        await agent(brain.reopenOut());
        reply = await listenForLead();
        if (!reply) {
          lead("(silence)");
          await agent(brain.deadAirClose());
          return finish(scoreLead({ transcript, fields: leadFields }));
        }
      }
      lead(reply);
      const esc = shouldEscalate({ goodLead: false, maxAttemptsOfRejection: 0, hearsHumanRequest: reply });
      if (esc.escalate) {
        await handOff();
        return finish(scoreLead({ transcript, fields: leadFields }));
      }
      if (isNegative(reply)) {
        rejectionCount = 1;
        await agent(brain.pivotSoft(3, reply));
        const second = await listenForLead();
        if (second) {
          lead(second);
          if (isNegative(second)) {
            rejectionCount = 2;
            await agent(brain.pivotGraceful());
            return finish(scoreLead({ transcript, fields: leadFields }));
          }
        } else {
          lead("(silence)");
          await agent(brain.pivotGraceful());
          return finish(scoreLead({ transcript, fields: leadFields }));
        }
      }
      const wasSoft = !isNegative(reply) && SOFT.test(reply);
      if (wasSoft) {
        await agent(brain.pivotSoft(3, reply));
        const then = await listenForLead();
        if (then && !then.startsWith("(silence)")) {
          lead(then);
          reply = then;
        } else {
          lead("(silence)");
        }
      }
      await agent(brain.rapport(reply ? 5 : 6));
      const qCount = brain.fields.length;
      for (let asked = 0; asked < qCount; asked++) {
        const field = brain.fields[asked];
        const q = brain.question(field, asked);
        timeline.push(q);
        await agent(q);
        let answer = await listenForLead();
        if (answer && !answer.startsWith("(silence)")) {
          lead(answer);
          if (isNegative(answer)) {
            rejectionCount++;
            if (rejectionCount >= 2) {
              await agent(brain.pivotGraceful());
              return finish(scoreLead({ transcript, fields: leadFields }));
            }
            await agent(brain.pivotSoft(asked + 7, answer));
            const again = await listenForLead();
            if (again && !again.startsWith("(silence)")) {
              lead(again);
              if (isNegative(again)) {
                await agent(brain.pivotGraceful());
                return finish(scoreLead({ transcript, fields: leadFields }));
              }
              answer = again;
            } else {
              lead("(silence)");
              continue;
            }
          }
          if (String(field).toLowerCase() === "name") {
            leadName = captureName(answer) || leadName;
          }
          await agent(brain.ackFor(answer, asked + 11));
        } else {
          lead("(silence)");
          const retry = brain.retryQuestion(field);
          timeline.push(retry);
          await agent(retry);
          const second = await listenForLead();
          if (second && !second.startsWith("(silence)")) {
            lead(second);
            if (isNegative(second)) {
              rejectionCount++;
              if (rejectionCount >= 2) {
                await agent(brain.pivotGraceful());
                return finish(scoreLead({ transcript, fields: leadFields }));
              }
            }
            if (String(field).toLowerCase() === "name") {
              leadName = captureName(second) || leadName;
            }
            await agent(brain.ackFor(second, asked + 13));
          } else {
            lead("(silence)");
          }
        }
      }
      const verdict = scoreLead({ transcript, fields: leadFields });
      const closeOpts = { callbackNumber: callbackNumber || null, callbackIn: callbackIn || null };
      await agent(brain.qualifyingClose(verdict.goodLead, leadName, closeOpts));
      return finish(verdict);
    }
    function summarize(transcript, goodLead, product) {
      const leadLines = transcript.filter((t) => t.role === "lead").map((t) => t.text.replace(/^\((silence)\)$/, "no answer")).filter(Boolean);
      return `Call about ${product}: ${goodLead ? "QUALIFIED LEAD" : "not a lead"}. Lead said: ${leadLines.join(" | ") || "nothing detected"}.`;
    }
    module2.exports = { runCall };
  }
});

// agent/call.js
var require_call = __commonJS({
  "agent/call.js"(exports2, module2) {
    "use strict";
    var { speak } = require_voice();
    var { hear } = require_hear();
    var { runCall } = require_call_runner();
    async function voiceCall({
      product,
      leadFields,
      persona,
      companyName,
      callbackNumber,
      callbackIn,
      contactEmail,
      token,
      portal,
      learning,
      onLog = () => {
      },
      onMode = () => {
      },
      speakFn,
      listenFn
    }) {
      const say = speakFn || (async (text) => {
        onMode("speaking");
        onLog("AGENT: " + text);
        return speak(text);
      });
      const listen = listenFn || (async () => {
        onMode("listening");
        onLog("(listening...)");
        const t = await hear({ timeoutMs: 6e3 });
        if (t) onLog("LEAD:  " + t);
        else onLog("(nothing heard)");
        return t;
      });
      onLog("Starting live call\u2026");
      const result = await runCall({ product, leadFields, persona, companyName, callbackNumber, callbackIn, speak: say, listen, contactEmail, learning });
      onLog("Call finished.");
      const updatedLearning = result.learning || learning || {};
      let posted = null;
      if (portal && token) {
        try {
          const res = await fetch(`${portal.replace(/\/+$/, "")}/api/call-result`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              product,
              transcript: result.transcript,
              score: result.score,
              goodLead: result.goodLead,
              escalateToHuman: result.escalateToHuman,
              strategies: result.strategies || [],
              summary: result.summary
            })
          });
          posted = res.status;
          const body = await res.json().catch(() => ({}));
          onLog(body.emailed ? "Qualified lead email sent \u2713" : "Result reported.");
        } catch (e) {
          onLog(`Could not report result (${e.message}).`);
        }
      }
      return { ...result, posted, learning: updatedLearning };
    }
    module2.exports = { voiceCall };
  }
});

// agent/agent.js
var path = require("node:path");
var fs = require("node:fs");
var os = require("node:os");
var crypto = require("node:crypto");
var { spawn } = require("node:child_process");
var { HEARTBEAT_INTERVAL_MS } = require_protocol();
var { setUi } = require_ui();
var { topStrategy } = require_brain();
function defaultConfigPath() {
  const base = process.env.AUTODIAL_HOME ? process.env.AUTODIAL_HOME : path.join(os.homedir(), ".magicdialer");
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
  console.log(`[agent] ${(/* @__PURE__ */ new Date()).toISOString()} ${msg}`);
}
var VERSION = "1.1.0";
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
  if (changed) {
    saveConfig(config, cfgPath);
    pushActivity(config, "Admin updated the sales form from the portal - applied.");
    console.log(`[agent] applied portal config: ${JSON.stringify({
      product: config.product,
      leadFields: config.leadFields || [],
      companyName: config.companyName || null,
      callbackNumber: config.callbackNumber || null,
      callbackIn: config.callbackIn || null,
      callList: (config.callList || []).length,
      searchEnabled: config.searchEnabled
    })}`);
  }
  return changed;
}
function bumpStats(config, result) {
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
  s.qualifiedRate = Math.round(100 * s.qualified / Math.max(1, s.calls)) / 100;
  config.stats = s;
  return s;
}
function pushActivity(config, msg) {
  const feed = (config.activity || []).slice(0, 29);
  feed.unshift({ at: (/* @__PURE__ */ new Date()).toISOString(), msg });
  config.activity = feed;
  return feed;
}
function post(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
}
function showCockpit(configDir) {
  const isPacked = path.basename(process.execPath).toLowerCase().includes("magicdialer");
  if (!isPacked) return;
  if (process.env.MAGICDIALER_NO_COCKPIT === "1") return;
  try {
    spawn("powershell.exe", [
      "-NoProfile",
      "-WindowStyle",
      "Hidden",
      "-Command",
      `Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class HC{[DllImport("kernel32.dll")]public static extern IntPtr GetConsoleWindow();[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);}';[HC]::ShowWindow([HC]::GetConsoleWindow(),0)`
    ], { stdio: "ignore" });
    const cockpit = path.join(path.dirname(process.execPath), "cockpit.ps1");
    if (fs.existsSync(cockpit)) {
      spawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", cockpit], { stdio: "ignore" });
    }
  } catch {
  }
}
var { createInterface } = require("node:readline");
function ask(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question + " ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
async function runAgent(opts = {}) {
  const cfgPath = opts.configPath || defaultConfigPath();
  let config = loadConfig(cfgPath);
  if (!config || !config.token) {
    log("No config yet \u2014 starting setup.");
    config = config || {};
    config.machineId = config.machineId || crypto.randomUUID();
    config.portalUrl = opts.portalUrl || await ask("Magic Dialer portal URL (from your admin):");
    config.token = opts.token || await ask("Your Magic Dialer access token (from your admin):");
    saveConfig(config, cfgPath);
    log("Config saved.");
  }
  if (opts.setup === true) {
    log("");
    log("============================================================");
    log("                 MAGIC DIALER \u2014 1-minute setup");
    log("============================================================");
    log("");
    config.product = await ask("What do you sell / what services do you provide?");
    config.leadFieldsRaw = await ask("What do you need from a qualified lead (comma-separated)?");
    config.contactEmail = await ask("Where should qualified leads be emailed?");
    config.leadFields = config.leadFieldsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    log("Optional: your phone/VOIP line (press Enter on each to skip and configure later)");
    config.voip = config.voip || {};
    config.voip.provider = (await ask("VOIP/SIP provider (e.g. Twilio, Asterisk)? (Enter = none yet):")).trim() || config.voip.provider || "";
    config.voip.number = (await ask("Your outbound phone number? (Enter = none yet):")).trim() || config.voip.number || "";
    config.voip.username = (await ask("SIP username/account? (Enter = none yet):")).trim() || config.voip.username || "";
    config.voip.server = (await ask("SIP domain/server (e.g. sip.example.com)? (Enter = none yet):")).trim() || config.voip.server || "";
    if (!config.voip.provider && !config.voip.number && !config.voip.username && !config.voip.server) {
      config.voip.ready = false;
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
  const ui = (patch) => setUi(configDir, {
    version: VERSION,
    agent: (config.persona || "autumn").toLowerCase().includes("female") ? "Autumn" : "Atlas",
    company: config.companyName || "our team",
    product: productLabel,
    machineId: config.machineId,
    stats: config.stats || null,
    strategy: config.learning ? topStrategy(config.learning) : null,
    callListCount: Array.isArray(config.callList) ? config.callList.length : 0,
    logs: (config.activity || []).slice(0, 12),
    ...patch
  });
  ui({ status: "STARTING", mode: "idle", line: "Starting Magic Dialer agent..." });
  const portal = config.portalUrl.replace(/\/+$/, "");
  if (opts.call === true) {
    const { voiceCall } = require_call();
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
        onLog: (m) => {
          log(m);
          ui({ line: m });
        },
        onMode: (m) => ui({ mode: m })
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
