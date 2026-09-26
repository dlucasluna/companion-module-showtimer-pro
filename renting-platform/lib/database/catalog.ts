import "server-only";
import type { Prisma } from "@prisma/client";
import type { ConfiguratorCatalog, PlanDTO, SupportPlanDTO } from "@/types/catalog";
import { prisma } from "./prisma";

function toStringRecord(value: Prisma.JsonValue | null): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, String(v)]));
}

function toStringArray(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export async function loadSupportPlans(companyId: string): Promise<SupportPlanDTO[]> {
  const plans = await prisma.supportPlan.findMany({ where: { companyId, active: true }, orderBy: { sortOrder: "asc" } });
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    features: toStringArray(plan.features),
    monthlyPrice: plan.monthlyPrice,
    responseTimeHours: plan.responseTimeHours,
    onSite: plan.onSite,
    isDefault: plan.isDefault,
  }));
}

export async function loadPlans(companyId: string): Promise<PlanDTO[]> {
  const plans = await prisma.plan.findMany({
    where: { companyId, active: true },
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    kind: plan.kind,
    tagline: plan.tagline,
    description: plan.description,
    highlight: plan.highlight,
    supportPlanId: plan.supportPlanId,
    contractMonths: plan.contractMonths,
    upfrontPercent: plan.upfrontPercent,
    items: plan.items.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })),
  }));
}

/** Everything the configurator shows. Contains no internal costs. */
export async function loadConfiguratorCatalog(companyId: string): Promise<ConfiguratorCatalog> {
  const [categories, products, supportPlans, plans, paymentConditions] = await Promise.all([
    prisma.productCategory.findMany({ where: { companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: { companyId, active: true },
      include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: { sortOrder: "asc" },
    }),
    loadSupportPlans(companyId),
    loadPlans(companyId),
    prisma.paymentCondition.findMany({ where: { companyId, active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, icon: c.icon, description: c.description })),
    products: products.map((p) => ({
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
      variants: p.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        description: v.description,
        benefit: v.benefit,
        isDefault: v.isDefault,
        attributes: toStringRecord(v.attributes),
      })),
    })),
    supportPlans,
    plans,
    paymentConditions: paymentConditions.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      contractMonths: c.contractMonths,
      upfrontPercent: c.upfrontPercent,
      discountPercent: c.discountPercent,
    })),
  };
}
