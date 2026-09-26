import type { PricingRule, Prisma } from "@prisma/client";
import {
  catalogKey,
  costKindForType,
  resolvePricingRules,
  type CommercialDefaults,
  type PricingCatalog,
  type PricingContext,
  type PricingRuleOverrides,
  type PricingRules,
} from "@/lib/pricing";
import { prisma } from "./prisma";

type Db = Prisma.TransactionClient | typeof prisma;

const FALLBACK_DEFAULTS: CommercialDefaults = {
  contractMonths: 24,
  upfrontPercent: 0.3,
  pricesIncludeVat: false,
  allowedContractMonths: [12, 24, 36, 48],
};

function toOverrides(rule: PricingRule | null | undefined): PricingRuleOverrides {
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

function parseMonths(value: string | null | undefined): number[] | null {
  if (!value) return null;
  const months = value
    .split(",")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  return months.length ? months : null;
}

function toDefaults(...rules: (PricingRule | null | undefined)[]): CommercialDefaults {
  const defaults = { ...FALLBACK_DEFAULTS };
  for (const rule of rules) {
    if (!rule) continue;
    defaults.contractMonths = rule.defaultContractMonths ?? defaults.contractMonths;
    defaults.upfrontPercent = rule.defaultUpfrontPercent ?? defaults.upfrontPercent;
    defaults.pricesIncludeVat = rule.pricesIncludeVat ?? defaults.pricesIncludeVat;
    defaults.allowedContractMonths = parseMonths(rule.allowedContractMonths) ?? defaults.allowedContractMonths;
  }
  return defaults;
}

export interface ResolvedPricingRules {
  rules: PricingRules;
  defaults: CommercialDefaults;
}

/** Global pricing rules merged with the plan-level override (if any). */
export async function loadPricingRules(companyId: string, planId?: string | null, db: Db = prisma): Promise<ResolvedPricingRules> {
  const [global, planRule] = await Promise.all([
    db.pricingRule.findFirst({ where: { companyId, scope: "GLOBAL" } }),
    planId ? db.pricingRule.findUnique({ where: { planId } }) : Promise.resolve(null),
  ]);
  return {
    rules: resolvePricingRules(toOverrides(global), toOverrides(planRule)),
    defaults: toDefaults(global, planRule),
  };
}

/** Internal cost table for every active product/variant of a company. */
export async function loadPricingCatalog(companyId: string, db: Db = prisma): Promise<PricingCatalog> {
  const products = await db.product.findMany({
    where: { companyId, active: true },
    include: { variants: { where: { active: true } } },
  });

  const catalog: PricingCatalog = {};
  for (const product of products) {
    const costKind = costKindForType(product.type);
    catalog[catalogKey(product.id, null)] = {
      unitCost: product.internalCost,
      costKind,
      residualPercent: product.defaultResidualPercent,
      expectedLifeMonths: product.expectedLifeMonths,
    };
    for (const variant of product.variants) {
      catalog[catalogKey(product.id, variant.id)] = {
        unitCost: variant.internalCost,
        costKind,
        residualPercent: variant.residualPercent ?? product.defaultResidualPercent,
        expectedLifeMonths: variant.expectedLifeMonths ?? product.expectedLifeMonths,
      };
    }
  }
  return catalog;
}

export async function loadPricingContext(
  companyId: string,
  planId?: string | null,
  db: Db = prisma,
): Promise<PricingContext & { defaults: CommercialDefaults }> {
  const [{ rules, defaults }, catalog, supportPlans] = await Promise.all([
    loadPricingRules(companyId, planId, db),
    loadPricingCatalog(companyId, db),
    db.supportPlan.findMany({ where: { companyId, active: true }, select: { id: true, monthlyCost: true, monthlyPrice: true } }),
  ]);
  return { rules, defaults, catalog, supportPlans };
}

/** Everything the live configurator needs to price in the browser (internal users only). */
export async function loadConfiguratorPricing(companyId: string) {
  const [globalRule, planRules, catalog, supportPlans] = await Promise.all([
    prisma.pricingRule.findFirst({ where: { companyId, scope: "GLOBAL" } }),
    prisma.pricingRule.findMany({ where: { companyId, scope: "PLAN", planId: { not: null } } }),
    loadPricingCatalog(companyId),
    prisma.supportPlan.findMany({ where: { companyId, active: true }, select: { id: true, monthlyCost: true, monthlyPrice: true } }),
  ]);
  const rulesByPlan: Record<string, PricingRules> = { global: resolvePricingRules(toOverrides(globalRule)) };
  for (const rule of planRules) {
    if (rule.planId) rulesByPlan[rule.planId] = resolvePricingRules(toOverrides(globalRule), toOverrides(rule));
  }
  return { catalog, supportPlans, rulesByPlan, defaults: toDefaults(globalRule) };
}
