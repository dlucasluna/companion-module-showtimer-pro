import type { ProductType } from "@prisma/client";
import { priceConfiguration, type PricingContext, type PricingResult, type ProposalConfig } from "@/lib/pricing";

/** Display data needed to snapshot proposal items (names, categories). */
export interface ItemDisplayInfo {
  productId: string;
  variantId: string | null;
  displayName: string;
  description: string | null;
  categoryName: string | null;
  productType: ProductType;
  sortOrder: number;
}

export type DisplayLookup = (productId: string, variantId: string | null) => ItemDisplayInfo | undefined;

export interface ProposalItemSnapshot {
  productId: string;
  variantId: string | null;
  quantity: number;
  internalUnitCost: number;
  internalTotal: number;
  displayName: string;
  description: string | null;
  categoryName: string | null;
  productType: ProductType;
  commercialMonthlyImpact: number;
  sortOrder: number;
}

export interface ProposalTotalsSnapshot {
  initialPayment: number;
  monthlyPayment: number;
  internalCost: number;
  targetRevenue: number;
  contractRevenue: number;
  grossProfit: number;
  grossMargin: number;
  markup: number;
  breakEvenMonth: number | null;
  residualValue: number;
  discountAmount: number;
}

export interface ProposalSnapshot {
  result: PricingResult;
  totals: ProposalTotalsSnapshot;
  items: ProposalItemSnapshot[];
}

/**
 * Server-side source of truth: re-prices a configuration with database costs
 * and produces the rows persisted on Proposal / ProposalItem. Client-provided
 * totals are never trusted.
 */
export function buildProposalSnapshot(config: ProposalConfig, context: PricingContext, lookup: DisplayLookup): ProposalSnapshot {
  const { result, lineImpacts } = priceConfiguration(config, context);

  const items = config.lines
    .filter((line) => line.quantity > 0)
    .map((line): ProposalItemSnapshot => {
      const info = lookup(line.productId, line.variantId);
      if (!info) throw new Error(`Missing display info for product ${line.productId}`);
      const key = line.variantId ? `${line.productId}:${line.variantId}` : line.productId;
      const unitCost = context.catalog[key]?.unitCost ?? 0;
      return {
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        internalUnitCost: unitCost,
        internalTotal: unitCost * line.quantity,
        displayName: info.displayName,
        description: info.description,
        categoryName: info.categoryName,
        productType: info.productType,
        commercialMonthlyImpact: Math.round(lineImpacts[line.productId] ?? 0),
        sortOrder: info.sortOrder,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    result,
    items,
    totals: {
      initialPayment: result.initialPayment,
      monthlyPayment: result.monthlyPayment,
      internalCost: result.totalInternalCost,
      targetRevenue: result.targetRevenue,
      contractRevenue: result.totalContractRevenue,
      grossProfit: result.grossProfit,
      grossMargin: result.grossMargin,
      markup: result.markup,
      breakEvenMonth: result.breakEvenMonth,
      residualValue: result.residualAssetValue,
      discountAmount: result.discountAmount,
    },
  };
}

export function variantDisplayName(productName: string, variantName: string | null | undefined): string {
  return variantName ? `${productName} ${variantName}` : productName;
}
