import { calculatePricing } from "./engine";
import { clamp } from "./rounding";
import type { Adjustment, Cents, CostKind, PricingParams, PricingResult, PricingRules } from "./types";
import { PricingValidationError } from "./validation";

/** A priced line, already resolved against the catalog (costs come from the database). */
export interface QuoteLineInput {
  key: string;
  quantity: number;
  unitCost: Cents;
  costKind: CostKind;
  /** Minimum residual value fraction; null falls back to the rules default. */
  residualPercent: number | null;
  /** Expected useful life; drives linear depreciation of the residual value. */
  expectedLifeMonths: number | null;
}

export interface SupportPricing {
  monthlyCost: Cents;
  monthlyPrice: Cents;
}

export interface QuoteInput {
  lines: QuoteLineInput[];
  contractMonths: number;
  upfront: Adjustment;
  discount: Adjustment;
  support: SupportPricing | null;
  monthlyOverride: Cents | null;
  targetMargin: number | null;
  vatInclusiveRounding: boolean;
  rules: PricingRules;
}

export interface Quote {
  result: PricingResult;
  /** Marginal monthly impact (net, unrounded cents) of each line, keyed by line key. */
  lineImpacts: Record<string, number>;
}

/** Residual value of one equipment line at the end of the contract. */
export function residualValueForLine(line: QuoteLineInput, contractMonths: number, rules: PricingRules): Cents {
  if (line.costKind !== "equipment" || line.quantity <= 0) return 0;
  const floor = clamp(line.residualPercent ?? rules.defaultResidualPercent, 0, 1);
  const depreciated = line.expectedLifeMonths ? 1 - contractMonths / line.expectedLifeMonths : floor;
  return Math.round(line.unitCost * line.quantity * clamp(Math.max(floor, depreciated), 0, 1));
}

export function buildPricingParams(input: QuoteInput): PricingParams {
  const totals: Record<CostKind, Cents> = { equipment: 0, installation: 0, service: 0 };
  let residualValue = 0;

  for (const line of input.lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 0) {
      throw new PricingValidationError([`line ${line.key}: quantity must be a non-negative integer`]);
    }
    if (line.unitCost < 0) throw new PricingValidationError([`line ${line.key}: unit cost must be >= 0`]);
    totals[line.costKind] += line.unitCost * line.quantity;
    residualValue += residualValueForLine(line, input.contractMonths, input.rules);
  }

  const { rules } = input;
  return {
    equipmentCost: totals.equipment,
    installationCost: totals.installation,
    servicesCost: totals.service,
    contractMonths: input.contractMonths,
    upfront: input.upfront,
    targetMultiplier: rules.targetMultiplier,
    supportMonthlyCost: input.support?.monthlyCost ?? 0,
    supportMonthlyPrice: input.support?.monthlyPrice ?? 0,
    riskReservePercent: rules.riskReservePercent,
    maintenanceReservePercent: rules.maintenanceReservePercent,
    residualValue,
    residualCreditPercent: rules.residualCreditPercent,
    discount: input.discount,
    vatRate: rules.vatRate,
    vatInclusiveRounding: input.vatInclusiveRounding,
    monthlyOverride: input.monthlyOverride,
    targetMargin: input.targetMargin,
    minMarginPercent: rules.minMarginPercent,
    roundMonthlyTo: rules.roundMonthlyTo,
    roundUpfrontTo: rules.roundUpfrontTo,
  };
}

/** Prices a full configuration and the marginal monthly impact of each line. */
export function quote(input: QuoteInput): Quote {
  const result = calculatePricing(buildPricingParams(input));
  const lineImpacts: Record<string, number> = {};
  for (const line of input.lines) {
    const without = { ...input, lines: input.lines.filter((l) => l.key !== line.key) };
    lineImpacts[line.key] = result.monthlyPaymentExact - exactMonthly(without);
  }
  return { result, lineImpacts };
}

/** Unrounded monthly payment (no override) — the basis for "+€X/mês" comparisons. */
export function exactMonthly(input: QuoteInput): number {
  return calculatePricing(buildPricingParams({ ...input, monthlyOverride: null })).monthlyPaymentExact;
}

/**
 * Monthly impact of replacing/adding a line. Used for the camera comparison
 * ("PTZ NDI: +€25/mês") without exposing any internal cost to the client.
 */
export function monthlyDelta(base: QuoteInput, variant: QuoteInput): number {
  return exactMonthly(variant) - exactMonthly(base);
}

/** Replaces (or inserts) a line by key and returns a new input. */
export function withLine(input: QuoteInput, line: QuoteLineInput): QuoteInput {
  const exists = input.lines.some((l) => l.key === line.key);
  const lines = exists ? input.lines.map((l) => (l.key === line.key ? line : l)) : [...input.lines, line];
  return { ...input, lines };
}
