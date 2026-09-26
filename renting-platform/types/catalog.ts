import type { ProductTypeValue } from "@/lib/pricing";

/**
 * Display DTOs for the configurator. They intentionally carry NO internal
 * cost fields — costs live only in the PricingContext, which is rendered by
 * internal components exclusively.
 */

export interface CatalogCategoryDTO {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
}

export interface CatalogVariantDTO {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  benefit: string | null;
  isDefault: boolean;
  attributes: Record<string, string> | null;
}

export interface CatalogProductDTO {
  id: string;
  name: string;
  slug: string;
  sku: string;
  type: ProductTypeValue;
  categoryId: string;
  brand: string | null;
  description: string | null;
  salesDescription: string | null;
  benefit: string | null;
  imageUrl: string | null;
  maxQuantity: number | null;
  defaultQuantity: number;
  unitLabel: string | null;
  variants: CatalogVariantDTO[];
}

export interface SupportPlanDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  features: string[];
  /** Commercial price (safe to show). */
  monthlyPrice: number;
  responseTimeHours: number | null;
  onSite: boolean;
  isDefault: boolean;
}

export interface PlanItemDTO {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface PlanDTO {
  id: string;
  name: string;
  slug: string;
  kind: "PRESET" | "TEMPLATE";
  tagline: string | null;
  description: string | null;
  highlight: string | null;
  supportPlanId: string | null;
  contractMonths: number | null;
  upfrontPercent: number | null;
  items: PlanItemDTO[];
}

export interface PaymentConditionDTO {
  id: string;
  name: string;
  description: string | null;
  contractMonths: number;
  upfrontPercent: number;
  discountPercent: number;
}

export interface ConfiguratorCatalog {
  categories: CatalogCategoryDTO[];
  products: CatalogProductDTO[];
  supportPlans: SupportPlanDTO[];
  plans: PlanDTO[];
  paymentConditions: PaymentConditionDTO[];
}
