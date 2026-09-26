"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lock, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";
import { usePricingContext, useQuote } from "./configurator-context";
import { useMoney, usePercent } from "./use-display";

/**
 * Seller-only financial summary. Must always be rendered inside <InternalOnly>
 * (never in client mode, never for roles without internal.view).
 */
export function InternalSummary({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { result } = useQuote();
  const { rules } = usePricingContext();
  const money = useMoney();
  const percent = usePercent();

  const marginTone =
    result.marginStatus === "loss" ? "text-danger" : result.marginStatus === "below-minimum" ? "text-warning" : "text-success";

  const rows: { label: string; value: number; format: (v: number) => string; tone?: string }[] = [
    { label: "Custo total", value: result.totalInternalCost, format: (v) => money(v, 0) },
    { label: "Receita do contrato", value: result.totalContractRevenue, format: (v) => money(v, 0) },
    { label: "Lucro bruto", value: result.grossProfit, format: (v) => money(v, 0), tone: result.grossProfit < 0 ? "text-danger" : undefined },
    { label: "Margem", value: result.grossMargin, format: (v) => percent(v), tone: marginTone },
    { label: "Markup", value: result.markup, format: (v) => percent(v, 0) },
    { label: "Valor residual", value: result.residualAssetValue, format: (v) => money(v, 0) },
  ];

  return (
    <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/20" data-testid="internal-summary">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-small font-medium text-fg-2">
          <Lock className="size-3.5" /> Resumo interno
        </span>
        <span className="flex items-center gap-2">
          <span className={cn("num text-small font-semibold", marginTone)}>{percent(result.grossMargin)}</span>
          <ChevronDown className={cn("size-4 text-fg-3 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {result.marginStatus !== "healthy" && (
                <p
                  role="alert"
                  className={cn(
                    "mb-3 flex items-start gap-2 rounded-xl px-3 py-2 text-small",
                    result.marginStatus === "loss" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning",
                  )}
                >
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {result.marginStatus === "loss"
                    ? "Prejuízo: a receita não cobre o custo."
                    : `Margem abaixo do limite definido (${percent(rules.minMarginPercent, 0)}).`}
                </p>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {rows.map((row) => (
                  <div key={row.label}>
                    <dt className="text-micro text-fg-3">{row.label}</dt>
                    <dd className={cn("text-[0.875rem] font-semibold text-fg", row.tone)}>
                      <AnimatedNumber value={row.value} format={row.format} duration={0.4} />
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-micro text-fg-3">Break-even</dt>
                  <dd className={cn("num text-[0.875rem] font-semibold", result.breakEvenMonth === null ? "text-danger" : "text-fg")}>
                    {result.breakEvenMonth === null ? "Fora do prazo" : result.breakEvenMonth === 0 ? "Imediato" : `${result.breakEvenMonth} meses`}
                  </dd>
                </div>
                <div>
                  <dt className="text-micro text-fg-3">Multiplicador</dt>
                  <dd className="num text-[0.875rem] font-semibold text-fg">
                    {result.warnings.includes("TARGET_MARGIN_ACTIVE") ? "Margem alvo" : `${rules.targetMultiplier.toFixed(2)}×`}
                  </dd>
                </div>
              </dl>
              {result.warnings.includes("MONTHLY_OVERRIDE_ACTIVE") && (
                <p className="mt-3 text-micro text-warning">Mensalidade definida manualmente.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
