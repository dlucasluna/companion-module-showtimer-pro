"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { createClientAction, updateClientAction } from "@/lib/actions/clients";
import { CLIENT_STATUS } from "@/lib/status";
import { clientSchema, type ClientInput } from "@/lib/validation/client";

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  clientId?: string;
  defaults?: Partial<ClientInput>;
  onSaved?: (client: { id: string; name: string; contactName: string }) => void;
}

const EMPTY: ClientInput = {
  name: "",
  city: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  taxId: "",
  status: "PROSPECT",
  contactName: "",
  contactRole: "Pastor",
  contactEmail: "",
  contactPhone: "",
  notes: "",
};

export function ClientFormModal({ open, onOpenChange, clientId, defaults, onSaved }: ClientFormModalProps) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ClientInput>({ resolver: zodResolver(clientSchema), defaultValues: { ...EMPTY, ...defaults } });
  const { register, handleSubmit, formState, reset } = form;
  const err = (name: keyof ClientInput) => formState.errors[name]?.message;

  const submit = handleSubmit((values) =>
    startTransition(async () => {
      if (clientId) {
        const result = await updateClientAction(clientId, values);
        if (!result.ok) return void toast.error("Erro ao guardar", result.error);
        toast.success("Cliente atualizado.");
        onSaved?.({ id: clientId, name: values.name, contactName: values.contactName });
      } else {
        const result = await createClientAction(values);
        if (!result.ok) return void toast.error("Erro ao criar cliente", result.error);
        toast.success("Cliente criado.", values.name);
        onSaved?.(result.data);
        reset(EMPTY);
      }
      onOpenChange(false);
    }),
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={clientId ? "Editar cliente" : "Novo cliente"}
      description="Dados da igreja e do responsável."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={pending} data-testid="save-client">
            {clientId ? "Guardar alterações" : "Criar cliente"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-6" noValidate>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="eyebrow mb-3">Igreja</legend>
          <Field label="Nome da igreja" error={err("name")} className="sm:col-span-2">
            {(p) => <Input {...p} {...register("name")} placeholder="Igreja Batista Central" autoFocus data-testid="client-name" />}
          </Field>
          <Field label="Cidade" error={err("city")}>
            {(p) => <Input {...p} {...register("city")} placeholder="Lisboa" />}
          </Field>
          <Field label="Estado" error={err("status")}>
            {(p) => (
              <Select {...p} {...register("status")}>
                {Object.entries(CLIENT_STATUS).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Email" error={err("email")}>
            {(p) => <Input {...p} type="email" {...register("email")} placeholder="secretaria@igreja.pt" />}
          </Field>
          <Field label="Telefone" error={err("phone")}>
            {(p) => <Input {...p} type="tel" {...register("phone")} placeholder="+351 …" />}
          </Field>
          <Field label="Morada" error={err("address")}>
            {(p) => <Input {...p} {...register("address")} />}
          </Field>
          <Field label="NIF" error={err("taxId")}>
            {(p) => <Input {...p} {...register("taxId")} />}
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="eyebrow mb-3">Responsável</legend>
          <Field label="Nome" error={err("contactName")}>
            {(p) => <Input {...p} {...register("contactName")} placeholder="Pr. João Silva" data-testid="client-contact" />}
          </Field>
          <Field label="Função" error={err("contactRole")}>
            {(p) => <Input {...p} {...register("contactRole")} placeholder="Pastor" />}
          </Field>
          <Field label="Email" error={err("contactEmail")}>
            {(p) => <Input {...p} type="email" {...register("contactEmail")} />}
          </Field>
          <Field label="Telefone / WhatsApp" error={err("contactPhone")}>
            {(p) => <Input {...p} type="tel" {...register("contactPhone")} />}
          </Field>
        </fieldset>

        <Field label="Notas" error={err("notes")}>
          {(p) => <Textarea {...p} {...register("notes")} placeholder="Contexto da igreja, número de membros, cultos transmitidos…" />}
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
