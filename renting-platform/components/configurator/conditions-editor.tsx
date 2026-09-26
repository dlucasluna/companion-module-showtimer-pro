"use client";

import { PriceSlider } from "@/components/ui/price-slider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { useConfigurator, useConfiguratorData, useQuote } from "./configurator-context";
import { useMoney } from "./use-display";

const UPFRONT_PRESETS = [0.2, 0.25, 0.3, 0.35, 0.4, 0.5];

/** Term + upfront controls — used live in front of the client. */
export function ConditionsEditor({ compact = false }: { compact?: boolean }) {
  const { messages, defaults } = useConfiguratorData();
  const t = messages.configurator;
  const months = useConfigurator((s) => s.config.contractMonths);
  const upfront = useConfigurator((s) => s.config.upfront);
  const vatIncluded = useConfigurator((s) => s.config.pricesIncludeVat);
  const setContractMonths = useConfigurator((s) => s.setContractMonths);
  const setUpfront = useConfigurator((s) => s.setUpfront);
  const { result } = useQuote();
  const money = useMoney();

  const percent =
    upfront.mode === "percent" ? upfront.value : result.systemPrice > 0 ? Math.min(1, result.initialPayment / result.systemPrice) : 0;
  const initialDisplay = vatIncluded ? result.initialPaymentGross : result.initialPayment;
  const termOptions = [...new Set([...defaults.allowedContractMonths, months])].sort((a, b) => a - b);

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-small font-medium text-fg-2">{t.term}</span>
          <span className="num text-small text-fg-3">
            {months} {t.months}
          </span>
        </div>
        <SegmentedControl
          label={t.term}
          size="md"
          options={termOptions.map((m) => ({ value: m, label: `${m}` }))}
          value={months}
          onChange={setContractMonths}
        />
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-small font-medium text-fg-2">{t.upfront}</span>
          <span className="num text-small text-fg">
            {Math.round(percent * 100)}% · <span className="font-semibold">{money(initialDisplay, 0)}</span>
          </span>
        </div>
        <div className="mb-3 grid grid-cols-6 gap-1" role="group" aria-label={`${t.upfront} (%)`}>
          {UPFRONT_PRESETS.map((value) => {
            const active = upfront.mode === "percent" && Math.abs(upfront.value - value) < 0.001;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setUpfront({ mode: "percent", value })}
                aria-pressed={active}
                className={cn(
                  "num h-8 rounded-[9px] border text-[0.75rem] font-medium transition-colors",
                  active
                    ? "border-accent/50 bg-accent/20 text-fg"
                    : "border-white/[0.07] bg-white/[0.03] text-fg-2 hover:border-white/15 hover:text-fg",
                )}
              >
                {Math.round(value * 100)}%
              </button>
            );
          })}
        </div>
        <PriceSlider
          label={t.upfront}
          value={Math.round(percent * 100)}
          min={0}
          max={60}
          step={1}
          valueText={`${Math.round(percent * 100)}% — ${money(initialDisplay, 0)}`}
          onChange={(value) => setUpfront({ mode: "percent", value: value / 100 })}
        />
      </div>
    </div>
  );
}
