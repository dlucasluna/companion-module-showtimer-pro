import type { CommercialDefaults } from "./configuration";
import type { PricingRuleOverrides } from "./rules";

/**
 * Pure helpers turning stored PricingRule rows (database or artifact
 * documents) into engine rules and commercial defaults.
 */

export interface PricingRuleFields {
  targetMultiplier: number | null;
  riskReservePercent: number | null;
  maintenanceReservePercent: number | null;
  defaultResidualPercent: number | null;
  residualCreditPercent: number | null;
  vatRate: number | null;
  minMarginPercent: number | null;
  roundMonthlyTo: number | null;
  roundUpfrontTo: number | null;
  defaultContractMonths: number | null;
  defaultUpfrontPercent: number | null;
  pricesIncludeVat: boolean | null;
  allowedContractMonths: string | null;
}

export const FALLBACK_COMMERCIAL_DEFAULTS: CommercialDefaults = {
  contractMonths: 24,
  upfrontPercent: 0.3,
  pricesIncludeVat: false,
  allowedContractMonths: [12, 24, 36, 48],
};

export function ruleOverrides(rule: PricingRuleFields | null | undefined): PricingRuleOverrides {
  if (!rule) return {};
  return {
    targetMultiplier: rule.targetMultiplier,
    riskReservePercent: rule.riskReservePercent,
    maintenanceReservePercent: rule.maintenanceReservePercent,
    defaultResidualPercent: rule.defaultResidualPercent,
    residualCreditPercent: rule.residualCreditPercent,
    vatRate: rule.vatRate,
    minMarginPercent: rule.minMarginPercent,
    roundMonthlyTo: rule.roundMonthlyTo,
    roundUpfrontTo: rule.roundUpfrontTo,
  };
}

export function parseContractMonths(value: string | null | undefined): number[] | null {
  if (!value) return null;
  const months = value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  return months.length ? months : null;
}

/** Later rules override earlier ones (global first, then plan). */
export function commercialDefaults(...rules: (PricingRuleFields | null | undefined)[]): CommercialDefaults {
  const defaults = { ...FALLBACK_COMMERCIAL_DEFAULTS };
  for (const rule of rules) {
    if (!rule) continue;
    defaults.contractMonths = rule.defaultContractMonths ?? defaults.contractMonths;
    defaults.upfrontPercent = rule.defaultUpfrontPercent ?? defaults.upfrontPercent;
    defaults.pricesIncludeVat = rule.pricesIncludeVat ?? defaults.pricesIncludeVat;
    defaults.allowedContractMonths = parseContractMonths(rule.allowedContractMonths) ?? defaults.allowedContractMonths;
  }
  return defaults;
}
