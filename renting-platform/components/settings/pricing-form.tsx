"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MoneyInput, PercentInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { updatePricingRuleAction } from "@/lib/actions/settings";
import { formatMoney } from "@/lib/formatters";
import { pricingRuleSchema, type PricingRuleInput } from "@/lib/validation/settings";

const PERCENT_FIELDS: { name: keyof PricingRuleInput; label: string; hint: string }[] = [
  { name: "defaultUpfrontPercent", label: "Entrada padrão", hint: "Percentagem do valor do sistema paga na assinatura." },
  { name: "minMarginPercent", label: "Margem mínima recomendada", hint: "Abaixo disto o vendedor vê um aviso interno." },
  { name: "riskReservePercent", label: "Reserva de risco", hint: "Sobre o custo dos equipamentos (danos, substituições)." },
  { name: "maintenanceReservePercent", label: "Reserva de manutenção (anual)", hint: "Sobre o custo dos equipamentos, por ano de contrato." },
  { name: "defaultResidualPercent", label: "Valor residual padrão", hint: "Mínimo para produtos sem valor próprio." },
  { name: "residualCreditPercent", label: "Crédito do valor residual", hint: "Parte do valor residual descontada ao cliente (0% = empresa retém)." },
  { name: "vatRate", label: "IVA", hint: "Taxa aplicada aos valores comerciais." },
];

export function PricingForm({ defaults }: { defaults: PricingRuleInput }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<PricingRuleInput>({ resolver: zodResolver(pricingRuleSchema), defaultValues: defaults });
  const { control, register, handleSubmit, formState, watch } = form;
  const multiplier = watch("targetMultiplier");

  const submit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await updatePricingRuleAction(values);
      if (result.ok) toast.success("Regras de pricing atualizadas", "As novas propostas usam já estes valores.");
      else toast.error("Não foi possível guardar", result.error);
    }),
  );

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target Revenue Multiplier" hint={`Custo €4.000 → receita alvo ${formatMoney(Math.round(400_000 * (Number(multiplier) || 0)))}`} error={formState.errors.targetMultiplier?.message}>
          {(p) => (
            <Controller
              control={control}
              name="targetMultiplier"
              render={({ field }) => (
                <Input
                  {...p}
                  inputMode="decimal"
                  defaultValue={String(field.value)}
                  onChange={(e) => field.onChange(Number.parseFloat(e.target.value.replace(",", ".")) || 0)}
                  className="num"
                />
              )}
            />
          )}
        </Field>
        <Field label="Duração padrão (meses)" error={formState.errors.defaultContractMonths?.message}>
          {(p) => <Input {...p} inputMode="numeric" className="num" {...register("defaultContractMonths", { valueAsNumber: true })} />}
        </Field>
        <Field label="Durações permitidas" hint="Meses separados por vírgula" error={formState.errors.allowedContractMonths?.message}>
          {(p) => <Input {...p} className="num" {...register("allowedContractMonths")} />}
        </Field>
        {PERCENT_FIELDS.map((f) => (
          <Field key={f.name} label={f.label} hint={f.hint} error={formState.errors[f.name]?.message}>
            {(p) => <Controller control={control} name={f.name} render={({ field }) => <PercentInput {...p} value={Number(field.value)} onCommit={field.onChange} />} />}
          </Field>
        ))}
        <Field label="Arredondamento da mensalidade" hint="Mensalidade arredondada para cima a este valor." error={formState.errors.roundMonthlyTo?.message}>
          {(p) => <Controller control={control} name="roundMonthlyTo" render={({ field }) => <MoneyInput {...p} value={field.value} onCommit={(c) => field.onChange(c ?? 0)} />} />}
        </Field>
        <Field label="Arredondamento da entrada" hint="Entrada arredondada ao múltiplo mais próximo." error={formState.errors.roundUpfrontTo?.message}>
          {(p) => <Controller control={control} name="roundUpfrontTo" render={({ field }) => <MoneyInput {...p} value={field.value} onCommit={(c) => field.onChange(c ?? 0)} />} />}
        </Field>
      </div>
      <Controller
        control={control}
        name="pricesIncludeVat"
        render={({ field }) => (
          <Switch checked={field.value} onChange={field.onChange} label="Apresentar preços com IVA por defeito" description="Pode ser alterado em cada proposta (Ajustar proposta)." />
        )}
      />
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={pending}>
          Guardar regras
        </Button>
      </div>
    </form>
  );
}
