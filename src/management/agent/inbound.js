const { makeBrain } = require("./brain");

/**
 * Incoming calls & texts.
 *
 * When a customer's VOIP is connected (last step), inbound calls and SMS
 * arrive here. This module is the handler: it answers warmly, figures out if
 * the person wants to buy, and (for the business) keeps a friendly, human
 * feel. It also demonstrates the "only escalate as a last resort" rule for
 * inbound too.
 *
 * No VOIP is wired yet, so `send()`/`hangup()` are pluggable; the logic here
 * is fully testable in text.
 */

/** Reply to an inbound text/message. Returns what the agent will send. */
function handleInboundText({ product, message }) {
  const text = String(message || "").toLowerCase();

  if (text.includes("price") || text.includes("cost") || text.includes("quote")) {
    return {
      kind: "reply",
      text: `Thanks for asking! Great news — we'd love to give you a price. ` +
        `Could you tell me a little about what you're looking for, and your contact info?`,
      leadLikely: true,
    };
  }

  if (text.includes("sign up") || text.includes("interested") || text.includes("buy")) {
    return {
      kind: "reply",
      text: `Wonderful, so glad you reached out! Someone will get back to you shortly to get you set up.`,
      leadLikely: true,
    };
  }

  if (text.includes("stop") || text.includes("unsubscribe") || text.includes("no")) {
    return { kind: "reply", text: `Understood — we won't bother you again. Take care!`, leadLikely: false };
  }

  return {
    kind: "reply",
    text: `Hi there! Thanks for reaching out to ${product}. How can I help you today?`,
    leadLikely: true,
  };
}

/** Answer an incoming call — friendly greeting, then ask what they need. */
function answerInboundCall({ product }) {
  const brain = makeBrain({ product, leadFields: [] });
  return {
    kind: "greeting",
    text: `Hi there! You've reached ${product}. ` +
      `This is Autumn — I'm here to help. Could you tell me how I can help you today?`,
    opening: brain.opening,
  };
}

module.exports = { handleInboundText, answerInboundCall };
