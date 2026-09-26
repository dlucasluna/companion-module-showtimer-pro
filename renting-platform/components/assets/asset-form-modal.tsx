"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { createAssetAction, type AssetInput } from "@/lib/actions/operations";
import { ASSET_STATUS } from "@/lib/status";

interface ProductOption {
  id: string;
  name: string;
  /** Only present for roles allowed to see internal costs. */
  internalCost?: number;
  variants: { id: string; name: string; internalCost?: number }[];
}

export function NewAssetButton({
  products,
  clients,
  suppliers,
  showCost,
}: {
  products: ProductOption[];
  clients: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  showCost: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const first = products[0];
  const [form, setForm] = useState<AssetInput>({
    productId: first?.id ?? "",
    variantId: first?.variants[0]?.id ?? null,
    serialNumber: "",
    supplierId: null,
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseCost: first?.variants[0]?.internalCost ?? first?.internalCost,
    status: "STOCK",
    clientId: null,
    location: "Armazém Lisboa",
  });
  const product = products.find((p) => p.id === form.productId);
  const set = (patch: Partial<AssetInput>) => setForm((f) => ({ ...f, ...patch }));

  function submit() {
    startTransition(async () => {
      const result = await createAssetAction(form);
      if (result.ok) {
        toast.success("Equipamento registado.");
        setOpen(false);
        router.refresh();
      } else toast.error("Não foi possível registar", result.error);
    });
  }

  return (
    <>
      <Button variant="primary" leftIcon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
        Registar equipamento
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Registar equipamento"
        description="Cada unidade física é um ativo individual com número de série."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={submit} loading={pending}>
              Registar
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="asset-product">Produto</Label>
            <Select
              id="asset-product"
              value={form.productId}
              onChange={(e) => {
                const next = products.find((p) => p.id === e.target.value);
                set({ productId: e.target.value, variantId: next?.variants[0]?.id ?? null, purchaseCost: next?.variants[0]?.internalCost ?? next?.internalCost });
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="asset-variant">Variante</Label>
            <Select
              id="asset-variant"
              value={form.variantId ?? ""}
              disabled={!product?.variants.length}
              onChange={(e) => {
                const variant = product?.variants.find((v) => v.id === e.target.value);
                set({ variantId: e.target.value || null, purchaseCost: variant?.internalCost ?? form.purchaseCost });
              }}
            >
              {!product?.variants.length && <option value="">—</option>}
              {product?.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="asset-serial">Número de série</Label>
            <Input id="asset-serial" value={form.serialNumber} onChange={(e) => set({ serialNumber: e.target.value })} placeholder="ABC123" />
          </div>
          <div>
            <Label htmlFor="asset-supplier">Fornecedor</Label>
            <Select id="asset-supplier" value={form.supplierId ?? ""} onChange={(e) => set({ supplierId: e.target.value || null })}>
              <option value="">Fornecedor do produto</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="asset-date">Data de compra</Label>
            <Input id="asset-date" type="date" value={form.purchaseDate} onChange={(e) => set({ purchaseDate: e.target.value })} />
          </div>
          {showCost && (
            <div>
              <Label>Custo de compra</Label>
              <MoneyInput aria-label="Custo de compra" value={form.purchaseCost ?? null} onCommit={(cents) => set({ purchaseCost: cents ?? 0 })} />
            </div>
          )}
          <div>
            <Label htmlFor="asset-status">Estado</Label>
            <Select id="asset-status" value={form.status} onChange={(e) => set({ status: e.target.value as AssetInput["status"] })}>
              {Object.entries(ASSET_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="asset-client">Cliente atual</Label>
            <Select id="asset-client" value={form.clientId ?? ""} onChange={(e) => set({ clientId: e.target.value || null })}>
              <option value="">Nenhum (em stock)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="asset-location">Local</Label>
            <Input id="asset-location" value={form.location} onChange={(e) => set({ location: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  );
}
