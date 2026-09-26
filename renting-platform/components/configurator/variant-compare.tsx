"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";
import { compareVariants } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { selectLine } from "@/store/configurator-store";
import type { CatalogProductDTO } from "@/types/catalog";
import { defaultVariant, useConfigurator, useConfiguratorData, usePricingContext, useQuote } from "./configurator-context";
import { useImpactFormatter, useMoney } from "./use-display";

/**
 * Side-by-side commercial comparison of a product's variants.
 * Shows only the monthly impact — never the internal cost difference.
 */
export function VariantCompare({ product, onClose }: { product: CatalogProductDTO; onClose: () => void }) {
  const { messages } = useConfiguratorData();
  const t = messages.configurator;
  const config = useConfigurator((s) => s.config);
  const line = useConfigurator((s) => selectLine(s, product.id));
  const setVariant = useConfigurator((s) => s.setVariant);
  const context = usePricingContext();
  const { result } = useQuote();
  const formatImpact = useImpactFormatter();
  const money = useMoney();
  const vatIncluded = config.pricesIncludeVat;

  const current = line?.variantId ?? defaultVariant(product)?.id ?? null;
  const quantity = line?.quantity ?? 1;
  const options = useMemo(
    () => compareVariants(config, context, product.id, product.variants.map((v) => v.id)),
    [config, context, product.id, product.variants],
  );
  const currentOption = options.find((o) => o.variantId === current);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="edge surface mt-4 rounded-panel p-4 sm:p-6" role="region" aria-label={`${t.compare}: ${product.name}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{t.compare}</p>
            <h3 className="mt-1 text-h3 text-fg">{product.name}</h3>
            <p className="mt-1 text-small text-fg-2">
              {quantity > 1 ? `Comparação para ${quantity} unidades.` : "Comparação por unidade."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-fg-2 transition hover:bg-white/10 hover:text-fg"
            aria-label="Fechar comparação"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className={cn("grid gap-3", product.variants.length === 2 ? "@xl:grid-cols-2" : "@3xl:grid-cols-3")}>
          {product.variants.map((variant) => {
            const option = options.find((o) => o.variantId === variant.id);
            const active = variant.id === current;
            const delta = option && currentOption ? option.deltaVsCurrent : 0;
            const monthly = option ? (vatIncluded ? Math.round(option.monthlyIfSelected * (1 + result.vatRate)) : option.monthlyIfSelected) : 0;
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setVariant(product.id, variant.id, quantity)}
                aria-pressed={active}
                className={cn(
                  "edge surface interactive flex flex-col rounded-card p-5 text-left",
                  active && "selected-glow",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative size-12 shrink-0">
                    {product.imageUrl && <Image src={product.imageUrl} alt="" fill sizes="48px" className="object-contain" unoptimized />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-micro text-fg-3">{product.name}</p>
                    <p className="text-[1.0625rem] font-semibold leading-tight text-fg">{variant.name}</p>
                    <p className="text-small text-fg-2">{variant.benefit}</p>
                  </div>
                </div>

                <p className="mt-4 text-small text-fg-2">{variant.description}</p>

                {variant.attributes && (
                  <dl className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-4">
                    {Object.entries(variant.attributes).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-3 text-small">
                        <dt className="text-fg-3">{key}</dt>
                        <dd className="text-right text-fg">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="mt-auto pt-5">
                  <p className="num text-[1.375rem] font-semibold tracking-tight text-fg">
                    {option ? formatImpact(option.perUnitMonthly, result.vatRate) : "—"}
                    <span className="text-small font-normal text-fg-3">{t.perMonth} / un.</span>
                  </p>
                  <p className="mt-1 text-small text-fg-2">
                    {active ? (
                      <span className="inline-flex items-center gap-1 font-medium text-accent-2">
                        <Check className="size-3.5" strokeWidth={3} /> {t.selected}
                      </span>
                    ) : (
                      <span className={cn("num font-medium", delta > 0 ? "text-fg" : "text-success")}>
                        {delta > 0 ? "+" : "−"}
                        {formatImpact(Math.abs(delta), result.vatRate)}
                        {t.perMonthExtra}
                      </span>
                    )}
                  </p>
                  <p className="num mt-3 rounded-xl bg-white/[0.04] px-3 py-2 text-small text-fg-2">
                    {t.withThisOption}: <span className="font-semibold text-fg">{money(monthly, 0)}</span>
                    {t.perMonth}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
