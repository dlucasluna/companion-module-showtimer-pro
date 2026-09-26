"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { toggleProductActiveAction } from "@/lib/actions/catalog";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_LABELS, type ProductInput } from "@/lib/validation/product";
import { ProductEditor, emptyProduct } from "./product-editor";

export interface CatalogRow {
  id: string;
  name: string;
  sku: string;
  type: ProductInput["type"];
  categoryId: string;
  imageUrl: string | null;
  description: string | null;
  active: boolean;
  variants: { name: string; cost: number | null; active: boolean }[];
  /** Null for roles without internal.view. */
  cost: number | null;
  referencePrice: number | null;
  /** Full editable payload — only for catalog managers. */
  editable: ProductInput | null;
}

interface CatalogViewProps {
  categories: { id: string; name: string; icon: string | null }[];
  products: CatalogRow[];
  suppliers: { id: string; name: string }[];
  images: string[];
  canManage: boolean;
}

function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(active);
  const [, startTransition] = useTransition();
  return (
    <Switch
      checked={value}
      label={value ? "Ativo" : "Inativo"}
      className="[&>span>span:first-child]:text-small [&>span>span:first-child]:text-fg-2"
      onChange={(next) => {
        setValue(next);
        startTransition(async () => {
          const result = await toggleProductActiveAction(id, next);
          if (!result.ok) {
            setValue(!next);
            toast.error("Não foi possível atualizar", result.error);
          } else router.refresh();
        });
      }}
    />
  );
}

export function CatalogView({ categories, products, suppliers, images, canManage }: CatalogViewProps) {
  const [editing, setEditing] = useState<ProductInput | null>(null);
  const [open, setOpen] = useState(false);

  const openEditor = (product: ProductInput | null) => {
    setEditing(product ?? emptyProduct(categories[0]?.id ?? ""));
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Equipamentos e serviços"
        description="Tudo o que pode entrar numa proposta. Os custos vêm daqui — nunca de valores fixos no código."
        actions={
          canManage && (
            <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => openEditor(null)}>
              Novo produto
            </Button>
          )
        }
      />
      <div className="space-y-8">
        {categories.map((category) => {
          const rows = products.filter((p) => p.categoryId === category.id);
          if (rows.length === 0) return null;
          return (
            <section key={category.id} aria-labelledby={`cat-${category.id}`}>
              <h2 id={`cat-${category.id}`} className="mb-3 flex items-center gap-2 text-[1rem] font-semibold text-fg">
                <CategoryIcon name={category.icon} className="size-4 text-fg-2" /> {category.name}
                <span className="num text-small font-normal text-fg-3">{rows.length}</span>
              </h2>
              <div className="edge surface divide-y divide-white/[0.05] overflow-hidden rounded-card">
                {rows.map((product) => (
                  <div key={product.id} className={cn("flex flex-wrap items-center gap-4 px-4 py-3 sm:flex-nowrap sm:px-5", !product.active && "opacity-55")}>
                    <div className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
                      {product.imageUrl && <Image src={product.imageUrl} alt="" fill sizes="48px" className="object-contain p-1.5" unoptimized />}
                    </div>
                    <button
                      type="button"
                      disabled={!product.editable}
                      onClick={() => openEditor(product.editable)}
                      className="min-w-0 flex-1 text-left disabled:cursor-default"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[0.9375rem] font-medium text-fg">{product.name}</span>
                        <Badge tone="muted">{PRODUCT_TYPE_LABELS[product.type]}</Badge>
                      </span>
                      <span className="num block truncate text-small text-fg-3">
                        {product.sku}
                        {product.variants.length > 0 && ` · ${product.variants.filter((v) => v.active).map((v) => v.name).join(" / ")}`}
                      </span>
                    </button>
                    {product.cost !== null && (
                      <div className="num w-44 shrink-0 text-right text-small">
                        <span className="block text-fg">
                          {product.variants.length > 0
                            ? product.variants
                                .filter((v) => v.active && v.cost !== null)
                                .map((v) => formatMoney(v.cost!))
                                .join(" · ")
                            : formatMoney(product.cost)}
                        </span>
                        <span className="block text-fg-3">custo interno</span>
                      </div>
                    )}
                    {canManage && (
                      <div className="shrink-0">
                        <ActiveToggle id={product.id} active={product.active} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {canManage && <ProductEditor open={open} onOpenChange={setOpen} product={editing} categories={categories} suppliers={suppliers} images={images} />}
    </>
  );
}
