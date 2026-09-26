import type { AssetStatus, Prisma } from "@prisma/client";
import { HardDrive } from "lucide-react";
import type { Metadata } from "next";
import { NewAssetButton } from "@/components/assets/asset-form-modal";
import { AssetStatusMenu } from "@/components/assets/asset-status-menu";
import { PageContainer } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, SearchForm } from "@/components/ui/filter-tabs";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { formatDate, formatMoney } from "@/lib/formatters";
import { ASSET_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Equipamentos" };

export default async function AssetsPage({ searchParams }: PageProps<"/assets">) {
  const session = await requirePagePermission("assets.view");
  const params = await searchParams;
  const status = typeof params.status === "string" && params.status in ASSET_STATUS ? (params.status as AssetStatus) : null;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const canManage = can(session.role, "assets.manage");
  const showCost = can(session.role, "internal.view");
  const companyId = session.companyId;

  const where: Prisma.AssetWhereInput = {
    companyId,
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ assetTag: { contains: q } }, { serialNumber: { contains: q } }, { product: { name: { contains: q } } }, { client: { name: { contains: q } } }] } : {}),
  };

  const [assets, grouped, products, clients, suppliers] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        product: { select: { name: true } },
        variant: { select: { name: true } },
        client: { select: { id: true, name: true } },
        contract: { select: { contractNumber: true } },
        supplier: { select: { name: true } },
      },
      orderBy: { assetTag: "asc" },
    }),
    prisma.asset.groupBy({ by: ["status"], where: { companyId }, _count: true }),
    canManage
      ? prisma.product.findMany({
          where: { companyId, active: true, type: { in: ["HARDWARE", "CONSUMABLE"] } },
          select: { id: true, name: true, internalCost: true, variants: { where: { active: true }, select: { id: true, name: true, internalCost: true } } },
          orderBy: { sortOrder: "asc" },
        })
      : [],
    canManage ? prisma.client.findMany({ where: { companyId }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [],
    canManage ? prisma.supplier.findMany({ where: { companyId }, select: { id: true, name: true } }) : [],
  ]);
  const total = grouped.reduce((sum, g) => sum + g._count, 0);
  const now = new Date();

  type Row = (typeof assets)[number];
  const columns: Column<Row>[] = [
    {
      key: "asset",
      header: "Equipamento",
      cell: (a) => (
        <span className="block">
          <span className="block font-medium text-fg">
            {a.product.name}
            {a.variant && <span className="text-fg-2"> {a.variant.name}</span>}
          </span>
          <span className="num block text-small text-fg-3">
            {a.assetTag} · {a.serialNumber ?? "sem série"}
          </span>
        </span>
      ),
    },
    {
      key: "client",
      header: "Cliente / local",
      cell: (a) => (
        <span className="block text-small">
          <span className="block text-fg">{a.client?.name ?? "—"}</span>
          <span className="block text-fg-3">{a.location ?? ""}</span>
        </span>
      ),
    },
    { key: "contract", header: "Contrato", hideBelow: "lg", cell: (a) => <span className="num text-small">{a.contract?.contractNumber ?? "—"}</span> },
    { key: "supplier", header: "Fornecedor", hideBelow: "lg", cell: (a) => <span className="text-small">{a.supplier?.name ?? "—"}</span> },
    { key: "purchase", header: "Compra", hideBelow: "md", cell: (a) => <span className="num text-small">{formatDate(a.purchaseDate)}</span> },
    {
      key: "warranty",
      header: "Garantia",
      hideBelow: "md",
      cell: (a) => (
        <span className={cn("num text-small", a.warrantyUntil && a.warrantyUntil < now ? "text-fg-3 line-through" : "")}>{formatDate(a.warrantyUntil)}</span>
      ),
    },
    ...(showCost ? [{ key: "cost", header: "Custo", align: "right" as const, hideBelow: "lg" as const, cell: (a: Row) => <span className="num text-small">{formatMoney(a.purchaseCost)}</span> }] : []),
    { key: "status", header: "Estado", cell: (a) => <StatusBadge kind="asset" status={a.status} /> },
    ...(canManage ? [{ key: "actions", header: "", align: "right" as const, cell: (a: Row) => <AssetStatusMenu id={a.id} tag={a.assetTag} status={a.status} /> }] : []),
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Asset management"
        title="Equipamentos"
        description="Cada unidade física, onde está e em que contrato."
        actions={
          canManage && (
            <NewAssetButton
              showCost={showCost}
              products={products.map((p) => ({
                id: p.id,
                name: p.name,
                ...(showCost ? { internalCost: p.internalCost } : {}),
                variants: p.variants.map((v) => ({ id: v.id, name: v.name, ...(showCost ? { internalCost: v.internalCost } : {}) })),
              }))}
              clients={clients}
              suppliers={suppliers}
            />
          )
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Filtrar equipamentos"
          active={status ?? "all"}
          tabs={[
            { value: "all", label: "Todos", count: total },
            ...Object.entries(ASSET_STATUS).map(([value, meta]) => ({ value, label: meta.label, count: grouped.find((g) => g.status === value)?._count ?? 0 })),
          ]}
          hrefFor={(value) => `/assets?${new URLSearchParams({ ...(value !== "all" ? { status: value } : {}), ...(q ? { q } : {}) })}`}
        />
        <SearchForm defaultValue={q} placeholder="Tag, série, produto, igreja…" hidden={status ? { status } : undefined} />
      </div>
      <DataTable
        caption="Equipamentos"
        columns={columns}
        rows={assets}
        rowKey={(a) => a.id}
        empty={<EmptyState icon={HardDrive} title="Nenhum equipamento" description="Registe as unidades físicas para acompanhar stock, instalações e manutenções." />}
      />
    </PageContainer>
  );
}
