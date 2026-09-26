"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { MoneyInput, PercentInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { saveProductAction } from "@/lib/actions/catalog";
import { PRODUCT_TYPES, PRODUCT_TYPE_LABELS, productSchema, type ProductInput } from "@/lib/validation/product";

interface ProductEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductInput | null;
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  images: string[];
}

export function emptyProduct(categoryId: string): ProductInput {
  return {
    name: "",
    categoryId,
    type: "HARDWARE",
    brand: "",
    model: "",
    sku: "",
    description: "",
    salesDescription: "",
    benefit: "",
    internalCost: 0,
    referencePrice: null,
    supplierId: null,
    imageUrl: "",
    warrantyMonths: 24,
    expectedLifeMonths: 60,
    defaultResidualPercent: 0.15,
    maxQuantity: null,
    active: true,
    notes: "",
    variants: [],
  };
}

const intOrNull = (value: string) => (value.trim() === "" ? null : Math.max(0, Number.parseInt(value, 10) || 0));

export function ProductEditor({ open, onOpenChange, product, categories, suppliers, images }: ProductEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    values: product ?? emptyProduct(categories[0]?.id ?? ""),
  });
  const { register, control, handleSubmit, formState, watch } = form;
  const variants = useFieldArray({ control, name: "variants" });
  const err = (name: keyof ProductInput) => formState.errors[name]?.message as string | undefined;
  const imageUrl = watch("imageUrl");

  const submit = handleSubmit(
    (values) =>
      startTransition(async () => {
        const result = await saveProductAction(values);
        if (result.ok) {
          toast.success(values.id ? "Produto atualizado." : "Produto criado.", values.name);
          onOpenChange(false);
          router.refresh();
        } else toast.error("Não foi possível guardar", result.error);
      }),
    () => toast.error("Verifique os campos assinalados."),
  );

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={product?.id ? "Editar produto" : "Novo produto"}
      description="Custos internos nunca aparecem ao cliente."
      width="sm:max-w-[620px]"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={pending}>
            Guardar produto
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-8" noValidate>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="eyebrow mb-3">Identificação</legend>
          <Field label="Nome" error={err("name")} className="sm:col-span-2">
            {(p) => <Input {...p} {...register("name")} />}
          </Field>
          <Field label="Categoria" error={err("categoryId")}>
            {(p) => (
              <Select {...p} {...register("categoryId")}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Tipo" error={err("type")}>
            {(p) => (
              <Select {...p} {...register("type")}>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PRODUCT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="SKU" error={err("sku")}>
            {(p) => <Input {...p} {...register("sku")} className="uppercase" />}
          </Field>
          <Field label="Fornecedor" error={err("supplierId")}>
            {(p) => (
              <Controller
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <Select {...p} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)}>
                    <option value="">—</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                )}
              />
            )}
          </Field>
          <Field label="Marca" error={err("brand")}>
            {(p) => <Input {...p} {...register("brand")} />}
          </Field>
          <Field label="Modelo" error={err("model")}>
            {(p) => <Input {...p} {...register("model")} />}
          </Field>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="eyebrow mb-3">Comercial</legend>
          <Field label="Descrição curta (cards do configurador)" error={err("description")}>
            {(p) => <Input {...p} {...register("description")} />}
          </Field>
          <Field label="Benefício" error={err("benefit")}>
            {(p) => <Input {...p} {...register("benefit")} placeholder="Planos profissionais com apenas um operador." />}
          </Field>
          <Field label="Descrição comercial (proposta)" error={err("salesDescription")}>
            {(p) => <Textarea {...p} {...register("salesDescription")} />}
          </Field>
          <div>
            <Label>Imagem</Label>
            <div className="flex items-center gap-3">
              <div className="relative grid size-14 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
                {imageUrl && <Image src={imageUrl} alt="" fill sizes="56px" className="object-contain p-1.5" unoptimized />}
              </div>
              <Select {...register("imageUrl")} aria-label="Imagem do produto">
                <option value="">Sem imagem</option>
                {images.map((src) => (
                  <option key={src} value={src}>
                    {src.replace("/products/", "")}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="eyebrow mb-3">Custos e ciclo de vida (interno)</legend>
          <Field label="Custo interno" error={err("internalCost")}>
            {(p) => <Controller control={control} name="internalCost" render={({ field }) => <MoneyInput {...p} value={field.value} onCommit={(c) => field.onChange(c ?? 0)} />} />}
          </Field>
          <Field label="Preço de referência" error={err("referencePrice")}>
            {(p) => <Controller control={control} name="referencePrice" render={({ field }) => <MoneyInput {...p} value={field.value} onCommit={field.onChange} />} />}
          </Field>
          <Field label="Garantia (meses)" error={err("warrantyMonths")}>
            {(p) => <Controller control={control} name="warrantyMonths" render={({ field }) => <Input {...p} inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(intOrNull(e.target.value))} />} />}
          </Field>
          <Field label="Vida útil estimada (meses)" error={err("expectedLifeMonths")}>
            {(p) => <Controller control={control} name="expectedLifeMonths" render={({ field }) => <Input {...p} inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(intOrNull(e.target.value))} />} />}
          </Field>
          <Field label="Valor residual mínimo" error={err("defaultResidualPercent")}>
            {(p) => (
              <Controller control={control} name="defaultResidualPercent" render={({ field }) => <PercentInput {...p} value={field.value ?? 0} onCommit={field.onChange} />} />
            )}
          </Field>
          <Field label="Quantidade máxima" hint="1 = item único (ex.: instalação)" error={err("maxQuantity")}>
            {(p) => <Controller control={control} name="maxQuantity" render={({ field }) => <Input {...p} inputMode="numeric" value={field.value ?? ""} onChange={(e) => field.onChange(intOrNull(e.target.value) || null)} />} />}
          </Field>
        </fieldset>

        <fieldset>
          <legend className="eyebrow mb-3">Variantes</legend>
          <p className="mb-3 text-small text-fg-3">Ex.: PTZ Standard / NDI / 4K. Cada variante tem o seu custo. Sem variantes, usa-se o custo do produto.</p>
          <div className="space-y-3">
            {variants.fields.map((field, index) => (
              <div key={field.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Input aria-label="Nome da variante" placeholder="Nome" {...register(`variants.${index}.name`)} />
                  <Input aria-label="SKU da variante" placeholder="SKU" className="uppercase" {...register(`variants.${index}.sku`)} />
                  <Button variant="ghost" size="icon" aria-label="Remover variante" onClick={() => variants.remove(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                  <Controller
                    control={control}
                    name={`variants.${index}.internalCost`}
                    render={({ field: f }) => <MoneyInput aria-label="Custo interno da variante" value={f.value} onCommit={(c) => f.onChange(c ?? 0)} suffix="custo" />}
                  />
                  <Controller
                    control={control}
                    name={`variants.${index}.referencePrice`}
                    render={({ field: f }) => <MoneyInput aria-label="Preço de referência da variante" value={f.value} onCommit={f.onChange} suffix="ref." />}
                  />
                  <span />
                  <Input aria-label="Descrição da variante" placeholder="Descrição" className="sm:col-span-2" {...register(`variants.${index}.description`)} />
                  <span />
                  <Input aria-label="Benefício da variante" placeholder="Benefício" className="sm:col-span-2" {...register(`variants.${index}.benefit`)} />
                </div>
                <div className="mt-3 flex gap-6">
                  <Controller control={control} name={`variants.${index}.isDefault`} render={({ field: f }) => <Switch checked={f.value} onChange={f.onChange} label="Predefinida" />} />
                  <Controller control={control} name={`variants.${index}.active`} render={({ field: f }) => <Switch checked={f.value} onChange={f.onChange} label="Ativa" />} />
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="size-4" />}
              onClick={() => variants.append({ name: "", sku: "", description: "", benefit: "", internalCost: 0, referencePrice: null, isDefault: variants.fields.length === 0, active: true })}
            >
              Adicionar variante
            </Button>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="eyebrow mb-3">Estado</legend>
          <Controller control={control} name="active" render={({ field }) => <Switch checked={field.value} onChange={field.onChange} label="Ativo no configurador" description="Produtos inativos não aparecem em novas propostas." />} />
          <Field label="Observações internas" error={err("notes")}>
            {(p) => <Textarea {...p} {...register("notes")} />}
          </Field>
        </fieldset>
        <button type="submit" className="hidden" />
      </form>
    </Drawer>
  );
}
