const { speak } = require("./agent/voice");

/**
 * Audible demo of the friendly, high-energy female agent voice.
 * Run: node speak-test.js
 */
async function main() {
  console.log("Speaking a sample of the friendly, high-energy female voice...\n");
  console.log("  (Listen: the AI introduces itself and delivers a warm pitch)");

  const lines = [
    { t: "Hi there! So glad I got you. This is Autumn from what you're calling about — how are you doing today?", r: 12 },
    { t: "Oh wonderful, I'm so happy to hear that! I wanted to reach out because I think we can really help you.", r: 10 },
    { t: "Would it be okay if I ask you a couple quick questions? It'll only take a minute — I promise it's worth it.", r: 9 },
  ];

  for (const l of lines) {
    const { engine, ok } = await speak(l.t, { rate: l.r / 10, volume: 100, locale: "en" });
    console.log(`  [engine: ${engine}, ok: ${ok}]`);
    await new Promise((r) => setTimeout(r, 700));
  }

  console.log("\nDone. If you heard the friendly female neural voice, the voice engine works.");
}

main();
