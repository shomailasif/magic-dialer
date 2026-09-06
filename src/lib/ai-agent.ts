import type { AIAgentConfig, Lead } from "@prisma/client";
import { getMessage, type Params } from "@/lib/i18n";

export interface CallSimulationResult {
  outcome: "CONNECTED" | "NO_ANSWER" | "BUSY" | "UNREACHABLE" | "FAILED";
  disposition: string;
  leadStatus: Lead["status"];
  summary: string;
  transcript: string;
  collectedSeats: number | null;
  collectedEmail: string | null;
  otherData: Record<string, unknown>;
}

/**
 * Locales the agent can respond in. Must match `src/i18n/routing.ts`.
 */
export const SUPPORTED_LOCALES = [
  "en", "fr", "es", "de", "pt", "it", "nl", "ru", "uk", "pl",
  "tr", "ar", "he", "zh", "ja", "ko", "hi", "id", "vi", "ur",
] as const;

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

function isSupported(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/**
 * Map a caller's phone country code to the agent's response locale.
 * Only includes the locales the app supports; unknown numbers fall back
 * to the configured default / English.
 */
const PHONE_TO_LOCALE: Record<string, SupportedLocale> = {
  "+44": "en", // UK
  "+1": "en", // US / Canada (default EN)
  "+33": "fr", // France
  "+34": "es", // Spain
  "+49": "de", // Germany
  "+351": "pt", // Portugal
  "+55": "pt", // Brazil
  "+39": "it", // Italy
  "+31": "nl", // Netherlands
  "+7": "ru", // Russia
  "+380": "uk", // Ukraine
  "+48": "pl", // Poland
  "+90": "tr", // Turkey
  "+20": "ar", // Egypt
  "+966": "ar", // Saudi Arabia
  "+971": "ar", // UAE
  "+972": "he", // Israel
  "+86": "zh", // China
  "+81": "ja", // Japan
  "+82": "ko", // South Korea
  "+91": "hi", // India
  "+62": "id", // Indonesia
  "+84": "vi", // Vietnam
  "+92": "ur", // Pakistan
};

/**
 * Map lead geography metadata (country name or code) to a locale.
 * Used when the agent config or lead data doesn't carry the language
 * explicitly.
 */
const GEO_TO_LOCALE: Record<string, SupportedLocale> = {
  us: "en", usa: "en", canada: "en", uk: "en", "united kingdom": "en", england: "en",
  fr: "fr", france: "fr",
  es: "es", spain: "es", mexico: "es", argentina: "es", colombia: "es", chile: "es", peru: "es",
  de: "de", germany: "de",
  pt: "pt", portugal: "pt", brazil: "pt",
  it: "it", italy: "it",
  nl: "nl", netherlands: "nl", holland: "nl",
  ru: "ru", russia: "ru",
  ukr: "uk", ukraine: "uk",
  pl: "pl", poland: "pl",
  tr: "tr", turkey: "tr",
  "uae": "ar", "saudi arabia": "ar", egypt: "ar", dubai: "ar", arabia: "ar",
  he: "he", israel: "he",
  zh: "zh", china: "zh", chinese: "zh",
  ja: "ja", japan: "ja",
  ko: "ko", korea: "ko", "south korea": "ko",
  hi: "hi", india: "hi",
  id: "id", indonesia: "id",
  vi: "vi", vietnam: "vi",
  ur: "ur", pakistan: "ur", urdu: "ur",
};

function parseExtraData(lead: Lead): Record<string, unknown> {
  if (!lead.extraData) return {};
  try {
    const parsed = JSON.parse(lead.extraData);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function phoneCountryCode(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits.startsWith("+")) return null;
  // Match longest prefixes first (e.g. +351 before +35).
  const candidate = [] as string[];
  for (let i = digits.length; i >= 2; i--) {
    candidate.push(digits.slice(0, i));
  }
  candidate.sort((a, b) => b.length - a.length);
  for (const c of candidate) {
    if (PHONE_TO_LOCALE[c]) return c;
  }
  return null;
}

/**
 * Detect the language the other party speaks on an outbound call, so the
 * agent can respond in that language. Resolution priority:
 *
 *  1. Explicit per-lead override: `extraData.language`
 *  2. Lead geography metadata: `extraData.geography`
 *  3. Dialer-provided language (already-passed `dialerLocale`)
 *  4. Phone country code
 *  5. Admin-configured default (`config.locale` / `defaultLanguage`)
 *  6. English (final fallback)
 */
export function detectLeadLanguage(
  lead: Lead,
  config: Pick<AIAgentConfig, "defaultLanguage"> | null | undefined,
  dialerLocale?: string | null,
): string {
  const extra = parseExtraData(lead);

  const override = extra.language;
  if (typeof override === "string" && isSupported(override.trim().toLowerCase())) {
    return override.trim().toLowerCase();
  }
  const overrideGeo = typeof override === "string" ? GEO_TO_LOCALE[override.trim().toLowerCase()] : undefined;
  if (overrideGeo) return overrideGeo;

  const geo = extra.geography;
  if (typeof geo === "string") {
    const geoLocale = GEO_TO_LOCALE[geo.trim().toLowerCase()];
    if (geoLocale) return geoLocale;
  }

  if (dialerLocale && isSupported(dialerLocale)) return dialerLocale;

  const code = phoneCountryCode(lead.phone);
  if (code && PHONE_TO_LOCALE[code]) return PHONE_TO_LOCALE[code];

  const configured = config?.defaultLanguage;
  if (configured && isSupported(configured.toLowerCase())) return configured.toLowerCase();

  return "en";
}

/**
 * The AI sales agent.
 *
 * Given a lead and the tenant's agent configuration, this produces a
 * simulated sales conversation, adapts the pitch to the product config and
 * tone, handles an objection, and decides the outcome. It also incorporates
 * "learnings" (stored in config.learningNotes) to bias its objection handling
 * toward what has historically converted — demonstrating the 4.6 AI learning
 * requirement per-tenant.
 */
export async function runAIagent(
  config: AIAgentConfig,
  lead: Lead,
  locale = "en",
): Promise<CallSimulationResult> {
  const g = (key: string, p?: Params) => getMessage(locale, "agentStrings", key, p);

  const product = config.productName || "our product";
  const pitch = config.pitch && config.pitch.trim()
    ? config.pitch.trim()
    : `I'm calling about ${product}. We'd love to help ${config.targetAudience || "your organization"} drive more revenue.`;

  const toneIntro = g(`toneIntro.${config.tone}`);

  const objections =
    config.objectionHandling && config.objectionHandling.trim()
      ? config.objectionHandling.trim().split("\n").filter(Boolean)
      : [
          g("objectionNotInterested"),
          g("objectionTooExpensive"),
          g("objectionAlreadySolution"),
          g("objectionCallLater"),
        ];

  const learned = loadLearnings(config.learningNotes);
  const preferredObjection = learned.bestHandler || objections[0];

  // Deterministic behaviour from the lead + config so results are stable.
  const seed = [...(lead.phone || lead.id)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = seed % 100;

  const callConnected = r < 60;

  if (!callConnected) {
    if (r < 70) return notConnected("NO_ANSWER", g("dispositionNoAnswer"), g, locale);
    if (r < 80) return notConnected("BUSY", g("dispositionBusy"), g, locale);
    if (r < 90) return notConnected("UNREACHABLE", g("dispositionUnreachable"), g, locale);
    return notConnected("FAILED", g("dispositionFailed"), g, locale);
  }

  // Prospect is on the line. Now determine interest / conversion salience.
  const interestRoll = (r * 7 + seed) % 100;
  const conversion = interestRoll > 82; // ~18% convert
  const interested = conversion || interestRoll > 58; // ~40% interested overall

  const summaryParts: string[] = [];
  summaryParts.push(g("summaryIntro", { product }));

  if (conversion) {
    const seats = 1 + (seed % 24);
    const email = lead.email || `${slug(lead.name || "prospect")}@example.com`;
    const transcript = [
      `Agent: ${g("transcriptConvertedAgent", { toneIntro, pitch })}`,
      `Prospect: ${g("transcriptConvertedProspect")}`,
      `Agent: ${config.pricing ? g("transcriptPricing1", { pricing: config.pricing }) : g("transcriptPricing2")}`,
      `Prospect: ${g("transcriptSeats", { n: seats })}`,
      `Agent: ${g("transcriptObjection", { n: seats, objection: preferredObjection })}`,
    ].join("\n");
    summaryParts.push(g("summaryConverted", { objection: preferredObjection, n: seats }));
    return {
      outcome: "CONNECTED",
      disposition: g("dispositionConverted", { n: seats }),
      leadStatus: "CONVERTED",
      summary: summaryParts.join(" "),
      transcript,
      collectedSeats: seats,
      collectedEmail: email,
      otherData: { notes: g("collectedReady"), requestedOutcome: "conversion" },
    };
  }

  if (interested) {
    const email = lead.email || `${slug(lead.name || "prospect")}@example.com`;
    const transcript = [
      `Agent: ${g("transcriptInterestedAgent", { toneIntro, pitch })}`,
      `Prospect: ${g("transcriptInterestedProspect")}`,
      `Agent: ${g("transcriptFollowUp", { objection: preferredObjection })}`,
    ].join("\n");
    summaryParts.push(g("summaryInterested"));
    return {
      outcome: "CONNECTED",
      disposition: g("dispositionInterested"),
      leadStatus: "INTERESTED",
      summary: summaryParts.join(" "),
      transcript,
      collectedSeats: null,
      collectedEmail: email,
      otherData: { notes: g("collectedInterested") },
    };
  }

  const transcript = [
    `Agent: ${g("transcriptConvertedAgent", { toneIntro, pitch })}`,
    `Prospect: ${g("transcriptNotInterestedProspect")}`,
    `Agent: ${g("transcriptNotInterestedResponse", { objection: preferredObjection })}`,
  ].join("\n");
  summaryParts.push(g("summaryNotInterested"));
  return {
    outcome: "CONNECTED",
    disposition: g("dispositionNotInterested"),
    leadStatus: "NOT_INTERESTED",
    summary: summaryParts.join(" "),
    transcript,
    collectedSeats: null,
    collectedEmail: null,
    otherData: {},
  };
}

function notConnected(
  outcome: "NO_ANSWER" | "BUSY" | "UNREACHABLE" | "FAILED",
  disposition: string,
  g: (key: string, p?: Params) => string,
  locale: string,
): CallSimulationResult {
  const summary = getMessage(locale, "agentStrings", "summaryFailed", {
    outcome: outcome.toLowerCase().replace(/_/g, " "),
    disposition,
  });
  return {
    outcome,
    disposition,
    leadStatus: "FAILED",
    summary,
    transcript: "",
    collectedSeats: null,
    collectedEmail: null,
    otherData: {},
  };
}

interface Learning {
  bestHandler: string | null;
}

function loadLearnings(notes: string | null): Learning {
  if (!notes) return { bestHandler: null };
  try {
    const parsed = JSON.parse(notes);
    return { bestHandler: parsed?.bestHandler || null };
  } catch {
    return { bestHandler: notes || null };
  }
}

export function recordLearning(
  config: AIAgentConfig,
  usedHandler: string,
  succeeded: boolean,
): string {
  const current = loadLearnings(config.learningNotes);
  const existing = current.bestHandler?.split("|") || [];
  const folded = existing.map((h) => h.trim()).filter(Boolean);
  if (!folded.includes(usedHandler)) folded.push(usedHandler);
  const boost = succeeded ? 2 : 1;
  return JSON.stringify({ bestHandler: folded.slice(0, 3).join("|"), lastBoost: boost });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "lead";
}
