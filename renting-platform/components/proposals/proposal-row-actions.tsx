"use client";

import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { deleteProposalAction, duplicateProposalAction } from "@/lib/actions/proposals";

export function ProposalRowActions({ id, number, canManage, editable }: { id: string; number: string; canManage: boolean; editable: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const duplicate = () =>
    startTransition(async () => {
      const result = await duplicateProposalAction(id);
      if (result.ok) {
        toast.success("Proposta duplicada");
        router.push(`/proposals/${result.data.id}`);
      } else toast.error("Não foi possível duplicar", result.error);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteProposalAction(id);
      if (result.ok) {
        toast.success("Proposta eliminada");
        setConfirming(false);
        router.refresh();
      } else toast.error("Não foi possível eliminar", result.error);
    });

  const items = [
    ...(canManage && editable ? [{ label: "Abrir configurador", icon: Pencil, onSelect: () => router.push(`/proposals/${id}`) }] : []),
    { label: "Pré-visualizar", icon: Eye, onSelect: () => router.push(`/proposals/${id}/preview`) },
    ...(canManage ? [{ label: "Duplicar", icon: Copy, onSelect: duplicate }] : []),
    ...(canManage && editable ? [{ label: "Eliminar", icon: Trash2, destructive: true, onSelect: () => setConfirming(true) }] : []),
  ];

  return (
    <div className="relative z-10 flex justify-end">
      <Menu
        label={`Ações da proposta ${number}`}
        items={items}
        trigger={({ open, toggle }) => (
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={`Ações da proposta ${number}`} loading={pending && !confirming}>
            {!pending && <MoreHorizontal className="size-4" />}
          </Button>
        )}
      />
      <Modal
        open={confirming}
        onOpenChange={setConfirming}
        title="Eliminar proposta?"
        description={`A proposta ${number} será eliminada permanentemente.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} loading={pending}>
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-small text-fg-2">Esta ação não pode ser desfeita.</p>
      </Modal>
    </div>
  );
}
