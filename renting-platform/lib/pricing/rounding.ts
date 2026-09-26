import type { Cents } from "./types";

export type RoundingMode = "nearest" | "up" | "down";

const EPSILON = 1e-9;

/** Rounds a cents value to a commercial step (e.g. 100 = whole euros). */
export function roundToStep(value: number, step: Cents, mode: RoundingMode = "nearest"): Cents {
  if (!Number.isFinite(value)) return 0;
  if (step <= 1) {
    return mode === "up" ? Math.ceil(value - EPSILON) : mode === "down" ? Math.floor(value + EPSILON) : Math.round(value);
  }
  const quotient = value / step;
  const rounded =
    mode === "up"
      ? Math.ceil(quotient - EPSILON)
      : mode === "down"
        ? Math.floor(quotient + EPSILON)
        : Math.round(quotient);
  return rounded * step;
}

export function toCents(value: number): Cents {
  return Math.round(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Applies VAT to a net amount. */
export function withVat(net: Cents, vatRate: number): Cents {
  return Math.round(net * (1 + vatRate));
}

/** Removes VAT from a gross amount. */
export function withoutVat(gross: number, vatRate: number): number {
  return gross / (1 + vatRate);
}
