import { clamp, roundToStep, withVat, withoutVat } from "./rounding";
import type { Adjustment, Cents, MarginStatus, PricingParams, PricingResult, PricingWarningCode } from "./types";
import { PricingValidationError, formatIssues, pricingParamsSchema } from "./validation";

/**
 * Core financial engine. Pure and deterministic — no I/O, no React, no database.
 *
 * Revenue model (renting):
 *   hardCost        = equipment + installation + services
 *   reserves        = equipment × risk% + equipment × maintenance%/year × years
 *   systemListPrice = hardCost × multiplier + reserves − residualCredit
 *                     (or derived from a target margin during negotiation)
 *   systemPrice     = systemListPrice − discount
 *   initialPayment  = upfront share of systemPrice (rounded to the upfront step)
 *   monthlyPayment  = (systemPrice − initialPayment) / months + support price (rounded up)
 */
export function calculatePricing(params: PricingParams): PricingResult {
  assertValid(params);

  const months = params.contractMonths;
  const warnings: PricingWarningCode[] = [];

  // ---- Internal cost structure -------------------------------------------------
  const hardCost = params.equipmentCost + params.installationCost + params.servicesCost;
  const riskReserve = Math.round(params.equipmentCost * params.riskReservePercent);
  const maintenanceReserve = Math.round(params.equipmentCost * params.maintenanceReservePercent * (months / 12));
  const supportCostTotal = params.supportMonthlyCost * months;
  const totalInternalCost = hardCost + riskReserve + maintenanceReserve + supportCostTotal;
  const supportRevenue = params.supportMonthlyPrice * months;

  // ---- List price ----------------------------------------------------------------
  const residualCredit = Math.round(params.residualValue * params.residualCreditPercent);
  let systemListPrice: number;
  if (params.targetMargin != null) {
    warnings.push("TARGET_MARGIN_ACTIVE");
    const requiredRevenue = totalInternalCost / (1 - params.targetMargin);
    systemListPrice = Math.max(0, requiredRevenue - supportRevenue);
  } else {
    systemListPrice = Math.max(0, hardCost * params.targetMultiplier + riskReserve + maintenanceReserve - residualCredit);
  }
  systemListPrice = Math.round(systemListPrice);

  const discountAmount = resolveAdjustment(params.discount, systemListPrice);
  const systemPrice = systemListPrice - discountAmount;
  const targetRevenue = systemPrice + supportRevenue;

  // ---- Commercial split ------------------------------------------------------------
  const vat = params.vatRate;
  const requestedUpfront = resolveAdjustment(params.upfront, systemPrice, false);
  if (params.upfront.mode === "amount" && params.upfront.value > systemPrice) warnings.push("UPFRONT_CLAMPED");

  const upfrontExact = Math.min(requestedUpfront, systemPrice);
  const initialPayment = roundInitial(upfrontExact, systemPrice, params);
  // Linear (pre-rounding) monthly value: keeps per-line impacts additive.
  const monthlyPaymentExact = (systemPrice - upfrontExact) / months + params.supportMonthlyPrice;

  let monthlyPayment: Cents;
  if (params.monthlyOverride != null) {
    warnings.push("MONTHLY_OVERRIDE_ACTIVE");
    monthlyPayment = Math.round(params.monthlyOverride);
  } else {
    monthlyPayment = roundMonthly((systemPrice - initialPayment) / months + params.supportMonthlyPrice, params);
  }

  // ---- Profitability -----------------------------------------------------------------
  const totalContractRevenue = initialPayment + monthlyPayment * months;
  const grossProfit = totalContractRevenue - totalInternalCost;
  const grossMargin = totalContractRevenue > 0 ? grossProfit / totalContractRevenue : 0;
  const markup = totalInternalCost > 0 ? grossProfit / totalInternalCost : 0;

  const breakEvenMonth = computeBreakEven({
    upfrontOutlay: hardCost + riskReserve,
    monthlyOutflow: params.supportMonthlyCost + maintenanceReserve / months,
    initialPayment,
    monthlyPayment,
    months,
  });

  const marginStatus = resolveMarginStatus(grossProfit, grossMargin, params.minMarginPercent, totalContractRevenue);
  if (marginStatus === "loss") warnings.push("NEGATIVE_PROFIT");
  if (marginStatus === "below-minimum") warnings.push("MARGIN_BELOW_MINIMUM");
  if (breakEvenMonth === null && totalInternalCost > 0) warnings.push("BREAK_EVEN_BEYOND_TERM");

  return {
    contractMonths: months,
    equipmentCost: params.equipmentCost,
    installationCost: params.installationCost,
    servicesCost: params.servicesCost,
    hardCost,
    riskReserve,
    maintenanceReserve,
    supportCostTotal,
    totalInternalCost,
    systemListPrice,
    discountAmount,
    systemPrice,
    supportRevenue,
    targetRevenue,
    initialPayment,
    monthlyPayment,
    monthlyPaymentExact,
    initialPaymentGross: withVat(initialPayment, vat),
    monthlyPaymentGross: withVat(monthlyPayment, vat),
    vatRate: vat,
    totalContractRevenue,
    grossProfit,
    grossMargin,
    markup,
    breakEvenMonth,
    residualAssetValue: params.residualValue,
    economicProfit: grossProfit + params.residualValue,
    marginStatus,
    warnings,
  };
}

