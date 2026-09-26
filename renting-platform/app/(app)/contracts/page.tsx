import type { ContractStatus, Prisma } from "@prisma/client";
import { FileSignature } from "lucide-react";
import type { Metadata } from "next";
import { ContractStatusMenu } from "@/components/contracts/contract-status-menu";
import { PageContainer } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, SearchForm } from "@/components/ui/filter-tabs";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { formatDate, formatMoney } from "@/lib/formatters";
import { CONTRACT_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contratos" };

export default async function ContractsPage({ searchParams }: PageProps<"/contracts">) {
  const session = await requirePagePermission("contracts.view");
  const params = await searchParams;
  const status = typeof params.status === "string" && params.status in CONTRACT_STATUS ? (params.status as ContractStatus) : null;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const canManage = can(session.role, "contracts.manage");

  const where: Prisma.ContractWhereInput = {
    companyId: session.companyId,
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ contractNumber: { contains: q } }, { client: { name: { contains: q } } }] } : {}),
  };
  const [contracts, all] = await Promise.all([
    prisma.contract.findMany({ where, include: { client: { select: { id: true, name: true, city: true } } }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
    prisma.contract.findMany({ where: { companyId: session.companyId }, select: { status: true, monthlyPayment: true, contractMonths: true, initialPayment: true } }),
  ]);
  const mrr = all.filter((c) => c.status === "ACTIVE").reduce((s, c) => s + c.monthlyPayment, 0);
  const pendingMrr = all.filter((c) => c.status === "AWAITING_INSTALLATION" || c.status === "AWAITING_SIGNATURE").reduce((s, c) => s + c.monthlyPayment, 0);

  type Row = (typeof contracts)[number];
  const columns: Column<Row>[] = [
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
          <span className="block truncate text-fg">{c.client.name}</span>
          <span className="block text-small text-fg-3">{c.client.city}</span>
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
    ...(canManage ? [{ key: "actions", header: "", align: "right" as const, cell: (c: Row) => <ContractStatusMenu id={c.id} number={c.contractNumber} status={c.status} /> }] : []),
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
          hrefFor={(value) => `/contracts?${new URLSearchParams({ ...(value !== "all" ? { status: value } : {}), ...(q ? { q } : {}) })}`}
        />
        <SearchForm defaultValue={q} placeholder="Procurar contrato ou igreja…" hidden={status ? { status } : undefined} />
      </div>
      <DataTable
        caption="Contratos"
        columns={columns}
        rows={contracts}
        rowKey={(c) => c.id}
        rowHref={(c) => `/clients/${c.client.id}`}
        empty={<EmptyState icon={FileSignature} title="Nenhum contrato" description="Converta uma proposta aceite para criar o primeiro contrato." />}
      />
    </PageContainer>
  );
}
