"use client";

import { SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PercentInput } from "@/components/ui/money-input";
import { toast } from "@/components/ui/toast";
import { deletePlanAction, updatePlanRuleAction } from "@/lib/actions/settings";
import type { PlanRuleInput } from "@/lib/validation/settings";

export function PlanCardActions({
  planId,
  planName,
  canDelete,
  canEditRules,
  rule,
  globalMultiplier,
}: {
  planId: string;
  planName: string;
  canDelete: boolean;
  canEditRules: boolean;
  rule: PlanRuleInput;
  globalMultiplier: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [values, setValues] = useState<PlanRuleInput>(rule);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const result = await updatePlanRuleAction(planId, values);
      if (result.ok) {
        toast.success("Regras do plano atualizadas.");
        setOpen(false);
        router.refresh();
      } else toast.error("Não foi possível guardar", result.error);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deletePlanAction(planId);
      if (result.ok) {
        toast.success("Plano removido.");
        setConfirm(false);
        router.refresh();
      } else toast.error("Não foi possível remover", result.error);
    });

  return (
    <div className="flex gap-1">
      {canEditRules && (
        <Button variant="ghost" size="sm" leftIcon={<SlidersHorizontal className="size-3.5" />} onClick={() => setOpen(true)}>
          Pricing
        </Button>
      )}
      {canDelete && (
        <Button variant="ghost" size="icon-sm" aria-label={`Remover ${planName}`} onClick={() => setConfirm(true)}>
          <Trash2 className="size-4" />
        </Button>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Pricing · ${planName}`}
        description="Deixe em branco para herdar as regras globais."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setValues({ targetMultiplier: null, minMarginPercent: null, riskReservePercent: null })}>
              Herdar tudo
            </Button>
            <Button variant="primary" onClick={save} loading={pending}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor={`mult-${planId}`}>Multiplicador de receita (global {globalMultiplier}×)</Label>
            <input
              id={`mult-${planId}`}
              inputMode="decimal"
              value={values.targetMultiplier ?? ""}
              placeholder={`${globalMultiplier}`}
              onChange={(e) => {
                const v = Number.parseFloat(e.target.value.replace(",", "."));
                setValues((s) => ({ ...s, targetMultiplier: e.target.value.trim() === "" || Number.isNaN(v) ? null : v }));
              }}
              className="num h-11 w-full rounded-control border border-white/10 bg-white/[0.045] px-3.5 text-fg focus:border-accent/70 focus:outline-none focus:ring-4 focus:ring-accent/15"
            />
          </div>
          <div>
            <Label>Margem mínima</Label>
            <PercentInput aria-label="Margem mínima do plano" value={values.minMarginPercent ?? 0} onCommit={(v) => setValues((s) => ({ ...s, minMarginPercent: v || null }))} />
          </div>
          <div>
            <Label>Reserva de risco</Label>
            <PercentInput aria-label="Reserva de risco do plano" value={values.riskReservePercent ?? 0} onCommit={(v) => setValues((s) => ({ ...s, riskReservePercent: v || null }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title={`Remover ${planName}?`}
        description="O plano deixa de aparecer como ponto de partida. Propostas existentes não são afetadas."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} loading={pending}>
              Remover
            </Button>
          </>
        }
      >
        <span />
      </Modal>
    </div>
  );
}
