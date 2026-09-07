const { makeBrain, scoreLead, shouldEscalate, learn } = require("./brain");
const I18N = require("./brain-i18n");

const NAME_BORN = /\b(my name is|this is|it's|thats)\s+([a-z]+)/i;
const NAME_TOKEN = /\b(hi|hello|hey|yes|yeah|no|sure|okay|ok|fine|thanks|good|great|correct|right)\b/i;

/**
 * Runs one sales call with the charm brain.
 *
 * Flow: hook opening -> active listening -> rapport -> fields (conversational,
 * one gentle re-ask on silence) -> objection handling (one soft pivot, then a
 * graceful exit) -> close with a real next step. The braid never sounds like
 * a form: it reflects what the lead says and sells warmth, not questions.
 *
 * `locale` (en/es/fr/de/pt/hi/auto) switches the whole call: opening, rapport,
 * pivots, closes, field questions, rejection detection and escalation words.
 */
async function runCall({ product, leadFields, persona, companyName, callbackNumber, callbackIn, speak, listen, contactEmail, learning, locale = "en" }) {
  const requested = I18N.normalizeLocale(locale);
  let loc = requested === "auto" ? "en" : requested;
  let brain = makeBrain({ product, leadFields, persona, companyName, learning, locale: loc });
  const transcript = [];
  const timeline = [];

  const isNegative = (t) => (I18N.NEGATIVE_BY_LOCALE[loc] || I18N.NEGATIVE_BY_LOCALE.en).test(String(t || ""));
  const isSoft = (t) => (I18N.SOFT_BY_LOCALE[loc] || I18N.SOFT_BY_LOCALE.en).test(String(t || ""));

  // "auto" mode opens in English, then locks onto the lead's actual language
  // after their first reply. Switching brain mid-call keeps every pivot,
  // question and close from then on in that language.
  const retuneFor = (text) => {
    if (requested !== "auto") return;
    const d = I18N.detectLanguage(String(text || "").toLowerCase(), "en");
    if (d !== loc) {
      loc = d;
      brain = makeBrain({ product, leadFields, persona, companyName, learning, locale: loc });
    }
  };

  // Think-before-speak: a short, human pause before each line so the agent
  // doesn't machine-gun answers (charm, and lets the mic pick up me talk).
  const think = () => new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 700)));
  let firstLine = true;
  let lastAgentText = "";

  // On a speaker+mic rig the agent's own voice echoes back and the grammar
  // can match it as the lead's answer. If what we heard is a fragment of what
  // we just said, it's us ??? treat it as silence.
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
  const lead = (text) => {
    if (!String(text).startsWith("(silence)")) heardSomething = true;
    transcript.push({ role: "lead", text });
  };

const finish = (verdict) => {
    const allLeadWords = transcript
      .filter((t) => t.role === "lead")
      .map((t) => t.text)
      .filter((t) => !t.startsWith("(silence)"))
      .join(" ");
    const esc = shouldEscalate({ goodLead: verdict.goodLead, maxAttemptsOfRejection: verdict.maxAttemptsOfRejection, hearsHumanRequest: allLeadWords, locale: loc });
    const goodConversation = verdict.goodLead || heardSomething === true || transcript.filter((t) => t.role === "lead" && !t.text.startsWith("(silence)")).length >= 2;
    return {
      product,
      company: brain.company,
      transcript,
      timeline,
      score: Number(verdict.score.toFixed(2)),
      goodLead: verdict.goodLead,
      escalateToHuman: esc.escalate,
      escalateReason: esc.reason,
      learning: learn(learning || {}, { goodLead: verdict.goodLead, strategies: brain.used, missed: brain.missed, goodConversation, friendlyKeys: brain.usedFriendly }),
      strategies: Array.from(new Set(brain.used)),
      summary: summarize(transcript, verdict.goodLead, product),
      contactEmail: contactEmail || null,
    };
  };

  let rejectionCount = 0;
  let leadName = null;
  let heardSomething = false;

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

  const handOff = async () => {
    await agent(brain.handoff());
  };

  // 1. Hook opening + charm.
  await agent(brain.opening(1));
  let reply = await listenForLead();

  if (!reply) {
    await agent(brain.reopenOut());
    reply = await listenForLead();
    if (!reply) {
      lead("(silence)");
      await agent(brain.deadAirClose());
      return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
    }
  }

  lead(reply);
  retuneFor(reply);

  const esc = shouldEscalate({ goodLead: false, maxAttemptsOfRejection: 0, hearsHumanRequest: reply, locale: loc });
  if (esc.escalate) {
    await handOff();
    return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
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
        return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
      }
    } else {
      lead("(silence)");
      await agent(brain.pivotGraceful());
      return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
    }
  }

  // 2a. The caller asks US something unexpected (question detection): answer
  //     it warmly with a real product answer, then steer back to the pitch.
  //     Answers that are already on-script (a name, a confirmation, a soft
  //     need) are NEVER intercepted, so the flow never eats a real answer.
  const answeredDirectly = captureName(reply) !== null || /\b(yes|yeah|yep|ok|okay|sure|alright|fine|good|perfect|thanks|thank you|sounds good|that works|cool|right)\b/i.test(String(reply || "")) && String(reply || "").length < 24;
  if (!isNegative(reply) && !answeredDirectly && !isSoft(reply) && (brain.isQuestion(reply) || String(reply || "").length >= 6)) {
    const line = brain.isQuestion(reply) ? brain.answerQuestion(reply) : brain.friendlyFor(reply);
    if (line) {
      await agent(line);
      const thenReply = await listenForLead();
      if (thenReply && !thenReply.startsWith("(silence)")) { lead(thenReply); reply = thenReply; }
      else lead("(silence)");
    }
  }

  // 2. Soft objection (busy / info / existing dispatcher / slow market) gets
  //    its research pivot, then the call continues naturally.
  const wasSoft = !isNegative(reply) && isSoft(reply);
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

  // 3. Rapport, then fields (every configured field is asked, so the
  //    customer's leads are complete).
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
          return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
        }
        await agent(brain.pivotSoft(asked + 7, answer));
        const again = await listenForLead();
        if (again && !again.startsWith("(silence)")) {
          lead(again);
          if (isNegative(again)) {
            await agent(brain.pivotGraceful());
            return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
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
            return finish(scoreLead({ transcript, fields: leadFields, locale: loc }));
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

  // 3. Close with a real next step.
  const verdict = scoreLead({ transcript, fields: leadFields, locale: loc });
  const closeOpts = { callbackNumber: callbackNumber || null, callbackIn: callbackIn || null };
  await agent(brain.qualifyingClose(verdict.goodLead, leadName, closeOpts));

  return finish(verdict);
}

function summarize(transcript, goodLead, product) {
  const leadLines = transcript.filter((t) => t.role === "lead").map((t) => t.text.replace(/^\((silence)\)$/, "no answer")).filter(Boolean);
  return `Call about ${product}: ${goodLead ? "QUALIFIED LEAD" : "not a lead"}. ` +
    `Lead said: ${leadLines.join(" | ") || "nothing detected"}.`;
}

module.exports = { runCall };
