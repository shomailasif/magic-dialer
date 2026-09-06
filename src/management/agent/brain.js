/**
 * AI sales conversation brain - "charm engine", prepped from current market
 * research (Gong Labs 300M-call data, CallHippo 72k calls, Sandler, RAIN Group,
 * ATRI/ATBS/OOIDA freight data, Cialdini).
 *
 * Principles baked in:
 *  - the first 30 seconds decide the call -> openers are strategy, not taste
 *    (reason-first = 2.1x, "how have you been" = 6.6x, permission+timebox ~11%,
 *     and NEVER "did I catch you at a bad time?" = worst performer at 2.15%)
 *  - every turn ends on a QUESTION, never a statement (top reps do this 54.3%)
 *  - objections are 50% reflexive brush-offs before any value lands -> a
 *    pattern interrupt + reframe, never an argument
 *  - qualify by making the prospect state the pain (Sandler: pain stated by the
 *    buyer scores; stated by the seller scores zero)
 *  - close assumptively - move to logistics, never ask "do you want to?"
 *  - loss aversion beats gain framing: "money you leave behind" not "you could
 *    earn more" (Kahneman/Tversky)
 *
 * The brain TRACKS which strategy was used and LEARNS from outcomes
 * (strategyScores in the config learning block); the winner surfaces in the
 * cockpit and portal as "preparedness".
 */

const GREETINGS = [
  "How are you doing today?",
  "How's your week going?",
  "Hope I caught you at a good time - how are you?",
];

// [key, name, source, why] - surfaced as the strategy manifest (preparedness).
const STRATEGY_INFO = {
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
  close_callback_number: { name: "Service manager call-back", source: "customer config", why: "A named number + time makes the next step concrete for service sales." },
};

// Learned-preference pool for each conversation stage.
// Weight = base + 0.5 * learned score, clipped so nothing is ever zero.
// Learned-preference pools + questions/replies live in brain-i18n (multilingual).
// The English pool strings here are byte-for-byte the tested originals.
const I18N = require("./brain-i18n");
const POOLS = I18N.poolsFor("en");
function pick(arr, seed = Math.floor(Math.random() * 1e9)) {
  return arr[Math.floor(Math.abs(seed)) % arr.length];
}

function pickStrategy(group, scoreMap, pools, seed) {
  const pool = pools[group] || [];
  if (!pool.length) return null;
  const weighted = pool.map((p) => {
    const learned = scoreMap ? Number(scoreMap[p.key] || 0) : 0;
    const w = Math.max(0.15, p.base + 0.5 * learned);
    return { p, w };
  });
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.abs(seed) % 1000 / 1000 * total;
  for (const x of weighted) {
    r -= x.w;
    if (r <= 0) return x.p;
  }
  return weighted[weighted.length - 1].p;
}

