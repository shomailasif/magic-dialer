const { speak } = require("./voice");
const { hear } = require("./hear");
const { runCall } = require("./call-runner");

/**
 * Live voice call driver.
 *
 * Runs a real spoken AI sales call on the customer's PC using the local
 * microphone + speakers (free, works with no provider). The neural voice
 * speaks through the speakers; Windows speech recognition hears the lead
 * through the microphone. The brain scores the lead and emails the summary.
 *
 * A real phone provider (SIP trunk to actual phone numbers) costs money —
 * see the README. When a provider is added, only the `speak`/`listen`
 * functions need to be swapped to stream audio into the call (RTP); the
 * conversation logic in runCall stays identical.
 */

/**
 * Run one live voice call. Returns the call result (same shape the portal
 * expects for /api/call-result) plus the transcript already posted to the
 * portal.
 *
 * `speakFn`/`listenFn` are the pluggable audio transport. Defaults to the
 * PC speaker + microphone.
 */
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
  locale = "en",
  voiceStyle = "human",
  onLog = () => {},
  onMode = () => {},
  speakFn,
  listenFn,
}) {
  const say = speakFn || (async (text) => { onMode("speaking"); onLog("AGENT: " + text); return speak(text, { locale, style: voiceStyle }); });
  const listen = listenFn || (async () => { onMode("listening"); onLog("(listening...)"); const t = await hear({ timeoutMs: 6000, locale }); if (t) onLog("LEAD:  " + t); else onLog("(nothing heard)"); return t; });

  onLog("Starting live call…");
  const result = await runCall({ product, leadFields, persona, companyName, callbackNumber, callbackIn, speak: say, listen, contactEmail, learning, locale });
  onLog("Call finished.");

  // Persist the improved technique scores back into config.
  const updatedLearning = result.learning || learning || {};

  // Report to the portal (lead scoring, summaries, qualified-lead email).
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
          summary: result.summary,
        }),
      });
      posted = res.status;
      const body = await res.json().catch(() => ({}));
      onLog(body.emailed ? "Qualified lead email sent ✓" : "Result reported.");
    } catch (e) {
      onLog(`Could not report result (${e.message}).`);
    }
  }

  return { ...result, posted, learning: updatedLearning };
}

module.exports = { voiceCall };
