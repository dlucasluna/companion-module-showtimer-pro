"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Save } from "lucide-react";
import { InternalOnly } from "@/components/layout/internal-only";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useConfigurator, useConfiguratorData, useQuote } from "./configurator-context";
import { ConditionsEditor } from "./conditions-editor";
import { InternalSummary } from "./internal-summary";
import { toCommercialTotals, useMoney } from "./use-display";

/** "2× Câmera PTZ Standard" list with enter/exit animation. */
export function SystemItems({ className }: { className?: string }) {
  const { productsById, catalog, messages } = useConfiguratorData();
  const lines = useConfigurator((s) => s.config.lines);
  const supportPlanId = useConfigurator((s) => s.config.supportPlanId);
  const support = catalog.supportPlans.find((p) => p.id === supportPlanId);
  const order = new Map(catalog.products.map((p, i) => [p.id, i]));
  const sorted = [...lines].filter((l) => l.quantity > 0).sort((a, b) => (order.get(a.productId) ?? 0) - (order.get(b.productId) ?? 0));

  if (sorted.length === 0) {
    return <p className={cn("py-3 text-small text-fg-3", className)}>{messages.configurator.emptySystem}</p>;
  }

  return (
    <ul className={cn("space-y-1", className)} data-testid="system-items">
      <AnimatePresence initial={false}>
        {sorted.map((line) => {
          const product = productsById.get(line.productId);
          if (!product) return null;
          const variant = product.variants.find((v) => v.id === line.variantId);
          return (
            <motion.li
              key={line.productId}
              layout="position"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 6, transition: { duration: 0.12 } }}
              transition={{ duration: 0.22 }}
              className="flex items-baseline gap-2.5 text-[0.875rem]"
            >
              <span className="num w-7 shrink-0 text-right font-semibold text-fg-2">{line.quantity}×</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={variant?.id ?? product.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="truncate text-fg"
                >
                  {product.name}
                  {variant && <span className="text-fg-2"> {variant.name}</span>}
                </motion.span>
              </AnimatePresence>
            </motion.li>
          );
        })}
        {support && (
          <motion.li key="support" layout="position" className="flex items-baseline gap-2.5 pt-1 text-[0.875rem]">
            <span className="w-7 shrink-0" />
            <span className="truncate text-fg-2">
              {messages.configurator.support} {support.name}
            </span>
          </motion.li>
        )}
      </AnimatePresence>
    </ul>
  );
}

function ItemCount() {
  const count = useConfigurator((s) => s.config.lines.reduce((sum, l) => sum + l.quantity, 0));
  return <span className="num text-small text-fg-3">{count} {count === 1 ? "item" : "itens"}</span>;
}

/** Big commercial numbers: investimento inicial + mensalidade + prazo. */
export function CommercialFigures({ size = "md" }: { size?: "md" | "lg" }) {
  const { messages, locale, productsById } = useConfiguratorData();
  const t = messages.configurator;
  const vatIncluded = useConfigurator((s) => s.config.pricesIncludeVat);
  const hasInstallation = useConfigurator((s) =>
    s.config.lines.some((l) => l.quantity > 0 && productsById.get(l.productId)?.type === "INSTALLATION"),
  );
  const { result } = useQuote();
  const totals = toCommercialTotals(result, vatIncluded);
  const money = useMoney();

  return (
    <div data-testid="commercial-figures">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-small text-fg-2">{t.initialInvestment}</span>
        <AnimatedNumber
          value={totals.initialPayment}
          format={(v) => money(Math.round(v), 0)}
          className={cn("font-semibold tracking-tight text-fg", size === "lg" ? "text-[1.5rem]" : "text-[1.25rem]")}
        />
      </div>
      <div className="mt-3">
        <span className="text-small text-fg-2">{t.monthly}</span>
        <div className="mt-1 flex items-baseline gap-1.5" data-testid="monthly-payment">
          <AnimatedNumber
            value={totals.monthlyPayment}
            format={(v) => money(Math.round(v), 0)}
            className={cn("font-semibold leading-none tracking-[-0.035em] text-fg", size === "lg" ? "text-[3.5rem]" : "text-[3rem]")}
          />
          <span className="text-[1rem] text-fg-2">{t.perMonth}</span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-fg-2">
        <span className="num font-medium text-fg">
          {totals.contractMonths} {t.months}
        </span>
        <span className="text-fg-3">·</span>
        <span>{vatIncluded ? t.vatIncluded : `${t.vatExcluded} (${formatPercent(totals.vatRate, 0, locale)})`}</span>
      </div>
      {hasInstallation && <p className="mt-2 text-small text-success">{t.includedServices}</p>}
    </div>
  );
}

interface PriceSummaryProps {
  onGenerate: () => void;
  onSave: () => void;
  generating?: boolean;
  saving?: boolean;
  presenting?: boolean;
}

/** Sticky right panel — "Seu sistema". */
export function PriceSummary({ onGenerate, onSave, generating, saving, presenting }: PriceSummaryProps) {
  const { messages } = useConfiguratorData();
  const t = messages.configurator;
  const empty = useConfigurator((s) => s.config.lines.length === 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="glass edge rounded-panel p-5 xl:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-h3 text-fg">{t.yourSystem}</h2>
          <ItemCount />
        </div>
        <SystemItems className={cn("mt-3 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,black_85%,transparent)]", presenting ? "max-h-[min(16vh,132px)]" : "max-h-[min(22vh,168px)]")} />
        <div className="hairline my-4" />
        <ConditionsEditor />
        <div className="hairline my-4" />
        <CommercialFigures size={presenting ? "lg" : "md"} />
        <div className="mt-5 space-y-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onGenerate}
            loading={generating}
            disabled={empty}
            rightIcon={<ArrowRight className="size-4" />}
            data-testid="generate-proposal"
          >
            {t.generateProposal}
          </Button>
          {!presenting && (
            <Button variant="secondary" size="md" className="w-full" onClick={onSave} loading={saving} leftIcon={<Save className="size-4" />}>
              {t.saveProposal}
            </Button>
          )}
        </div>
      </div>
      <InternalOnly>
        <InternalSummary />
      </InternalOnly>
    </div>
  );
}
