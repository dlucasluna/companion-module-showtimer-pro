import type { AssetStatus, ContractStatus } from "@prisma/client";
import { FileSignature, HardDrive } from "lucide-react";
import { useCallback, useMemo } from "react";
import { NewAssetButton } from "@/components/assets/asset-form-modal";
import { AssetStatusMenu } from "@/components/assets/asset-status-menu";
import { ContractStatusMenu } from "@/components/contracts/contract-status-menu";
import { PageContainer } from "@/components/layout/app-shell";
import { useSession } from "@/components/layout/session-context";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatMoney } from "@/lib/formatters";
import { ASSET_STATUS, CONTRACT_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { useDemoState } from "../data/store";
import type { AssetRec, ContractRec } from "../data/types";
import { useRouterStore } from "../router";
import { byDateDesc, hrefWith, includesText, SearchBox, useQuery } from "./shared";

const CONTRACT_ORDER = Object.keys(CONTRACT_STATUS);

export function ContractsPage() {
  const session = useSession();
  const state = useDemoState();
  const query = useQuery();
  const raw = query.get("status");
  const status = raw && raw in CONTRACT_STATUS ? (raw as ContractStatus) : null;
  const q = (query.get("q") ?? "").trim();
  const canManage = can(session.role, "contracts.manage");

  const all = useMemo(
    () => Object.values(state.contracts).sort((a, b) => CONTRACT_ORDER.indexOf(a.status) - CONTRACT_ORDER.indexOf(b.status) || byDateDesc(a.createdAt, b.createdAt)),
    [state.contracts],
  );
  const rows = all.filter((c) => (!status || c.status === status) && includesText([c.contractNumber, state.clients[c.clientId]?.name], q));
  const mrr = all.filter((c) => c.status === "ACTIVE").reduce((s, c) => s + c.monthlyPayment, 0);
  const pendingMrr = all.filter((c) => c.status === "AWAITING_INSTALLATION" || c.status === "AWAITING_SIGNATURE").reduce((s, c) => s + c.monthlyPayment, 0);
  const onSearch = useCallback((next: string) => useRouterStore.getState().replace(hrefWith("/contracts", { status, q: next })), [status]);

  const columns: Column<ContractRec>[] = [
    {
      key: "number",
      header: "Contrato",
      cell: (c) => (
        <span className="block">
          <span className="num block font-medium text-fg">{c.contractNumber}</span>
          <span className="block text-small text-fg-3">
            {c.contractMonths} meses{c.version > 1 ? ` · v${c.version}` : ""}
          </span>
        </span>
      ),
    },
    {
      key: "client",
      header: "Cliente",
      cell: (c) => (
        <span className="block">
          <span className="block truncate text-fg">{state.clients[c.clientId]?.name ?? "—"}</span>
          <span className="block text-small text-fg-3">{state.clients[c.clientId]?.city}</span>
        </span>
      ),
    },
    { key: "start", header: "Início", hideBelow: "md", cell: (c) => <span className="num text-small">{formatDate(c.startDate)}</span> },
    { key: "end", header: "Fim", hideBelow: "md", cell: (c) => <span className="num text-small">{formatDate(c.endDate)}</span> },
    { key: "monthly", header: "Mensalidade", align: "right", cell: (c) => <span className="num text-fg">{formatMoney(c.monthlyPayment)}</span> },
    {
      key: "mrr",
      header: "MRR",
      align: "right",
      hideBelow: "lg",
      cell: (c) => <span className={cn("num", c.status === "ACTIVE" ? "text-fg" : "text-fg-3")}>{formatMoney(c.status === "ACTIVE" ? c.monthlyPayment : 0)}</span>,
    },
    { key: "status", header: "Estado", cell: (c) => <StatusBadge kind="contract" status={c.status} /> },
    ...(canManage
      ? [{ key: "actions", header: "", align: "right" as const, cell: (c: ContractRec) => <ContractStatusMenu id={c.id} number={c.contractNumber} status={c.status} /> }]
      : []),
  ];

  return (
    <PageContainer>
      <PageHeader eyebrow="Operações" title="Contratos" description="Contratos de renting, do aceite ao encerramento." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <MetricCard label="MRR ativo" value={formatMoney(mrr)} hint={`${all.filter((c) => c.status === "ACTIVE").length} contratos ativos`} />
        <MetricCard label="MRR a iniciar" value={formatMoney(pendingMrr)} hint="aguardando assinatura ou instalação" />
        <MetricCard label="Encerrados" value={all.filter((c) => c.status === "ENDED").length} hint="renovações possíveis" />
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Filtrar contratos"
          active={status ?? "all"}
          tabs={[
            { value: "all", label: "Todos", count: all.length },
            ...Object.entries(CONTRACT_STATUS).map(([value, meta]) => ({ value, label: meta.label, count: all.filter((c) => c.status === value).length })),
          ]}
          hrefFor={(value) => hrefWith("/contracts", { status: value !== "all" ? value : null, q })}
        />
        <SearchBox value={q} placeholder="Procurar contrato ou igreja…" onSearch={onSearch} />
      </div>
      <DataTable
        caption="Contratos"
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        rowHref={can(session.role, "clients.view") ? (c) => `/clients/${c.clientId}` : undefined}
        empty={<EmptyState icon={FileSignature} title="Nenhum contrato" description="Converta uma proposta aceite para criar o primeiro contrato." />}
      />
    </PageContainer>
  );
}

export function AssetsPage() {
  const session = useSession();
  const state = useDemoState();
  const query = useQuery();
  const raw = query.get("status");
  const status = raw && raw in ASSET_STATUS ? (raw as AssetStatus) : null;
  const q = (query.get("q") ?? "").trim();
  const canManage = can(session.role, "assets.manage");
  const showCost = can(session.role, "internal.view");
  const now = new Date().toISOString();

  const all = useMemo(() => Object.values(state.assets).sort((a, b) => a.assetTag.localeCompare(b.assetTag)), [state.assets]);
  const rows = all.filter(
    (a) =>
      (!status || a.status === status) &&
      includesText([a.assetTag, a.serialNumber, state.products[a.productId]?.name, a.clientId ? state.clients[a.clientId]?.name : null], q),
  );
  const onSearch = useCallback((next: string) => useRouterStore.getState().replace(hrefWith("/assets", { status, q: next })), [status]);

  // Costs are only handed to the form for roles allowed to see them.
  const products = canManage
    ? Object.values(state.products)
        .filter((p) => p.active && (p.type === "HARDWARE" || p.type === "CONSUMABLE"))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((p) => ({
          id: p.id,
          name: p.name,
          ...(showCost ? { internalCost: p.internalCost } : {}),
          variants: p.variants.filter((v) => v.active).map((v) => ({ id: v.id, name: v.name, ...(showCost ? { internalCost: v.internalCost } : {}) })),
        }))
    : [];

  const columns: Column<AssetRec>[] = [
    {
      key: "asset",
      header: "Equipamento",
      cell: (a) => {
        const product = state.products[a.productId];
        const variant = product?.variants.find((v) => v.id === a.variantId);
        return (
          <span className="block">
            <span className="block font-medium text-fg">
              {product?.name ?? "—"}
              {variant && <span className="text-fg-2"> {variant.name}</span>}
            </span>
            <span className="num block text-small text-fg-3">
              {a.assetTag} · {a.serialNumber ?? "sem série"}
            </span>
          </span>
        );
      },
    },
    {
      key: "client",
      header: "Cliente / local",
      cell: (a) => (
        <span className="block text-small">
          <span className="block text-fg">{(a.clientId && state.clients[a.clientId]?.name) || "—"}</span>
          <span className="block text-fg-3">{a.location ?? ""}</span>
        </span>
      ),
    },
    { key: "contract", header: "Contrato", hideBelow: "lg", cell: (a) => <span className="num text-small">{(a.contractId && state.contracts[a.contractId]?.contractNumber) || "—"}</span> },
    { key: "supplier", header: "Fornecedor", hideBelow: "lg", cell: (a) => <span className="text-small">{(a.supplierId && state.suppliers[a.supplierId]?.name) || "—"}</span> },
    { key: "purchase", header: "Compra", hideBelow: "md", cell: (a) => <span className="num text-small">{formatDate(a.purchaseDate)}</span> },
    {
      key: "warranty",
      header: "Garantia",
      hideBelow: "md",
      cell: (a) => <span className={cn("num text-small", a.warrantyUntil && a.warrantyUntil < now ? "text-fg-3 line-through" : "")}>{formatDate(a.warrantyUntil)}</span>,
    },
    ...(showCost
      ? [{ key: "cost", header: "Custo", align: "right" as const, hideBelow: "lg" as const, cell: (a: AssetRec) => <span className="num text-small">{formatMoney(a.purchaseCost)}</span> }]
      : []),
    { key: "status", header: "Estado", cell: (a) => <StatusBadge kind="asset" status={a.status} /> },
    ...(canManage ? [{ key: "actions", header: "", align: "right" as const, cell: (a: AssetRec) => <AssetStatusMenu id={a.id} tag={a.assetTag} status={a.status} /> }] : []),
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
              products={products}
              clients={Object.values(state.clients)
                .map((c) => ({ id: c.id, name: c.name }))
                .sort((a, b) => a.name.localeCompare(b.name))}
              suppliers={Object.values(state.suppliers).map((s) => ({ id: s.id, name: s.name }))}
            />
          )
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Filtrar equipamentos"
          active={status ?? "all"}
          tabs={[
            { value: "all", label: "Todos", count: all.length },
            ...Object.entries(ASSET_STATUS).map(([value, meta]) => ({ value, label: meta.label, count: all.filter((a) => a.status === value).length })),
          ]}
          hrefFor={(value) => hrefWith("/assets", { status: value !== "all" ? value : null, q })}
        />
        <SearchBox value={q} placeholder="Tag, série, produto, igreja…" onSearch={onSearch} />
      </div>
      <DataTable
        caption="Equipamentos"
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        empty={<EmptyState icon={HardDrive} title="Nenhum equipamento" description="Registe as unidades físicas para acompanhar stock, instalações e manutenções." />}
      />
    </PageContainer>
  );
}