function makeBrain({ product, leadFields, persona = "high-energy friendly female", companyName = "our team", learning = {}, locale = "en" }) {
  const fields = Array.isArray(leadFields) ? leadFields.filter(Boolean) : [];
  const agentName = friendlyName(persona);
  const company = String(companyName || "").trim() || "our team";
  const scoreMap = learning.strategyScores || {};
  const used = [];
  const loc = I18N.normalizeLocale(locale);
  const pools = I18N.poolsFor(loc);

  const intro = `This is ${agentName} from ${company}.`;
  const g = (s) => ({ group: s, used, agentName, company, intro });

  function fill(template) {
    return String(template)
      .replace(/\{agent\}/g, agentName)
      .replace(/\{company\}/g, company);
  }

  return {
    product,
    company,
    fields,
    persona,
    locale: loc,
    agentName,
    learning,
    used,
    strategyManifest: STRATEGY_INFO,

    opening(seed) {
      const s = pickStrategy("opening", scoreMap, pools, seed);
      if (s) used.push(s.key);
      // Non-English openers already introduce themselves inside the line.
      const body = fill(pick(s.pool, seed + 7));
      return loc === "en" ? `${intro} ${body}` : body;
    },

    rapport(seed) {
      const s = pickStrategy("rapport", scoreMap, pools, seed);
      if (s) used.push(s.key);
      return fill(pick(s.pool, seed));
    },

    question(field, asked) {
      return I18N.questionsFor(loc, field, asked);
    },

    retryQuestion(field) {
      return I18N.retryFor(loc, field);
    },

    reopenOut() {
      return I18N.pick(I18N.REOPEN_BY_LOCALE[loc] || I18N.REOPEN_BY_LOCALE.en, 2);
    },

    deadAirClose() {
      return I18N.DEADAIR_BY_LOCALE[loc] || I18N.DEADAIR_BY_LOCALE.en;
    },

    handoff() {
      return I18N.HANDOFF_BY_LOCALE[loc] || I18N.HANDOFF_BY_LOCALE.en;
    },

    reflect(leadText, seed) {
      const t = String(leadText || "").toLowerCase();
      if (loc !== "en") return I18N.ackFor(loc, leadText, seed);
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
          "Thanks for the detail - that's exactly what I needed.",
        ],
        seed,
      );
    },

    ackFor(leadText, seed) {
      return I18N.ackFor(loc, leadText, seed);
    },

    pivotSoft(seed, objectionText) {
      const text = String(objectionText || "").toLowerCase();
      let s;
      if (/\b(driving|drive|on the road|busy|rolling|shutting down|parked now)\b/.test(text)) s = pickByKey(pools.pivot, "obj_busy_callback_slot", scoreMap, seed);
      else if (/info|email|send|one.pager|look at it/.test(text)) s = pickByKey(pools.pivot, "obj_send_info_qualify", scoreMap, seed);
      else if (/dispatcher|broker|have someone|got a guy|leased to/.test(text)) s = pickByKey(pools.pivot, "obj_have_dispatcher_one_load", scoreMap, seed);
      else if (/\b(market is bad|market's bad|slow market)\b|\brate\b|rates|slow|bad market|no freight|no loads|board is dead/.test(text)) s = pickByKey(pools.pivot, "obj_rates_loss_aversion", scoreMap, seed);
      else s = pickStrategy("pivot", scoreMap, pools, seed);
      used.push(s.key);
      return fill(pick(s.pool, seed + 3));
    },

    pivotGraceful() {
      const seed = 5;
      const s = pickStrategy("pivot", scoreMap, pools, seed);
      used.push(s.key + "_exit");
      return I18N.pick(I18N.GRACEFUL_BY_LOCALE[loc] || I18N.GRACEFUL_BY_LOCALE.en, seed);
    },

    qualifyingClose(goodLead, name, { callbackNumber, callbackIn } = {}) {
      const who = name ? `, ${name}` : "";
      if (goodLead && callbackNumber) {
        used.push("close_callback_number");
        const inTime = callbackIn ? ` in ${callbackIn}` : "";
        return I18N.callbackCloseFor(loc, who, inTime, callbackNumber);
      }
      if (goodLead) {
        const s = pickByKey(pools.closeGood, "close_assumptive", scoreMap, 11);
        const w = pickByKey(pools.closeWarm, "close_backup_two_weeks", scoreMap, 3);
        used.push(s.key, w.key);
        const line = `${loc === "en" ? "Perfect" + who + ". " : (who ? "Perfecto" + who + ". " : "Perfecto. ")}${fill(pick(s.pool, 11))} ${fill(pick(w.pool, 3))}`;
        return line;
      }
      const bye = loc === "en"
        ? "Thanks for your time today - if anything changes, you know where to find us. Take care!"
        : loc === "es" ? "Gracias por su tiempo hoy - si algo cambia, ya sabe dónde encontrarnos. ¡Cuídese!"
          : loc === "fr" ? "Merci pour votre temps - si ça change, vous savez où nous trouver. Prenez soin de vous !"
            : loc === "de" ? "Danke für Ihre Zeit - wenn sich etwas ändert, wissen Sie, wo Sie uns finden. Passen Sie auf sich auf!"
              : loc === "pt" ? "Obrigado pelo seu tempo - se algo mudar, você já sabe onde nos encontrar. Se cuida!"
                : "आपके समय के लिए धन्यवाद - अगर कुछ बदलता है, तो आप जानते हैं कि हमें कहाँ पाना है। ध्यान रखिए!";
      return bye;
    },
  };
}

function seedNow() { return Date.now(); }

function pickByKey(group, key, scoreMap, seed) {
  const s = group.find((p) => p.key === key) || group[0];
  return s;
}

