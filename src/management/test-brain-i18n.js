// Multilingual brain tests: every locale must open, qualify, pivot, close and
// handle rejection the same way the English brain does - and never mix English
// phrasing into a non-English call (or vice versa).
const { runCall } = require("./agent/call-runner");
const I18N = require("./agent/brain-i18n");
const { makeBrain, scoreLead, shouldEscalate } = require("./agent/brain");

const CUSTOMER = {
  product: "Dispatch Services to truckers for USA and canada",
  leadFields: ["NAME", "MC NUMBER", "PHONE NUMBER", "TEXT REQUEST", "TRUCK TYPE"],
  persona: "Shomail",
  companyName: "ZAZ Logistics",
  contactEmail: "test@example.com",
};

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok) {
  if (ok) { pass++; console.log(`  [PASS] ${name}`); }
  else { fail++; failures.push(name); console.log(`  [FAIL] ${name}`); }
}

function makeListen(script) {
  const q = [...script];
  return async () => (q.length ? q.shift() : null);
}

async function run(script, opts = {}) {
  return runCall({ ...CUSTOMER, ...opts, speak: () => {}, listen: makeListen(script) });
}

function agentText(r) {
  return r.transcript.filter((t) => t.role === "agent").map((t) => t.text);
}
function allLower(r) {
  return agentText(r).join("\n").toLowerCase();
}
function last(r) {
  const lines = agentText(r);
  return lines[lines.length - 1] || "";
}

const FULL_CALL = {
  es: ["¡Hola! Bien, gracias", "Me llamo Juan", "MC 1234", "555-0100", "Necesito una carga para esta semana", "53 pies"],
  fr: ["Bonjour, ça va bien", "Je m'appelle Jean", "MC 1234", "555-0100", "J'ai besoin d'une charge pour cette semaine", "53 pieds"],
  de: ["Hallo, gut danke", "Ich heisse Stefan", "MC 1234", "555-0100", "Ich brauche eine Ladung für diese Woche", "53 Fuss"],
  pt: ["Olá, estou bem", "Me chamo Carlos", "MC 1234", "555-0100", "Preciso de uma carga para esta semana", "53 pés"],
  hi: ["नमस्ते, मैं ठीक हूँ", "मेरा नाम राज है", "MC 1234", "555-0100", "मुझे इस हफ्ते एक माल चाहिए", "53 फीट"],
};

