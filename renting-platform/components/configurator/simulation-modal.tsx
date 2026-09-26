"use client";

import { Check, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { InternalOnly } from "@/components/layout/internal-only";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal } from "@/components/ui/modal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { priceConfiguration, type Adjustment } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { useConfigurator, useConfiguratorData, usePricingContext } from "./configurator-context";
import { toCommercialTotals, useMoney, usePercent } from "./use-display";

interface Scenario {
  id: number;
  label: string;
  contractMonths: number;
  upfront: Adjustment;
}

let nextId = 1;

/** "Simular condições" — compare entry/term combinations side by side, then apply one. */
export function SimulationModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { catalog, defaults, messages } = useConfiguratorData();
  const t = messages.configurator;
  const config = useConfigurator((s) => s.config);
  const applyConditions = useConfigurator((s) => s.applyConditions);
  const context = usePricingContext();
  const money = useMoney();
  const percent = usePercent();

  const initialScenarios = useMemo<Scenario[]>(() => {
    const fromConditions = catalog.paymentConditions.slice(0, 2).map((condition) => ({
      id: nextId++,
      label: condition.name,
      contractMonths: condition.contractMonths,
      upfront: { mode: "percent", value: condition.upfrontPercent } as Adjustment,
    }));
    return [{ id: nextId++, label: "Atual", contractMonths: config.contractMonths, upfront: config.upfront }, ...fromConditions];
    // Recreated each time the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setScenarios(initialScenarios);
  }

  const results = scenarios.map((scenario) => {
    const { result } = priceConfiguration({ ...config, contractMonths: scenario.contractMonths, upfront: scenario.upfront, monthlyOverride: null }, context);
    return { scenario, result, totals: toCommercialTotals(result, config.pricesIncludeVat) };
  });

  const update = (id: number, patch: Partial<Scenario>) => setScenarios((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const vat = results[0]?.result.vatRate ?? 0.23;
  const toDisplay = (net: number) => (config.pricesIncludeVat ? Math.round(net * (1 + vat)) : net);
  const toNet = (display: number) => (config.pricesIncludeVat ? Math.round(display / (1 + vat)) : display);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Simular condições" description="Compare entrada e prazo lado a lado." size="xl">
      <div className={cn("grid gap-3", results.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
        {results.map(({ scenario, result, totals }) => (
          <div key={scenario.id} className="edge surface flex flex-col rounded-card p-5" data-testid="simulation-scenario">
            <div className="flex items-center justify-between">
              <p className="text-[0.9375rem] font-semibold text-fg">{scenario.label}</p>
              {scenarios.length > 1 && (
                <button
                  type="button"
                  onClick={() => setScenarios((list) => list.filter((s) => s.id !== scenario.id))}
                  className="grid size-7 place-items-center rounded-full text-fg-3 hover:bg-white/10 hover:text-fg"
                  aria-label={`Remover cenário ${scenario.label}`}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1.5 text-small text-fg-3">{t.upfront}</p>
                <MoneyInput
                  aria-label={`Entrada do cenário ${scenario.label}`}
                  value={toDisplay(result.initialPayment)}
                  onCommit={(cents) => update(scenario.id, { upfront: { mode: "amount", value: toNet(cents ?? 0) } })}
                />
              </div>
              <div>
                <p className="mb-1.5 text-small text-fg-3">{t.term}</p>
                <SegmentedControl
                  label={`Prazo do cenário ${scenario.label}`}
                  size="sm"
                  options={defaults.allowedContractMonths.map((m) => ({ value: m, label: `${m}` }))}
                  value={scenario.contractMonths}
                  onChange={(contractMonths) => update(scenario.id, { contractMonths })}
                />
              </div>
            </div>

            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <p className="text-small text-fg-2">{t.monthly}</p>
              <p className="num text-[2.25rem] font-semibold leading-tight tracking-tight text-fg">
                {money(totals.monthlyPayment, 0)}
                <span className="text-[0.9375rem] font-normal text-fg-3">{t.perMonth}</span>
              </p>
              <p className="num text-small text-fg-2">
                {money(totals.initialPayment, 0)} + {totals.contractMonths} × {money(totals.monthlyPayment, 0)}
              </p>
              <InternalOnly>
                <p
                  className={cn(
                    "num mt-2 text-small",
                    result.marginStatus === "healthy" ? "text-fg-3" : result.marginStatus === "loss" ? "text-danger" : "text-warning",
                  )}
                >
                  Margem {percent(result.grossMargin)} · break-even {result.breakEvenMonth ?? "—"}
                  {result.breakEvenMonth !== null ? "m" : ""}
                </p>
              </InternalOnly>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              leftIcon={<Check className="size-3.5" />}
              onClick={() => {
                applyConditions({ contractMonths: scenario.contractMonths, upfront: scenario.upfront });
                onOpenChange(false);
              }}
            >
              Aplicar
            </Button>
          </div>
        ))}
        {scenarios.length < 3 && (
          <button
            type="button"
            onClick={() =>
              setScenarios((list) => [...list, { id: nextId++, label: `Cenário ${list.length + 1}`, contractMonths: config.contractMonths, upfront: config.upfront }])
            }
            className="grid min-h-48 place-items-center rounded-card border border-dashed border-white/10 text-small text-fg-2 transition hover:border-white/20 hover:text-fg"
          >
            <span className="flex items-center gap-2">
              <Plus className="size-4" /> Adicionar cenário
            </span>
          </button>
        )}
      </div>
    </Modal>
  );
}
