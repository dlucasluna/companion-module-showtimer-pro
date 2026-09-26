"use client";

import { ChevronUp } from "lucide-react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useConfigurator, useConfiguratorData, useQuote } from "./configurator-context";
import { PriceSummary } from "./price-summary";
import { toCommercialTotals, useMoney } from "./use-display";

/** Sticky bottom bar + bottom sheet for tablets/phones (the side panel is hidden there). */
export function MobileSummary({
  className,
  ...summaryProps
}: { className?: string } & Parameters<typeof PriceSummary>[0]) {
  const [open, setOpen] = useState(false);
  const { messages } = useConfiguratorData();
  const t = messages.configurator;
  const vatIncluded = useConfigurator((s) => s.config.pricesIncludeVat);
  const { result } = useQuote();
  const totals = toCommercialTotals(result, vatIncluded);
  const money = useMoney();

  return (
    <>
      <div className={cn("fixed inset-x-0 bottom-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]", className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="glass-strong edge flex w-full items-center justify-between gap-4 rounded-[20px] px-5 py-3.5 text-left"
          aria-label={`${t.yourSystem}: ${money(totals.monthlyPayment, 0)}${t.perMonth}`}
        >
          <span>
            <span className="block text-micro text-fg-3">
              {t.initialInvestment} {money(totals.initialPayment, 0)} · {totals.contractMonths} {t.months}
            </span>
            <span className="flex items-baseline gap-1">
              <AnimatedNumber value={totals.monthlyPayment} format={(v) => money(Math.round(v), 0)} className="text-[1.625rem] font-semibold tracking-tight text-fg" />
              <span className="text-small text-fg-2">{t.perMonth}</span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-4 py-2 text-small font-medium text-white">
            {t.yourSystem} <ChevronUp className="size-4" />
          </span>
        </button>
      </div>
      <Drawer open={open} onOpenChange={setOpen} title={t.yourSystem} side="bottom" bare>
        <div className="p-3 pb-6">
          <PriceSummary {...summaryProps} />
        </div>
      </Drawer>
    </>
  );
}
