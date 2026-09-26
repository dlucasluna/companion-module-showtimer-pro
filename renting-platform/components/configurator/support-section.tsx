"use client";

import { Check, Headset } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfigurator, useConfiguratorData, useQuote } from "./configurator-context";
import { useMoney } from "./use-display";

/** Support plans as selectable tiles — each one changes the monthly payment. */
export function SupportSection() {
  const { catalog, messages } = useConfiguratorData();
  const t = messages.configurator;
  const selectedId = useConfigurator((s) => s.config.supportPlanId);
  const vatIncluded = useConfigurator((s) => s.config.pricesIncludeVat);
  const setSupportPlan = useConfigurator((s) => s.setSupportPlan);
  const { result } = useQuote();
  const money = useMoney();

  return (
    <div role="radiogroup" aria-label={t.support} className="grid gap-3 @xl:grid-cols-2">
      {catalog.supportPlans.map((plan) => {
        const active = plan.id === selectedId;
        const price = vatIncluded ? Math.round(plan.monthlyPrice * (1 + result.vatRate)) : plan.monthlyPrice;
        return (
          <button
            key={plan.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setSupportPlan(plan.id)}
            data-testid={`support-${plan.slug}`}
            className={cn("edge surface interactive flex flex-col rounded-card p-5 text-left", active && "selected-glow")}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-[10px] bg-white/[0.06] text-fg-2">
                  <Headset className="size-4" strokeWidth={1.8} />
                </span>
                <span className="text-[1rem] font-semibold text-fg">{plan.name}</span>
              </span>
              <span className={cn("grid size-5 place-items-center rounded-full border", active ? "border-accent bg-accent text-white" : "border-white/20")}>
                {active && <Check className="size-3" strokeWidth={3} />}
              </span>
            </div>
            <p className="mt-2 text-small text-fg-2">{plan.description}</p>
            <ul className="mt-3 space-y-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-small text-fg">
                  <Check className="mt-[3px] size-3 shrink-0 text-success" strokeWidth={3} aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <p className="num mt-4 text-[1.0625rem] font-semibold text-fg">
              {price === 0 ? t.included : `+${money(price, "auto")}`}
              {price > 0 && <span className="text-small font-normal text-fg-3">{t.perMonth}</span>}
            </p>
          </button>
        );
      })}
    </div>
  );
}
