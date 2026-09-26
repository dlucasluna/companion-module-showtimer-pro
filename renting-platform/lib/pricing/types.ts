/**
 * Pricing engine types.
 *
 * All money values are integer cents (EUR) to avoid floating point drift.
 * All percentages are fractions (0.3 === 30%).
 */

export type Cents = number;

/** A percentage of a base value or a fixed amount in cents. */
export type Adjustment =
  | { mode: "percent"; value: number }
  | { mode: "amount"; value: Cents };

/** How a line contributes to the internal cost structure. */
export type CostKind = "equipment" | "installation" | "service";

/** Global/plan level pricing rules, stored in the database (PricingRule). */
export interface PricingRules {
  /** Revenue multiplier applied on the hard project cost (1.8 → cost €4.000 = revenue €7.200). */
  targetMultiplier: number;
  /** Provision for damage/replacement risk, fraction of equipment cost. */
  riskReservePercent: number;
  /** Provision for maintenance, fraction of equipment cost per contract year. */
  maintenanceReservePercent: number;
  /** Fallback minimum residual value of equipment at contract end (fraction of cost). */
  defaultResidualPercent: number;
  /** Share of the residual value credited back into the price (0 = company keeps it all). */
  residualCreditPercent: number;
  /** VAT rate (0.23 in Portugal). */
  vatRate: number;
  /** Minimum recommended gross margin — below it the seller sees an internal warning. */
  minMarginPercent: number;
  /** Monthly payment is rounded UP to this step (cents). 100 = whole euros. */
  roundMonthlyTo: Cents;
  /** Initial payment is rounded to the nearest step (cents). 1000 = €10. */
  roundUpfrontTo: Cents;
}

/**
 * Core engine input (aggregated values). Mirrors the product spec:
 * equipmentCost, installationCost, servicesCost, contractMonths, upfrontPayment,
 * targetMultiplier, supportCost, riskReserve, residualValue, discount, VAT.
 */
export interface PricingParams {
  equipmentCost: Cents;
  installationCost: Cents;
  servicesCost: Cents;
  contractMonths: number;
  /** Initial payment (entrada): percent of the system price or fixed amount. */
  upfront: Adjustment;
  targetMultiplier: number;
  /** Internal monthly cost of the support plan. */
  supportMonthlyCost: Cents;
  /** Commercial monthly price of the support plan. */
  supportMonthlyPrice: Cents;
  riskReservePercent: number;
  maintenanceReservePercent: number;
  /** Estimated value of the equipment when the contract ends. */
  residualValue: Cents;
  residualCreditPercent: number;
  discount: Adjustment;
  vatRate: number;
  /** When true the rounding steps apply to VAT-inclusive values. */
  vatInclusiveRounding: boolean;
  /** Negotiation: seller forces a monthly payment (net of VAT). */
  monthlyOverride?: Cents | null;
  /** Negotiation: list price is derived from a target margin instead of the multiplier. */
  targetMargin?: number | null;
  minMarginPercent: number;
  roundMonthlyTo: Cents;
  roundUpfrontTo: Cents;
}

export type MarginStatus = "healthy" | "below-minimum" | "loss";

export type PricingWarningCode =
  | "MARGIN_BELOW_MINIMUM"
  | "NEGATIVE_PROFIT"
  | "BREAK_EVEN_BEYOND_TERM"
  | "UPFRONT_CLAMPED"
  | "MONTHLY_OVERRIDE_ACTIVE"
  | "TARGET_MARGIN_ACTIVE";

export interface PricingResult {
  contractMonths: number;

  // Internal cost structure
  equipmentCost: Cents;
  installationCost: Cents;
  servicesCost: Cents;
  /** equipment + installation + services — the "system cost". */
  hardCost: Cents;
  riskReserve: Cents;
  maintenanceReserve: Cents;
  supportCostTotal: Cents;
  totalInternalCost: Cents;

  // Revenue construction
  /** List price of the system (before discount, excluding support). */
  systemListPrice: Cents;
  discountAmount: Cents;
  /** System price after discount (excluding support). */
  systemPrice: Cents;
  supportRevenue: Cents;
  /** Expected contract revenue before rounding (system price + support). */
  targetRevenue: Cents;

  // Commercial outputs (net of VAT)
  initialPayment: Cents;
  monthlyPayment: Cents;
  /** Unrounded monthly value without override — used for marginal impact calculations. */
  monthlyPaymentExact: number;
  // Commercial outputs (VAT inclusive)
  initialPaymentGross: Cents;
  monthlyPaymentGross: Cents;
  vatRate: number;

  // Profitability (internal only)
  totalContractRevenue: Cents;
  grossProfit: Cents;
  grossMargin: number;
  markup: number;
  /** First month where cumulative cash-in covers cash-out; null if not within the term. */
  breakEvenMonth: number | null;
  residualAssetValue: Cents;
  /** Gross profit plus the residual value the company keeps. */
  economicProfit: Cents;

  marginStatus: MarginStatus;
  warnings: PricingWarningCode[];
}
