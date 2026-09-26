import type { PricingRules } from "./types";

/**
 * Safe fallbacks used only when the database has no global PricingRule yet.
 * The real values live in the database and are edited in Configurações → Pricing.
 */
export const DEFAULT_PRICING_RULES: PricingRules = {
  targetMultiplier: 1.8,
  riskReservePercent: 0.02,
  maintenanceReservePercent: 0.015,
  defaultResidualPercent: 0.15,
  residualCreditPercent: 0,
  vatRate: 0.23,
  minMarginPercent: 0.35,
  roundMonthlyTo: 100,
  roundUpfrontTo: 1000,
};

export type PricingRuleOverrides = { [K in keyof PricingRules]?: PricingRules[K] | null };

/** Merges global rules with plan-level overrides (null/undefined = inherit). */
export function resolvePricingRules(global: PricingRuleOverrides, ...overrides: PricingRuleOverrides[]): PricingRules {
  const merged: PricingRules = { ...DEFAULT_PRICING_RULES };
  for (const layer of [global, ...overrides]) {
    for (const key of Object.keys(merged) as (keyof PricingRules)[]) {
      const value = layer[key];
      if (value !== null && value !== undefined) merged[key] = value;
    }
  }
  return merged;
}
