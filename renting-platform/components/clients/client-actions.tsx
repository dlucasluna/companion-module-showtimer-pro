"use client";

import { Pencil, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ClientInput } from "@/lib/validation/client";
import { ClientFormModal } from "./client-form-modal";

export function NewClientButton() {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(params.get("new") === "1");
  return (
    <>
      <Button variant="primary" leftIcon={<UserPlus className="size-4" />} onClick={() => setOpen(true)} data-testid="new-client">
        Novo cliente
      </Button>
      <ClientFormModal open={open} onOpenChange={setOpen} onSaved={(client) => router.push(`/clients/${client.id}`)} />
    </>
  );
}

export function EditClientButton({ clientId, defaults }: { clientId: string; defaults: Partial<ClientInput> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" leftIcon={<Pencil className="size-4" />} onClick={() => setOpen(true)}>
        Editar
      </Button>
      <ClientFormModal open={open} onOpenChange={setOpen} clientId={clientId} defaults={defaults} onSaved={() => router.refresh()} />
    </>
  );
}