/** Pick a friendly first-name for the persona (or default to Autumn). */
const DIGIT_WORDS = new Set(["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "oh", "ten", "twenty", "thirty", "forty", "fifty", "hundred", "thousand"]);
const NAME_TOKENS = new Set(["to", "the", "and", "of", "in", "a", "an", "for", "with", "on", "at", "my", "your", "name", "is"]);
const DESCRIPTOR_TOKENS = /(high|energy|friendly|female|male|assistant|magic|dialer|agent|professional|business|personality|persona|helpful|polite|courteous|cheerful|energetic|smart|lady|woman|man|girl|guy|voice|service|tone|warm|natural|human|caller|verified|active|premium|default|basic|standard)/i;

function friendlyName(persona) {
  const s = String(persona || "").trim();
  const part = s.split(/[\s,]+/).find((w) => {
    const clean = w.replace(/[^A-Za-z]/g, "").toLowerCase();
    if (!clean || clean.length < 2 || clean.length > 12) return false;
    if (NAME_TOKENS.has(clean)) return false;
    if (DESCRIPTOR_TOKENS.test(clean)) return false;
    return true;
  });
  if (!part) return "Autumn";
  const clean = part.replace(/[^a-zA-Z]/g, "").toLowerCase();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Score a lead based on how the answers line up with what the customer needs.
 * Language-aware: detects rejection/interest in the lead's own language.
 */
function scoreLead({ transcript, fields, locale = "en" }) {
  const loc = I18N.normalizeLocale(locale);
  const text = transcript.map((t) => (t.role === "lead" ? t.text : "")).join(" ").toLowerCase();

  let positive;
  let negative;
  if (loc === "en") {
    positive = /\b(yes|interested|how much|cost|price|quote|need|looking for|that sounds|go ahead|sure|okay|ok)\b/;
    negative = /\b(no|not interested|no thanks|stop|don't call|never mind|scam|not now|busy|too busy)\b/;
  } else {
    const posWords = I18N.POSITIVE_BY_LOCALE[loc] || I18N.POSITIVE_BY_LOCALE.en;
    const negWords = I18N.NEGATIVE_WORDS_BY_LOCALE[loc] || I18N.NEGATIVE_WORDS_BY_LOCALE.en;
    positive = I18N.lex(posWords);
    negative = I18N.lex(negWords);
  }

  let score = 0.5;
  const posHits = (text.match(positive) || []).length;
  score += posHits * 0.3;

  if (negative.test(text)) {
    score = Math.min(score, 0.25);
  }

  const realAnswers = transcript.filter((t) => t.role === "lead" && !t.text.startsWith("(silence)")).length;
  const answeredBoth = realAnswers >= 2;

  const maxAttemptsOfRejection = transcript.filter((t) => t.role === "lead" && negative.test(t.text.toLowerCase())).length;

  return {
    score,
    goodLead: score >= 0.6 && answeredBoth,
    maxAttemptsOfRejection,
  };
}

/**
 * Decide whether to escalate to a live human, ONLY as a last resort.
 * Language-aware for "I want a real person" requests.
 */
function shouldEscalate({ goodLead, maxAttemptsOfRejection, hearsHumanRequest, locale = "en" }) {
  const loc = I18N.normalizeLocale(locale);
  const humanRe = I18N.HUMAN_BY_LOCALE[loc] || I18N.HUMAN_BY_LOCALE.en;
  const askedForHuman = humanRe.test(String(hearsHumanRequest || ""));
  if (askedForHuman) return { escalate: true, reason: "lead asked for a human" };
  if (!goodLead && maxAttemptsOfRejection >= 2) return { escalate: true, reason: "AI exhausted options" };
  return { escalate: false, reason: "" };
}

/**
 * AI "learning": boost strategies that kept a call on track or qualified it.
 * `strategies` lists the technique keys used during the call.
 */
function learn(learning, { goodLead, strategies }) {
  const scores = { ...(learning.techniqueScores || {}) };
  scores.charm_flow = Math.round((Math.max(0, (scores.charm_flow || 0) + (goodLead ? 1 : -0.2))) * 100) / 100;
  const ss = { ...(learning.strategyScores || {}) };
  for (const k of strategies || []) {
    ss[k] = Math.round(((ss[k] || 0) + (goodLead ? 1 : -0.15)) * 100) / 100;
  }
  return { ...learning, techniqueScores: scores, strategyScores: ss, calls: (learning.calls || 0) + 1 };
}

/** The currently best-performing strategy (for cockpit/portal preparedness). */
function topStrategy(learning) {
  const ss = (learning && learning.strategyScores) || {};
  let best = null;
  let hv = -Infinity;
  for (const k in STRATEGY_INFO) {
    if (ss[k] > hv) { hv = ss[k]; best = k; }
  }
  if (!best || hv <= 0) return null;
  const info = STRATEGY_INFO[best];
  return { key: best, name: info.name, source: info.source, score: hv };
}

module.exports = { makeBrain, scoreLead, shouldEscalate, learn, friendlyName, topStrategy, STRATEGY_INFO };
