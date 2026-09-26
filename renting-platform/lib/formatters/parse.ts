/**
 * Parses user-typed money ("1.200", "1200,50", "€ 259") into integer cents.
 * Returns null for empty/invalid input. Negative values are rejected.
 */
export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[€\s]/g, "").replace(/[^\d.,-]/g, "");
  if (!cleaned || cleaned.includes("-")) return null;

  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > -1 && lastComma > lastDot) {
    // pt style: 1.200,50
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > -1 && cleaned.length - lastDot - 1 === 3 && lastComma === -1) {
    // "1.200" → thousands separator
    normalized = cleaned.replace(/\./g, "");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
}

/** Parses "30", "30%", "30,5" into a fraction (0.305). */
export function parsePercentInput(raw: string): number | null {
  const value = Number.parseFloat(raw.replace("%", "").replace(",", ".").trim());
  return Number.isFinite(value) && value >= 0 ? value / 100 : null;
}
