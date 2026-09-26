"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { updateCompanyAction } from "@/lib/actions/settings";
import { companySchema, type CompanyInput } from "@/lib/validation/settings";

const TEXT_FIELDS: { name: keyof CompanyInput; label: string; wide?: boolean }[] = [
  { name: "name", label: "Nome comercial" },
  { name: "legalName", label: "Denominação social" },
  { name: "taxId", label: "NIF" },
  { name: "email", label: "Email" },
  { name: "phone", label: "Telefone" },
  { name: "website", label: "Website" },
  { name: "address", label: "Morada", wide: true },
  { name: "postalCode", label: "Código postal" },
  { name: "city", label: "Cidade" },
  { name: "tagline", label: "Frase da marca", wide: true },
];

export function CompanyForm({ defaults }: { defaults: CompanyInput }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState } = useForm<CompanyInput>({ resolver: zodResolver(companySchema), defaultValues: defaults });

  const submit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await updateCompanyAction(values);
      if (result.ok) toast.success("Dados da empresa atualizados.");
      else toast.error("Não foi possível guardar", result.error);
    }),
  );

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((f) => (
          <Field key={f.name} label={f.label} error={formState.errors[f.name]?.message} className={f.wide ? "sm:col-span-2" : undefined}>
            {(p) => <Input {...p} {...register(f.name)} />}
          </Field>
        ))}
        <Field label="Idioma das propostas" hint="pt-PT, pt-BR ou inglês" error={formState.errors.locale?.message}>
          {(p) => (
            <Select {...p} {...register("locale")}>
              <option value="pt-PT">Português (Portugal)</option>
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English</option>
            </Select>
          )}
        </Field>
        <Field label="Prefixo das propostas" error={formState.errors.proposalPrefix?.message}>
          {(p) => <Input {...p} {...register("proposalPrefix")} className="uppercase" />}
        </Field>
        <Field label="Validade das propostas (dias)" error={formState.errors.proposalValidityDays?.message}>
          {(p) => <Input {...p} inputMode="numeric" {...register("proposalValidityDays", { valueAsNumber: true })} />}
        </Field>
        <Field label="Termos e condições (um por linha)" error={formState.errors.proposalTerms?.message} className="sm:col-span-2">
          {(p) => <Textarea {...p} rows={6} {...register("proposalTerms")} />}
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={pending}>
          Guardar dados
        </Button>
      </div>
    </form>
  );
}
