"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Label, Select } from "@/components/ui/input";
import { MoneyInput, PercentInput } from "@/components/ui/money-input";
import { PriceSlider } from "@/components/ui/price-slider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useConfigurator, useConfiguratorData, usePricingContext, useQuote } from "./configurator-context";
import { InternalSummary } from "./internal-summary";
import { useMoney, usePercent } from "./use-display";

function Row({ label, children, action }: { label: string; children: ReactNode; action?: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <div className="mb-2 flex items-center justify-between">
        <Label className="mb-0" htmlFor={undefined}>
          <span id={id}>{label}</span>
        </Label>
        {action}
      </div>
      {children}
    </div>
  );
}

function ResetButton({ onClick, label = "Repor" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-small text-accent-2 hover:underline">
      <RotateCcw className="size-3" /> {label}
    </button>
  );
}

/**
 * "Ajustar proposta" — seller-only negotiation tools. Rendered only when
 * internal data can be shown (never in client mode).
 */
export function NegotiationDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { catalog, defaults } = useConfiguratorData();
  const config = useConfigurator((s) => s.config);
  const setUpfront = useConfigurator((s) => s.setUpfront);
  const setDiscount = useConfigurator((s) => s.setDiscount);
  const setContractMonths = useConfigurator((s) => s.setContractMonths);
  const setSupportPlan = useConfigurator((s) => s.setSupportPlan);
  const setMonthlyOverride = useConfigurator((s) => s.setMonthlyOverride);
  const setTargetMargin = useConfigurator((s) => s.setTargetMargin);
  const setPricesIncludeVat = useConfigurator((s) => s.setPricesIncludeVat);
  const { result } = useQuote();
  const { rules } = usePricingContext();
  const money = useMoney();
  const percent = usePercent();

  const vat = result.vatRate;
  const vatIncluded = config.pricesIncludeVat;
  const toDisplay = (net: number) => (vatIncluded ? Math.round(net * (1 + vat)) : net);
  const toNet = (display: number) => (vatIncluded ? Math.round(display / (1 + vat)) : display);
  const vatSuffix = vatIncluded ? "c/ IVA" : "s/ IVA";
  const belowMinimum = result.marginStatus !== "healthy";

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Ajustar proposta" description="Condições de negociação. Visível apenas para si." width="sm:max-w-[460px]">
      <div className="space-y-7">
        {belowMinimum && (
          <div role="alert" className={cn("flex items-start gap-2.5 rounded-2xl px-4 py-3 text-small", result.marginStatus === "loss" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning")}>
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">{result.marginStatus === "loss" ? "Proposta com prejuízo." : "Margem abaixo do limite definido."}</p>
              <p className="mt-0.5 opacity-90">
                Margem atual {percent(result.grossMargin)} · mínima recomendada {percent(rules.minMarginPercent, 0)}.
              </p>
            </div>
          </div>
        )}

        <Row label="Entrada">
          <div className="flex gap-2">
            <SegmentedControl
              label="Tipo de entrada"
              size="md"
              stretch={false}
              className="shrink-0"
              options={[
                { value: "percent", label: "%" },
                { value: "amount", label: "€" },
              ]}
              value={config.upfront.mode}
              onChange={(mode) =>
                setUpfront(
                  mode === "percent"
                    ? { mode, value: result.systemPrice > 0 ? Math.min(1, result.initialPayment / result.systemPrice) : 0.3 }
                    : { mode, value: result.initialPayment },
                )
              }
            />
            {config.upfront.mode === "percent" ? (
              <PercentInput className="flex-1" aria-label="Entrada em percentagem" value={config.upfront.value} onCommit={(value) => setUpfront({ mode: "percent", value })} />
            ) : (
              <MoneyInput
                className="flex-1"
                aria-label="Entrada em euros"
                value={toDisplay(config.upfront.value)}
                suffix={vatSuffix}
                onCommit={(cents) => setUpfront({ mode: "amount", value: toNet(cents ?? 0) })}
              />
            )}
          </div>
          <p className="num mt-1.5 text-small text-fg-3">Entrada efetiva: {money(toDisplay(result.initialPayment))}</p>
        </Row>

        <Row
          label="Mensalidade desejada"
          action={config.monthlyOverride !== null ? <ResetButton onClick={() => setMonthlyOverride(null)} label="Automática" /> : undefined}
        >
          <MoneyInput
            aria-label="Mensalidade desejada"
            value={config.monthlyOverride !== null ? toDisplay(config.monthlyOverride) : null}
            placeholder={`${money(toDisplay(result.monthlyPayment), 0).replace("€", "")} (automática)`}
            suffix={vatSuffix}
            onCommit={(cents) => setMonthlyOverride(cents === null ? null : toNet(cents))}
          />
          <p className="mt-1.5 text-small text-fg-3">Substitui o cálculo automático. A margem é recalculada.</p>
        </Row>

        <Row label="Prazo">
          <SegmentedControl
            label="Prazo"
            options={[...new Set([...defaults.allowedContractMonths, config.contractMonths])].sort((a, b) => a - b).map((m) => ({ value: m, label: `${m}m` }))}
            value={config.contractMonths}
            onChange={setContractMonths}
          />
        </Row>

        <Row label="Desconto" action={config.discount.value > 0 ? <ResetButton onClick={() => setDiscount({ mode: "percent", value: 0 })} /> : undefined}>
          <div className="flex gap-2">
            <SegmentedControl
              label="Tipo de desconto"
              stretch={false}
              className="shrink-0"
              options={[
                { value: "percent", label: "%" },
                { value: "amount", label: "€" },
              ]}
              value={config.discount.mode}
              onChange={(mode) => setDiscount({ mode, value: 0 })}
            />
            {config.discount.mode === "percent" ? (
              <PercentInput className="flex-1" aria-label="Desconto em percentagem" max={0.5} value={config.discount.value} onCommit={(value) => setDiscount({ mode: "percent", value })} />
            ) : (
              <MoneyInput className="flex-1" aria-label="Desconto em euros" value={config.discount.value} suffix="s/ IVA" onCommit={(cents) => setDiscount({ mode: "amount", value: cents ?? 0 })} />
            )}
          </div>
          {result.discountAmount > 0 && <p className="num mt-1.5 text-small text-fg-3">Desconto aplicado: {money(result.discountAmount)} (s/ IVA)</p>}
        </Row>

        <Row label="Suporte">
          <Select value={config.supportPlanId ?? ""} onChange={(e) => setSupportPlan(e.target.value || null)} aria-label="Plano de suporte">
            <option value="">Sem plano de suporte</option>
            {catalog.supportPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} {plan.monthlyPrice > 0 ? `· +${money(toDisplay(plan.monthlyPrice))}/mês` : "· incluído"}
              </option>
            ))}
          </Select>
        </Row>

        <Row
          label={`Margem alvo${config.targetMargin !== null ? ` · ${percent(config.targetMargin, 0)}` : ""}`}
          action={config.targetMargin !== null ? <ResetButton onClick={() => setTargetMargin(null)} label={`Usar multiplicador ${rules.targetMultiplier}×`} /> : undefined}
        >
          <PriceSlider
            label="Margem alvo"
            min={10}
            max={70}
            step={1}
            value={Math.round((config.targetMargin ?? result.grossMargin) * 100)}
            valueText={percent(config.targetMargin ?? result.grossMargin, 0)}
            onChange={(value) => setTargetMargin(value / 100)}
            marks={[Math.round(rules.minMarginPercent * 100)]}
          />
          <p className="mt-1 text-small text-fg-3">Define o preço de lista a partir da margem (antes de desconto).</p>
        </Row>

        <Switch
          checked={vatIncluded}
          onChange={setPricesIncludeVat}
          label="Apresentar preços com IVA"
          description="Os valores comerciais passam a incluir IVA e são arredondados com IVA."
        />

        <InternalSummary />
      </div>
    </Drawer>
  );
}
