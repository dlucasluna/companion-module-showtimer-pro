"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { Locale } from "@/lib/i18n/locales";
import { getMessages, type Messages } from "@/lib/i18n/messages";
import {
  addOneUnitImpact,
  priceConfiguration,
  type CommercialDefaults,
  type PricingCatalog,
  type PricingContext,
  type PricingRules,
  type Quote,
  type SupportPlanPricing,
} from "@/lib/pricing";
import { createConfiguratorStore, type ConfiguratorInit, type ConfiguratorState, type ConfiguratorStore } from "@/store/configurator-store";
import type { CatalogProductDTO, CatalogVariantDTO, ConfiguratorCatalog } from "@/types/catalog";

/** Internal pricing inputs. Only sent to users allowed to see internal data. */
export interface ConfiguratorPricing {
  catalog: PricingCatalog;
  supportPlans: SupportPlanPricing[];
  /** Rules per plan id ("global" = company defaults). */
  rulesByPlan: Record<string, PricingRules>;
  defaults: CommercialDefaults;
}

export interface ConfiguratorStatic {
  catalog: ConfiguratorCatalog;
  pricing: ConfiguratorPricing;
  locale: Locale;
  companyName: string;
}

interface ContextValue extends ConfiguratorStatic {
  store: ConfiguratorStore;
  messages: Messages;
  productsById: Map<string, CatalogProductDTO>;
}

const ConfiguratorContext = createContext<ContextValue | null>(null);
const QuoteContext = createContext<Quote | null>(null);

/** Prices the configuration once per change and shares the result with every consumer. */
function QuoteProvider({ children }: { children: ReactNode }) {
  const config = useConfigurator((s) => s.config);
  const context = usePricingContext();
  const quote = useMemo(() => priceConfiguration(config, context), [config, context]);
  return <QuoteContext.Provider value={quote}>{children}</QuoteContext.Provider>;
}

export function ConfiguratorProvider({ init, children, ...data }: ConfiguratorStatic & { init: ConfiguratorInit; children: ReactNode }) {
  const [store] = useState(() => createConfiguratorStore(init));
  const value = useMemo<ContextValue>(
    () => ({
      ...data,
      store,
      messages: getMessages(data.locale),
      productsById: new Map(data.catalog.products.map((p) => [p.id, p])),
    }),
    // Static data never changes during a session on this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store],
  );
  return (
    <ConfiguratorContext.Provider value={value}>
      <QuoteProvider>{children}</QuoteProvider>
    </ConfiguratorContext.Provider>
  );
}

function useContextValue(): ContextValue {
  const value = useContext(ConfiguratorContext);
  if (!value) throw new Error("Configurator components must be used inside ConfiguratorProvider");
  return value;
}

export function useConfigurator<T>(selector: (state: ConfiguratorState) => T): T {
  return useStore(useContextValue().store, selector);
}

export function useConfiguratorStore(): ConfiguratorStore {
  return useContextValue().store;
}

export function useConfiguratorData() {
  const { catalog, locale, companyName, messages, productsById, pricing } = useContextValue();
  return { catalog, locale, companyName, messages, productsById, defaults: pricing.defaults };
}

/** Pricing context for the current plan (rules can be overridden per plan). */
export function usePricingContext(): PricingContext {
  const { pricing } = useContextValue();
  const planId = useConfigurator((s) => s.planId);
  return useMemo(
    () => ({
      catalog: pricing.catalog,
      supportPlans: pricing.supportPlans,
      rules: (planId && pricing.rulesByPlan[planId]) || pricing.rulesByPlan.global!,
    }),
    [pricing, planId],
  );
}

/** Live quote for the current configuration — recomputed instantly on every change. */
export function useQuote(): Quote {
  const quote = useContext(QuoteContext);
  if (!quote) throw new Error("useQuote must be used inside ConfiguratorProvider");
  return quote;
}

/** "+€X/mês" for adding one more unit of a product (commercial value, safe to show). */
export function useAddImpact(product: CatalogProductDTO, variant: CatalogVariantDTO | null): number {
  const config = useConfigurator((s) => s.config);
  const context = usePricingContext();
  return useMemo(
    () => addOneUnitImpact(config, context, { productId: product.id, variantId: variant?.id ?? null, quantity: 1 }),
    [config, context, product.id, variant?.id],
  );
}

/** Internal unit cost — only call from components wrapped in <InternalOnly>. */
export function useInternalUnitCost(productId: string, variantId: string | null): number | null {
  const { pricing } = useContextValue();
  const key = variantId ? `${productId}:${variantId}` : productId;
  return pricing.catalog[key]?.unitCost ?? null;
}

export function defaultVariant(product: CatalogProductDTO): CatalogVariantDTO | null {
  return product.variants.find((v) => v.isDefault) ?? product.variants[0] ?? null;
}
