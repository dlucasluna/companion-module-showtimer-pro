import type { Locale } from "@/lib/i18n/locales";

const cache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let instance = cache.get(key);
  if (!instance) {
    instance = new Intl.DateTimeFormat(locale, { timeZone: "Europe/Lisbon", ...options });
    cache.set(key, instance);
  }
  return instance;
}

type DateInput = Date | string | number | null | undefined;

const toDate = (value: DateInput) => (value == null ? null : new Date(value));

/** 26/09/2026 */
export function formatDate(value: DateInput, locale: Locale = "pt-PT"): string {
  const date = toDate(value);
  return date ? formatter(locale, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date) : "—";
}

/** 26 de setembro de 2026 */
export function formatDateLong(value: DateInput, locale: Locale = "pt-PT"): string {
  const date = toDate(value);
  return date ? formatter(locale, { day: "numeric", month: "long", year: "numeric" }).format(date) : "—";
}

/** set. 26 */
export function formatMonthShort(value: DateInput, locale: Locale = "pt-PT"): string {
  const date = toDate(value);
  return date ? formatter(locale, { month: "short" }).format(date).replace(".", "") : "";
}

export function formatDateTime(value: DateInput, locale: Locale = "pt-PT"): string {
  const date = toDate(value);
  return date
    ? formatter(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date)
    : "—";
}

/** "há 3 dias", "há 2 h" */
export function formatRelative(value: DateInput, locale: Locale = "pt-PT", now = Date.now()): string {
  const date = toDate(value);
  if (!date) return "—";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const seconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(seconds / (86400 * 30)), "month");
  return rtf.format(Math.round(seconds / (86400 * 365)), "year");
}
