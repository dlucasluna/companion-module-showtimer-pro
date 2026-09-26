"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, GitCompareArrows, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { memo } from "react";
import { InternalOnly } from "@/components/layout/internal-only";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { selectLine } from "@/store/configurator-store";
import type { CatalogProductDTO } from "@/types/catalog";
import {
  defaultVariant,
  useAddImpact,
  useConfigurator,
  useConfiguratorData,
  useInternalUnitCost,
  useQuote,
} from "./configurator-context";
import { useImpactFormatter } from "./use-display";

interface ProductCardProps {
  product: CatalogProductDTO;
  onCompare?: () => void;
  comparing?: boolean;
}

function InternalCostTag({ productId, variantId }: { productId: string; variantId: string | null }) {
  const cost = useInternalUnitCost(productId, variantId);
  if (cost === null) return null;
  return (
    <span className="num rounded-md border border-dashed border-white/10 px-1.5 py-0.5 text-micro text-fg-3" title="Custo interno (visível apenas no modo vendedor)">
      Custo {formatMoney(cost)}
    </span>
  );
}

export const ProductCard = memo(function ProductCard({ product, onCompare, comparing }: ProductCardProps) {
  const { messages } = useConfiguratorData();
  const t = messages.configurator;
  const line = useConfigurator((s) => selectLine(s, product.id));
  const lastChanged = useConfigurator((s) => s.lastChanged);
  const setQuantity = useConfigurator((s) => s.setQuantity);
  const setVariant = useConfigurator((s) => s.setVariant);
  const removeProduct = useConfigurator((s) => s.removeProduct);
  const { result, lineImpacts } = useQuote();
  const formatImpact = useImpactFormatter();

  const selected = Boolean(line && line.quantity > 0);
  const variant = product.variants.find((v) => v.id === line?.variantId) ?? defaultVariant(product);
  const addImpact = useAddImpact(product, variant);
  const single = product.maxQuantity === 1;
  const max = product.maxQuantity ?? 99;
  const lineImpact = lineImpacts[product.id] ?? 0;
  const description = variant?.description ?? product.description;
  const benefit = variant?.benefit ?? product.benefit;

  return (
    <motion.article
      layout="position"
      className={cn(
        "edge surface interactive group relative flex flex-col gap-4 rounded-card p-4 sm:p-5",
        selected && "selected-glow",
      )}
      animate={lastChanged === product.id ? { scale: [1, 1.012, 1] } : undefined}
      transition={{ duration: 0.35 }}
      aria-label={product.name}
      data-testid={`product-${product.slug}`}
      data-selected={selected}
    >
      <div className="flex gap-4">
        <div className="relative grid size-[76px] shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(circle_at_50%_30%,rgb(255_255_255/0.12),rgb(255_255_255/0.02)_70%)] sm:size-[84px]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={variant?.id ?? product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="relative size-[62px] sm:size-[68px]"
            >
              {product.imageUrl && <Image src={product.imageUrl} alt="" fill sizes="68px" className="object-contain" unoptimized />}
            </motion.div>
          </AnimatePresence>
          {variant && product.variants.length > 1 && (
            <span className="absolute bottom-1.5 rounded-full bg-black/60 px-1.5 text-[0.625rem] font-semibold uppercase tracking-wide text-fg-2">
              {variant.name}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[0.9375rem] font-semibold leading-snug tracking-tight text-fg">{product.name}</h3>
            {selected && (
              <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-micro font-medium text-accent-2">
                <Check className="size-3" strokeWidth={3} /> {line!.quantity > 1 ? `${line!.quantity}×` : t.selected}
              </span>
            )}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={description}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.16 }}
              className="mt-1 line-clamp-2 text-small text-fg-2"
            >
              {description}
            </motion.p>
          </AnimatePresence>
          {benefit && (
            <p className="mt-1.5 flex items-start gap-1.5 text-small text-fg">
              <Check className="mt-[3px] size-3.5 shrink-0 text-success" strokeWidth={2.5} aria-hidden="true" />
              <span className="line-clamp-2">{benefit}</span>
            </p>
          )}
        </div>
      </div>

      {product.variants.length > 1 && (
        <div className="flex items-center gap-2">
          <SegmentedControl
            label={`Versão de ${product.name}`}
            size="sm"
            options={product.variants.map((v) => ({ value: v.id, label: v.name }))}
            value={variant?.id ?? null}
            onChange={(variantId) => setVariant(product.id, variantId, line?.quantity ?? 1)}
          />
          {onCompare && (
            <button
              type="button"
              onClick={onCompare}
              aria-pressed={comparing}
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-[10px] border border-white/[0.08] text-fg-2 transition hover:bg-white/[0.07] hover:text-fg",
                comparing && "border-accent/40 bg-accent/10 text-accent-2",
              )}
              aria-label={t.compare}
              title={t.compare}
            >
              <GitCompareArrows className="size-4" />
            </button>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="num text-[0.9375rem] font-semibold text-fg">
            {selected ? formatImpact(lineImpact, result.vatRate) : `+${formatImpact(addImpact, result.vatRate)}`}
            <span className="text-small font-normal text-fg-3">{t.perMonth}</span>
          </p>
          <InternalOnly>
            <div className="mt-1">
              <InternalCostTag productId={product.id} variantId={variant?.id ?? null} />
            </div>
          </InternalOnly>
        </div>

        {selected ? (
          single ? (
            <button
              type="button"
              onClick={() => removeProduct(product.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-3.5 text-small font-medium text-fg-2 transition hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
            >
              <Trash2 className="size-3.5" /> {t.remove}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => removeProduct(product.id)}
                className="grid size-9 place-items-center rounded-full text-fg-3 transition hover:bg-danger/10 hover:text-danger"
                aria-label={`${t.remove} ${product.name}`}
                title={t.remove}
              >
                <Trash2 className="size-4" />
              </button>
              <QuantitySelector
                label={product.name}
                value={line!.quantity}
                max={max}
                onChange={(qty) => setQuantity(product.id, qty, variant?.id ?? null)}
              />
            </div>
          )
        ) : (
          <button
            type="button"
            onClick={() => setQuantity(product.id, product.defaultQuantity || 1, variant?.id ?? null)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-4 text-small font-medium text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] transition hover:border-accent/40 hover:bg-accent/15 active:scale-95"
          >
            <Plus className="size-3.5" strokeWidth={2.5} /> {t.add}
          </button>
        )}
      </div>
    </motion.article>
  );
});
