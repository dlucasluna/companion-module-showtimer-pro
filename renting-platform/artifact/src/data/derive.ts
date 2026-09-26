import type { ConfiguratorPricing } from "@/components/configurator/configurator-context";
import {
  catalogKey,
  costKindForType,
  resolvePricingRules,
  type CommercialDefaults,
  type PricingCatalog,
  type PricingContext,
  type PricingRules,
} from "@/lib/pricing";
import { commercialDefaults, ruleOverrides } from "@/lib/pricing/rule-records";
import { variantDisplayName, type DisplayLookup, type ItemDisplayInfo } from "@/lib/proposals/snapshot";
import type { ConfiguratorCatalog, PlanDTO, SupportPlanDTO } from "@/types/catalog";
import type { DemoState, PricingRuleRec } from "./types";

/** Browser equivalents of the server loaders in lib/database/*. */

const byOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

export function globalRule(state: DemoState): PricingRuleRec | undefined {
  return Object.values(state.pricingRules).find((r) => r.scope === "GLOBAL");
}

export function planRule(state: DemoState, planId: string | null | undefined): PricingRuleRec | undefined {
  return planId ? Object.values(state.pricingRules).find((r) => r.scope === "PLAN" && r.planId === planId) : undefined;
}

export function rulesFor(state: DemoState, planId?: string | null): { rules: PricingRules; defaults: CommercialDefaults } {
  const global = globalRule(state);
  const plan = planRule(state, planId);
  return {
    rules: resolvePricingRules(ruleOverrides(global), ruleOverrides(plan)),
    defaults: commercialDefaults(global, plan),
  };
}

export function pricingCatalog(state: DemoState): PricingCatalog {
  const catalog: PricingCatalog = {};
  for (const product of Object.values(state.products)) {
    if (!product.active) continue;
    const costKind = costKindForType(product.type);
    catalog[catalogKey(product.id, null)] = {
      unitCost: product.internalCost,
      costKind,
      residualPercent: product.defaultResidualPercent,
      expectedLifeMonths: product.expectedLifeMonths,
    };
    for (const variant of product.variants) {
      if (!variant.active) continue;
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

function supportPricing(state: DemoState) {
  return Object.values(state.supportPlans)
    .filter((p) => p.active)
    .map((p) => ({ id: p.id, monthlyCost: p.monthlyCost, monthlyPrice: p.monthlyPrice }));
}

export function pricingContext(state: DemoState, planId?: string | null): PricingContext & { defaults: CommercialDefaults } {
  const { rules, defaults } = rulesFor(state, planId);
  return { rules, defaults, catalog: pricingCatalog(state), supportPlans: supportPricing(state) };
}

export function configuratorPricing(state: DemoState): ConfiguratorPricing {
  const global = globalRule(state);
  const rulesByPlan: Record<string, PricingRules> = { global: resolvePricingRules(ruleOverrides(global)) };
  for (const rule of Object.values(state.pricingRules)) {
    if (rule.scope === "PLAN" && rule.planId) rulesByPlan[rule.planId] = resolvePricingRules(ruleOverrides(global), ruleOverrides(rule));
  }
  return { catalog: pricingCatalog(state), supportPlans: supportPricing(state), rulesByPlan, defaults: commercialDefaults(global) };
}

export function supportPlanDTOs(state: DemoState): SupportPlanDTO[] {
  return Object.values(state.supportPlans)
    .filter((p) => p.active)
    .sort(byOrder)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      features: p.features,
      monthlyPrice: p.monthlyPrice,
      responseTimeHours: p.responseTimeHours,
      onSite: p.onSite,
      isDefault: p.isDefault,
    }));
}

export function planDTOs(state: DemoState): PlanDTO[] {
  return Object.values(state.plans)
    .filter((p) => p.active)
    .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt) : a.kind === "PRESET" ? -1 : 1))
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      kind: p.kind,
      tagline: p.tagline,
      description: p.description,
      highlight: p.highlight,
      supportPlanId: p.supportPlanId,
      contractMonths: p.contractMonths,
      upfrontPercent: p.upfrontPercent,
      items: p.items.map((i) => ({ ...i })),
    }));
}

/** What the configurator shows — no internal costs. */
export function configuratorCatalog(state: DemoState): ConfiguratorCatalog {
  return {
    categories: Object.values(state.categories)
      .sort(byOrder)
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon, description: c.description })),
    products: Object.values(state.products)
      .filter((p) => p.active)
      .sort(byOrder)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        type: p.type,
        categoryId: p.categoryId,
        brand: p.brand,
        description: p.description,
        salesDescription: p.salesDescription,
        benefit: p.benefit,
        imageUrl: p.imageUrl,
        maxQuantity: p.maxQuantity,
        defaultQuantity: p.defaultQuantity,
        unitLabel: p.unitLabel,
        variants: p.variants
          .filter((v) => v.active)
          .sort(byOrder)
          .map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            description: v.description,
            benefit: v.benefit,
            isDefault: v.isDefault,
            attributes: v.attributes,
          })),
      })),
    supportPlans: supportPlanDTOs(state),
    plans: planDTOs(state),
    paymentConditions: Object.values(state.paymentConditions)
      .filter((c) => c.active)
      .sort(byOrder)
      .map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        contractMonths: c.contractMonths,
        upfrontPercent: c.upfrontPercent,
        discountPercent: c.discountPercent,
      })),
  };
}

export function displayLookup(state: DemoState): DisplayLookup {
  const map = new Map<string, ItemDisplayInfo>();
  for (const product of Object.values(state.products)) {
    const category = state.categories[product.categoryId];
    const base: ItemDisplayInfo = {
      productId: product.id,
      variantId: null,
      displayName: product.name,
      description: product.description,
      categoryName: category?.name ?? null,
      productType: product.type,
      sortOrder: (category?.sortOrder ?? 99) * 1000 + product.sortOrder,
    };
    map.set(product.id, base);
    for (const variant of product.variants) {
      map.set(`${product.id}:${variant.id}`, {
        ...base,
        variantId: variant.id,
        displayName: variantDisplayName(product.name, variant.name),
        description: variant.description ?? product.description,
      });
    }
  }
  return (productId, variantId) => map.get(variantId ? `${productId}:${variantId}` : productId);
}
