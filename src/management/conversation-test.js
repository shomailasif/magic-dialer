const { speak } = require("./agent/voice");
const { hear } = require("./agent/hear");

/**
 * Two-way voice demo: the agent SPEAKS, then LISTENS (up to ~6s) for you to
 * talk into the mic, then acknowledges what it heard. All free / built-in.
 *
 * Run: node conversation-test.js
 */
async function main() {
  console.log("=== Two-way voice: speak + hear ===\n");
  console.log("The agent will speak, then wait ~6s for you to say something into the mic.\n");

  await speak("Hi there! This is Autumn. Go ahead and say hello, so I can hear you.", { rate: 11, locale: "en" });

  console.log("Listening for up to 6 seconds... (talk into your mic)");
  const heard = hear({ timeoutMs: 6000 });

  if (heard) {
    console.log(`\nThe agent HEARD: "${heard}"`);
    await speak(`That's great, I heard you say ${head(heard)}. Thanks so much for talking with me today!`, { rate: 9, locale: "en" });
  } else {
    console.log("\n(Mic was silent or no audio detected — that's expected if you didn't speak.)");
    await speak("No problem at all. Reach out anytime and we can chat!", { rate: 9, locale: "en" });
  }

  console.log("\n=== Done. Speak + hear both wired and working. ===");
}

function head(s) {
  const t = String(s).split(/\s+/).slice(0, 4).join(" ");
  return t ? `"${t}..."` : "something";
}

main();
