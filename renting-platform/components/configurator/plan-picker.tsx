"use client";

import { LayoutTemplate, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import type { PlanDTO } from "@/types/catalog";
import { useConfigurator, useConfiguratorData } from "./configurator-context";

/** Starting points (presets / templates). Everything remains editable afterwards. */
export function PlanPicker() {
  const { catalog, defaults } = useConfiguratorData();
  const planId = useConfigurator((s) => s.planId);
  const hasLines = useConfigurator((s) => s.config.lines.length > 0);
  const applyPlan = useConfigurator((s) => s.applyPlan);
  const [pending, setPending] = useState<PlanDTO | "scratch" | null>(null);

  const presets = catalog.plans.filter((p) => p.kind === "PRESET");
  const templates = catalog.plans.filter((p) => p.kind === "TEMPLATE");
  const defaultSupport = catalog.supportPlans.find((p) => p.isDefault)?.id ?? null;

  function apply(target: PlanDTO | "scratch") {
    applyPlan(target === "scratch" ? null : target, {
      contractMonths: defaults.contractMonths,
      upfrontPercent: defaults.upfrontPercent,
      supportPlanId: defaultSupport,
    });
    setPending(null);
  }

  function choose(target: PlanDTO | "scratch") {
    if (target !== "scratch" && target.id === planId) return;
    if (hasLines) setPending(target);
    else apply(target);
  }

  const chip = (active: boolean) =>
    cn(
      "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-small font-medium transition-colors",
      active ? "border-accent/50 bg-accent/15 text-fg" : "border-white/[0.08] bg-white/[0.03] text-fg-2 hover:border-white/15 hover:text-fg",
    );

  return (
    <>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Configuração inicial">
        {presets.map((plan) => (
          <button key={plan.id} type="button" onClick={() => choose(plan)} className={chip(plan.id === planId)} aria-pressed={plan.id === planId}>
            {plan.highlight && <Star className="size-3.5 text-warning" fill="currentColor" aria-hidden="true" />}
            {plan.name}
          </button>
        ))}
        {templates.map((plan) => (
          <button key={plan.id} type="button" onClick={() => choose(plan)} className={chip(plan.id === planId)} aria-pressed={plan.id === planId}>
            <LayoutTemplate className="size-3.5 opacity-70" aria-hidden="true" />
            {plan.name}
          </button>
        ))}
        <button type="button" onClick={() => choose("scratch")} className={chip(planId === null && !hasLines)}>
          <Sparkles className="size-3.5 opacity-70" aria-hidden="true" />
          Montar do zero
        </button>
      </div>

      <Modal
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title="Substituir configuração?"
        description={
          pending === "scratch"
            ? "Todos os equipamentos selecionados serão removidos."
            : `A configuração atual será substituída por ${pending?.name ?? ""}.`
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => pending && apply(pending)}>
              Substituir
            </Button>
          </>
        }
      >
        <p className="text-small text-fg-2">Pode continuar a ajustar tudo depois de aplicar.</p>
      </Modal>
    </>
  );
}