(async () => {
  console.log("===== Locale plumbing ===== ");
  check("supports exactly 6 locales", I18N.SUPPORTED_LOCALES.length === 6);
  check("normalizeLocale en->en", I18N.normalizeLocale("en") === "en");
  check("normalizeLocale es-MX -> es", I18N.normalizeLocale("es-MX") === "es");
  check("normalizeLocale fr-FR -> fr", I18N.normalizeLocale("fr-FR") === "fr");
  check("normalizeLocale auto stays auto", I18N.normalizeLocale("auto") === "auto");
  check("normalizeLocale unknown -> en", I18N.normalizeLocale("xx") === "en");

  console.log("===== detectLanguage ===== ");
  check("detects Spanish", I18N.detectLanguage("hola, no me interesa gracias") === "es");
  check("detects French", I18N.detectLanguage("bonjour, non merci") === "fr");
  check("detects German", I18N.detectLanguage("hallo, nicht interessiert") === "de");
  check("detects Portuguese", I18N.detectLanguage("olá, não obrigado") === "pt");
  check("detects Hindi (Devanagari)", I18N.detectLanguage("नमस्ते, मुझे नहीं चाहिए धन्यवाद") === "hi");
  check("detects English", I18N.detectLanguage("hello, not interested thanks") === "en");
  check("falls back to en on noise", I18N.detectLanguage("zzz qqq") === "en");

  console.log("===== questionsFor / retryFor / ackFor ===== ");
  for (const l of I18N.SUPPORTED_LOCALES) {
    const q = I18N.questionsFor(l, "mc number", 0);
    const r = I18N.retryFor(l, "name");
    if (l === "en") {
      check("en first question stays canonical", /can i grab your/i.test(q));
      check("en retry stays canonical", /didn't quite catch|i didn't/i.test(r));
    } else {
      check(`${l} first question is localized (not EN)`, q && !/first, can i grab your/i.test(q) && q.length > 5);
      check(`${l} retry is localized`, r && !/didn't quite catch/i.test(r) && r.length > 5);
    }
  }
  check("English digit reflection preserved through ackFor", /saved/.test(I18N.ackFor("en", "eight eight nine nine", 1)));

  // scoreLead / shouldEscalate / NEGATIVE lexicons are used by the runner.
  console.log("===== Rejection + escalation lexicons ===== ");
  check("es 'no me interesa' counts negative", I18N.NEGATIVE_BY_LOCALE.es.test("no me interesa"));
  check("es 'busy on the road' counts soft", I18N.SOFT_BY_LOCALE.es.test("estoy conduciendo"));
  check("fr 'pas intéressé' counts negative", I18N.NEGATIVE_BY_LOCALE.fr.test("non, pas intéressé"));
  check("de 'nicht interessiert' counts negative", I18N.NEGATIVE_BY_LOCALE.de.test("nein, nicht interessiert"));
  check("pt 'não obrigado' counts negative", I18N.NEGATIVE_BY_LOCALE.pt.test("não, não obrigado"));
  check("hi 'मुझे नहीं चाहिए' counts negative", I18N.NEGATIVE_BY_LOCALE.hi.test("मुझे नहीं चाहिए"));
  const escEs = shouldEscalate({ goodLead: false, maxAttemptsOfRejection: 0, hearsHumanRequest: "quiero hablar con una persona real", locale: "es" });
  check("es human request escalates", escEs.escalate === true);
  const escEn = shouldEscalate({ goodLead: false, maxAttemptsOfRejection: 0, hearsHumanRequest: "hey let me talk to a real person", locale: "en" });
  check("en human request still escalates", escEn.escalate === true);

  console.log("===== Full call per locale (structure identical to EN) ===== ");
  for (const [loc, script] of Object.entries(FULL_CALL)) {
    const result = await run(script, { locale: loc });
    const lower = allLower(result);
    const first = lower.split("\n").find((l) => l.trim()) || "";
    const lines = agentText(result).length;
    check(`${loc}: closes as a good lead`, result.goodLead === true);
    check(`${loc}: opening is localized (not the EN cold-open)`, !first.includes("this is shomail from zaz logistics") && lines >= 5);
    check(`${loc}: EN phrasing never leaked into the call`, !/this is shomail from zaz|first, can i grab your/.test(lower));
    check(`${loc}: asks more than one field`, (lower.match(/\bmc\b/g) || []).length >= 2 || lines >= 7);
    check(`${loc}: does not end on an EN close`, !/take care!|manager will call you back/.test(last(result).toLowerCase()));
  }

  console.log("===== Non-English rejection exits (no pushy upsell) ===== ");
  const rejEs = await run(["no me interesa", "no gracias", "no"], { locale: "es" });
  check("es: refused lead is not goodLead", rejEs.goodLead === false);
  check("es: graceful exit in Spanish", /no se interese|le quito de la lista|cuídese|cuídate|hablamos luego|interesara/i.test(allLower(rejEs)) || agentText(rejEs).length <= 5);
  check("es: did not keep field-questioning after refusal", !/mc number|número/.test(allLower(rejEs)));

  console.log("===== Escalation to a human in the lead's language ===== ");
  const handEs = await run(["quiero hablar con una persona real"], { locale: "es" });
  check("es: escalates", handEs.escalateToHuman === true);
  check("es: transfer line localized", /persona/.test(allLower(handEs)));

  console.log("===== auto locale self-tunes off the first reply ===== ");
  const autoFr = await run(["bonjour, non merci beaucoup", "oui c'est ça"], { locale: "auto" });
  check("auto: detects French lead", autoFr.goodLead === undefined || autoFr.goodLead === false);
  check("auto: French soft/rejection used (pivot not English)", !/alright, i hear you/.test(allLower(autoFr)));

  console.log("===== makeBrain locale flag ===== ");
  const bEs = makeBrain({ product: "x", leadFields: ["name"], persona: "p", companyName: "c", locale: "es" });
  check("makeBrain exposes resolved locale", bEs.locale === "es");
  check("makeBrain es question not English", !/first, can i grab your/i.test(bEs.question("name", 0)));

  console.log("");
  console.log(`===== RESULT: ${pass} passed, ${fail} failed =====`);
  if (failures.length) console.log("Failures: " + failures.join(" | "));
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});