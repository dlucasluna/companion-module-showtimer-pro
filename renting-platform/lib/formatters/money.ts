import type { Locale } from "@/lib/i18n/locales";

/**
 * Money formatting following the product style guide: "€1.200", "€259/mês".
 * (Native pt-PT Intl output is "1200,00 €", which the spec explicitly avoids.)
 */

interface NumberStyle {
  group: string;
  decimal: string;
}

const NUMBER_STYLES: Record<Locale, NumberStyle> = {
  "pt-PT": { group: ".", decimal: "," },
  "pt-BR": { group: ".", decimal: "," },
  en: { group: ",", decimal: "." },
};

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: "€", BRL: "R$ ", USD: "$", GBP: "£" };

export interface MoneyOptions {
  locale?: Locale;
  currency?: string;
  /** "auto" shows cents only when the value is not a whole amount. */
  decimals?: "auto" | 0 | 2;
}

function groupDigits(integer: string, separator: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

export function formatNumber(value: number, decimals = 0, locale: Locale = "pt-PT"): string {
  const style = NUMBER_STYLES[locale];
  const fixed = Math.abs(value).toFixed(decimals);
  const [integer = "0", fraction] = fixed.split(".");
  const body = groupDigits(integer, style.group) + (fraction ? style.decimal + fraction : "");
  return value < 0 ? `−${body}` : body;
}

/** Formats integer cents as money. */
export function formatMoney(cents: number, options: MoneyOptions = {}): string {
  const { locale = "pt-PT", currency = "EUR", decimals = "auto" } = options;
  const euros = cents / 100;
  const digits = decimals === "auto" ? (Math.round(cents) % 100 === 0 ? 0 : 2) : decimals;
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  const number = formatNumber(Math.abs(euros), digits, locale);
  return `${cents < 0 ? "−" : ""}${symbol}${number}`;
}

export function formatPercent(fraction: number, decimals = 1, locale: Locale = "pt-PT"): string {
  return `${formatNumber(fraction * 100, decimals, locale)}%`;
}

/** Compact money for charts: €12,4k */
export function formatMoneyCompact(cents: number, locale: Locale = "pt-PT"): string {
  const euros = cents / 100;
  if (Math.abs(euros) >= 1_000_000) return `€${formatNumber(euros / 1_000_000, 1, locale)}M`;
  if (Math.abs(euros) >= 10_000) return `€${formatNumber(euros / 1000, 0, locale)}k`;
  if (Math.abs(euros) >= 1000) return `€${formatNumber(euros / 1000, 1, locale)}k`;
  return formatMoney(cents, { locale, decimals: 0 });
}
