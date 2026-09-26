"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { saveAsTemplateAction } from "@/lib/actions/proposals";

export function TemplateModal({
  proposalId,
  open,
  onOpenChange,
  beforeSave,
  suggestion,
}: {
  proposalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beforeSave: () => Promise<boolean>;
  suggestion: string;
}) {
  const [name, setName] = useState(suggestion);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await beforeSave();
      const result = await saveAsTemplateAction(proposalId, name);
      if (result.ok) {
        toast.success("Template guardado", `"${name}" já está disponível como ponto de partida.`);
        onOpenChange(false);
      } else toast.error("Não foi possível guardar o template", result.error);
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Guardar como template"
      description="Reutilize esta configuração em novas propostas."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={pending} disabled={name.trim().length < 2}>
            Guardar template
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Label htmlFor="template-name">Nome do template</Label>
        <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Broadcast Church 2 Cameras" />
      </form>
    </Modal>
  );
}
