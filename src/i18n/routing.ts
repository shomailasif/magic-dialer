import { defineRouting } from "next-intl/routing";

export const locales = [
  "en", // English
  "fr", // French
  "es", // Spanish
  "de", // German
  "pt", // Portuguese
  "it", // Italian
  "nl", // Dutch
  "ru", // Russian
  "uk", // Ukrainian
  "pl", // Polish
  "tr", // Turkish
  "ar", // Arabic (RTL)
  "he", // Hebrew (RTL)
  "zh", // Chinese (Simplified)
  "ja", // Japanese
  "ko", // Korean
  "hi", // Hindi
  "id", // Indonesian
  "vi", // Vietnamese
  "ur", // Urdu (RTL)
] as const;

export const defaultLocale = "en";

export const rtlLocales: string[] = ["ar", "he", "ur"];

export function isRtl(locale: string): boolean {
  return rtlLocales.includes(locale);
}

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
