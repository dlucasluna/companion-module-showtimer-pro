"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { updateSupportPlanAction } from "@/lib/actions/settings";
import { formatPercent } from "@/lib/formatters";

interface Row {
  id: string;
  name: string;
  description: string | null;
  monthlyCost: number;
  monthlyPrice: number;
  active: boolean;
}

function SupportRow({ plan }: { plan: Row }) {
  const [values, setValues] = useState(plan);
  const [pending, startTransition] = useTransition();
  const dirty = values.monthlyCost !== plan.monthlyCost || values.monthlyPrice !== plan.monthlyPrice || values.active !== plan.active;
  const margin = values.monthlyPrice > 0 ? (values.monthlyPrice - values.monthlyCost) / values.monthlyPrice : null;

  return (
    <div className="grid items-center gap-3 py-4 sm:grid-cols-[1fr_150px_150px_auto_auto]">
      <div>
        <p className="font-medium text-fg">{plan.name}</p>
        <p className="text-small text-fg-3">
          {plan.description}
          {margin !== null && ` · margem ${formatPercent(margin, 0)}`}
        </p>
      </div>
      <MoneyInput aria-label={`Custo mensal ${plan.name}`} value={values.monthlyCost} suffix="custo" onCommit={(c) => setValues((v) => ({ ...v, monthlyCost: c ?? 0 }))} />
      <MoneyInput aria-label={`Preço mensal ${plan.name}`} value={values.monthlyPrice} suffix="preço" onCommit={(c) => setValues((v) => ({ ...v, monthlyPrice: c ?? 0 }))} />
      <Switch checked={values.active} onChange={(active) => setValues((v) => ({ ...v, active }))} label="Ativo" />
      <Button
        variant="secondary"
        size="sm"
        disabled={!dirty}
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await updateSupportPlanAction(plan.id, { monthlyCost: values.monthlyCost, monthlyPrice: values.monthlyPrice, active: values.active });
            if (result.ok) toast.success(`Plano ${plan.name} atualizado.`);
            else toast.error("Não foi possível guardar", result.error);
          })
        }
      >
        Guardar
      </Button>
    </div>
  );
}

export function SupportPlansEditor({ plans }: { plans: Row[] }) {
  return (
    <div className="divide-y divide-white/[0.06]">
      {plans.map((plan) => (
        <SupportRow key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