function assertValid(params: PricingParams): void {
  const parsed = pricingParamsSchema.safeParse(params);
  if (!parsed.success) throw new PricingValidationError(formatIssues(parsed.error));
}

/** Resolves a percent/amount adjustment against a base value (always within [0, base]). */
export function resolveAdjustment(adjustment: Adjustment, base: Cents, clampToBase = true): Cents {
  const raw = adjustment.mode === "percent" ? base * adjustment.value : adjustment.value;
  const value = Math.max(0, Math.round(raw));
  return clampToBase ? Math.min(value, base) : value;
}

/** Initial payment is rounded to the nearest commercial step, on net or VAT-inclusive values. */
function roundInitial(value: Cents, cap: Cents, params: PricingParams): Cents {
  if (value <= 0) return 0;
  if (value >= cap) return cap;
  const rounded = params.vatInclusiveRounding
    ? Math.round(withoutVat(roundToStep(value * (1 + params.vatRate), params.roundUpfrontTo), params.vatRate))
    : roundToStep(value, params.roundUpfrontTo);
  return clamp(rounded, 0, cap);
}

/** Monthly payment is rounded UP so rounding never erodes the margin. */
function roundMonthly(exact: number, params: PricingParams): Cents {
  if (exact <= 0) return 0;
  if (params.vatInclusiveRounding) {
    const gross = roundToStep(exact * (1 + params.vatRate), params.roundMonthlyTo, "up");
    return Math.round(withoutVat(gross, params.vatRate));
  }
  return roundToStep(exact, params.roundMonthlyTo, "up");
}

interface BreakEvenInput {
  upfrontOutlay: Cents;
  monthlyOutflow: number;
  initialPayment: Cents;
  monthlyPayment: Cents;
  months: number;
}

/**
 * Month in which cumulative cash-in (entrada + mensalidades) covers the cash-out
 * (equipment, installation, services and risk provision at month 0, plus monthly
 * support/maintenance). Returns 0 when the initial payment already covers it.
 */
export function computeBreakEven(input: BreakEvenInput): number | null {
  const deficit = input.upfrontOutlay - input.initialPayment;
  if (deficit <= 0) return 0;
  const netMonthly = input.monthlyPayment - input.monthlyOutflow;
  if (netMonthly <= 0) return null;
  const month = Math.ceil(deficit / netMonthly - 1e-9);
  return month <= input.months ? month : null;
}

function resolveMarginStatus(profit: number, margin: number, minMargin: number, revenue: number): MarginStatus {
  if (profit < 0) return "loss";
  if (revenue > 0 && margin < minMargin) return "below-minimum";
  return "healthy";
}
