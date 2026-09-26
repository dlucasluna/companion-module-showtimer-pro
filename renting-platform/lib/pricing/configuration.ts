import { quote, withLine, exactMonthly, type Quote, type QuoteInput, type QuoteLineInput } from "./quote";
import type { Adjustment, Cents, CostKind, PricingRules } from "./types";

/**
 * Bridge between a proposal configuration (what the seller builds) and the
 * pricing engine. Costs are looked up in a PricingCatalog loaded from the
 * database — never hardcoded.
 */

export type ProductTypeValue =
  | "HARDWARE"
  | "SERVICE"
  | "INSTALLATION"
  | "SUPPORT"
  | "SOFTWARE"
  | "LICENSE"
  | "CONSUMABLE";

export function costKindForType(type: ProductTypeValue): CostKind {
  switch (type) {
    case "HARDWARE":
    case "CONSUMABLE":
      return "equipment";
    case "INSTALLATION":
      return "installation";
    default:
      return "service";
  }
}

export interface ConfigLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface ProposalConfig {
  lines: ConfigLine[];
  contractMonths: number;
  upfront: Adjustment;
  discount: Adjustment;
  supportPlanId: string | null;
  monthlyOverride: Cents | null;
  targetMargin: number | null;
  pricesIncludeVat: boolean;
}

export interface PricingCatalogEntry {
  unitCost: Cents;
  costKind: CostKind;
  residualPercent: number | null;
  expectedLifeMonths: number | null;
}

/** Internal cost table keyed by `productId` or `productId:variantId`. */
export type PricingCatalog = Record<string, PricingCatalogEntry>;

export interface SupportPlanPricing {
  id: string;
  monthlyCost: Cents;
  monthlyPrice: Cents;
}

export interface PricingContext {
  catalog: PricingCatalog;
  supportPlans: SupportPlanPricing[];
  rules: PricingRules;
}

/** Commercial defaults for new proposals (from PricingRule). */
export interface CommercialDefaults {
  contractMonths: number;
  upfrontPercent: number;
  pricesIncludeVat: boolean;
  allowedContractMonths: number[];
}

export const catalogKey = (productId: string, variantId: string | null): string =>
  variantId ? `${productId}:${variantId}` : productId;

export class UnknownCatalogItemError extends Error {
  constructor(key: string) {
    super(`Catalog item not found or inactive: ${key}`);
    this.name = "UnknownCatalogItemError";
  }
}

function toQuoteLine(line: ConfigLine, catalog: PricingCatalog): QuoteLineInput {
  const key = catalogKey(line.productId, line.variantId);
  const entry = catalog[key];
  if (!entry) throw new UnknownCatalogItemError(key);
  return {
    key: line.productId,
    quantity: line.quantity,
    unitCost: entry.unitCost,
    costKind: entry.costKind,
    residualPercent: entry.residualPercent,
    expectedLifeMonths: entry.expectedLifeMonths,
  };
}

export function buildQuoteInput(config: ProposalConfig, context: PricingContext): QuoteInput {
  const support = context.supportPlans.find((plan) => plan.id === config.supportPlanId) ?? null;
  return {
    lines: config.lines.filter((line) => line.quantity > 0).map((line) => toQuoteLine(line, context.catalog)),
    contractMonths: config.contractMonths,
    upfront: config.upfront,
    discount: config.discount,
    support: support ? { monthlyCost: support.monthlyCost, monthlyPrice: support.monthlyPrice } : null,
    monthlyOverride: config.monthlyOverride,
    targetMargin: config.targetMargin,
    vatInclusiveRounding: config.pricesIncludeVat,
    rules: context.rules,
  };
}

/** Prices a configuration. Line impacts are keyed by productId. */
export function priceConfiguration(config: ProposalConfig, context: PricingContext): Quote {
  return quote(buildQuoteInput(config, context));
}

export interface VariantOption {
  variantId: string;
  /** Unrounded monthly impact of one unit of this variant (net cents). */
  perUnitMonthly: number;
  /** Monthly payment (net, rounded) if the configuration used this variant. */
  monthlyIfSelected: Cents;
  /** Difference vs the current configuration (net, unrounded). */
  deltaVsCurrent: number;
}

/**
 * Commercial comparison between variants of a product (e.g. PTZ Standard vs NDI).
 * Keeps the current quantity; if the product is not selected, compares one unit.
 */
export function compareVariants(
  config: ProposalConfig,
  context: PricingContext,
  productId: string,
  variantIds: string[],
): VariantOption[] {
  const base = buildQuoteInput(config, context);
  const current = config.lines.find((line) => line.productId === productId);
  const quantity = current && current.quantity > 0 ? current.quantity : 1;
  const baseExact = exactMonthly(base);

  return variantIds.map((variantId) => {
    const line = toQuoteLine({ productId, variantId, quantity }, context.catalog);
    const swapped = withLine(base, line);
    const swappedExact = exactMonthly(swapped);
    const withoutProduct = { ...base, lines: base.lines.filter((l) => l.key !== productId) };
    const perUnitMonthly = (swappedExact - exactMonthly(withoutProduct)) / quantity;
    return {
      variantId,
      perUnitMonthly,
      monthlyIfSelected: quote(swapped).result.monthlyPayment,
      deltaVsCurrent: swappedExact - baseExact,
    };
  });
}

/** Monthly impact of adding one unit of an item that is not yet in the configuration. */
export function addOneUnitImpact(config: ProposalConfig, context: PricingContext, line: ConfigLine): number {
  const base = buildQuoteInput(config, context);
  const existing = config.lines.find((l) => l.productId === line.productId);
  const nextLine = toQuoteLine(
    { ...line, quantity: (existing?.quantity ?? 0) + 1, variantId: existing?.variantId ?? line.variantId },
    context.catalog,
  );
  return exactMonthly(withLine(base, nextLine)) - exactMonthly(base);
}
