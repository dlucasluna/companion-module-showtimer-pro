"use client";

import type { ContractStatus } from "@prisma/client";
import { StatusMenu } from "@/components/ui/status-menu";
import { updateContractStatusAction } from "@/lib/actions/operations";

const OPTIONS: { value: ContractStatus; label: string }[] = [
  { value: "AWAITING_SIGNATURE", label: "Aguardando assinatura" },
  { value: "AWAITING_INSTALLATION", label: "Aguardando instalação" },
  { value: "ACTIVE", label: "Ativar contrato" },
  { value: "SUSPENDED", label: "Suspender" },
  { value: "ENDED", label: "Encerrar" },
];

export function ContractStatusMenu({ id, number, status }: { id: string; number: string; status: ContractStatus }) {
  return (
    <StatusMenu
      label={`Estado do contrato ${number}`}
      current={status}
      options={OPTIONS}
      update={(value) => updateContractStatusAction(id, value)}
      successMessage="Contrato atualizado."
    />
  );
}
