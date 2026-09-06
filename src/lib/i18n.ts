/**
 * Lightweight server-side message lookup for non-React modules (lib/,
 * route handlers). next-intl's `useTranslations`/`getTranslations` only work
 * within a request that has the next-intl config. For lib modules we resolve
 * the locale explicitly (from cookies) and format against the message JSON
 * directly.
 */

const cache = new Map<string, Record<string, unknown>>();

export function loadMessages(locale: string): Record<string, unknown> {
  const cached = cache.get(locale);
  if (cached) return cached;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fresh: Record<string, unknown> = require(`../../messages/${locale}.json`);
  cache.set(locale, fresh);
  return fresh;
}

export type Params = Record<string, string | number>;

function getByPath(obj: unknown, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

export function formatMessage(
  template: string,
  params?: Params,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = params[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

/**
 * Translate a message for a specific locale/namespace/key in a non-React
 * context. `ns` is the top-level message namespace (e.g. "email") and `key`
 * is the dotted path within it.
 */
export function getMessage(
  locale: string,
  ns: string,
  key: string,
  params?: Params,
): string {
  const messages = loadMessages(locale);
  const nsObj = (messages as Record<string, unknown>)[ns];
  const raw = getByPath(nsObj, key);
  if (typeof raw !== "string") return key;
  return formatMessage(raw, params);
}

export function messagesForLocale(locale: string): Record<string, unknown> {
  return loadMessages(locale);
}
