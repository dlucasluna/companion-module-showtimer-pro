import type { Prisma, ProposalStatus } from "@prisma/client";
import { FilePlus2, FileText } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { InternalOnly } from "@/components/layout/internal-only";
import { ProposalRowActions } from "@/components/proposals/proposal-row-actions";
import { ButtonLink } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, SearchForm } from "@/components/ui/filter-tabs";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { loadPricingRules } from "@/lib/database/pricing";
import { prisma } from "@/lib/database/prisma";
import { formatMoney, formatPercent, formatRelative } from "@/lib/formatters";
import { OPEN_PROPOSAL_STATUSES } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Propostas" };

const FILTERS: Record<string, { label: string; statuses?: ProposalStatus[] }> = {
  all: { label: "Todas" },
  open: { label: "Em aberto", statuses: OPEN_PROPOSAL_STATUSES },
  won: { label: "Ganhas", statuses: ["ACCEPTED", "CONVERTED"] },
  lost: { label: "Perdidas", statuses: ["REJECTED", "EXPIRED"] },
};

export default async function ProposalsPage({ searchParams }: PageProps<"/proposals">) {
  const session = await requirePagePermission("proposals.view");
  const params = await searchParams;
  const filter = typeof params.status === "string" && params.status in FILTERS ? params.status : "all";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const showInternal = can(session.role, "internal.view");
  const canManage = can(session.role, "proposals.manage");

  const base: Prisma.ProposalWhereInput = { companyId: session.companyId };
  const where: Prisma.ProposalWhereInput = {
    ...base,
    ...(FILTERS[filter]?.statuses ? { status: { in: FILTERS[filter].statuses } } : {}),
    ...(q ? { OR: [{ proposalNumber: { contains: q } }, { title: { contains: q } }, { client: { name: { contains: q } } }] } : {}),
  };

  const [proposals, counts, { rules }] = await Promise.all([
    prisma.proposal.findMany({
      where,
      include: { client: { select: { name: true, city: true } }, createdBy: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    Promise.all(Object.entries(FILTERS).map(async ([key, f]) => [key, await prisma.proposal.count({ where: { ...base, ...(f.statuses ? { status: { in: f.statuses } } : {}) } })] as const)),
    loadPricingRules(session.companyId),
  ]);
  const countMap = Object.fromEntries(counts);

  type Row = (typeof proposals)[number];
  const columns: Column<Row>[] = [
    {
      key: "client",
      header: "Proposta",
      cell: (p) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-fg">{p.client.name}</span>
          <span className="num block truncate text-small text-fg-3">
            {p.proposalNumber} · {p.title}
          </span>
        </span>
      ),
    },
    { key: "status", header: "Estado", cell: (p) => <StatusBadge kind="proposal" status={p.status} /> },
    {
      key: "monthly",
      header: "Mensalidade",
      align: "right",
      cell: (p) => (
        <span className="num">
          <span className="font-medium text-fg">{formatMoney(p.monthlyPayment)}</span>
          <span className="block text-small text-fg-3">
            {formatMoney(p.initialPayment)} · {p.contractMonths}m
          </span>
        </span>
      ),
    },
    ...(showInternal
      ? [
          {
            key: "margin",
            header: "Margem",
            align: "right" as const,
            hideBelow: "lg" as const,
            cell: (p: Row) => (
              <InternalOnly>
                <span className={cn("num", p.grossMargin < rules.minMarginPercent ? "text-warning" : "text-fg-2")}>{formatPercent(p.grossMargin)}</span>
              </InternalOnly>
            ),
          },
        ]
      : []),
    { key: "updated", header: "Atualizada", hideBelow: "md", cell: (p) => <span className="text-small">{formatRelative(p.updatedAt)}</span> },
    { key: "owner", header: "Responsável", hideBelow: "lg", cell: (p) => <span className="text-small">{p.createdBy?.name ?? "—"}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => <ProposalRowActions id={p.id} number={p.proposalNumber} canManage={canManage} editable={p.status !== "CONVERTED"} />,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Comercial"
        title="Propostas"
        description="Todas as propostas, do rascunho à assinatura."
        actions={
          canManage && (
            <ButtonLink href="/proposals/new" variant="primary" leftIcon={<FilePlus2 className="size-4" />}>
              Nova proposta
            </ButtonLink>
          )
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Filtrar propostas"
          active={filter}
          tabs={Object.entries(FILTERS).map(([value, f]) => ({ value, label: f.label, count: countMap[value] }))}
          hrefFor={(value) => `/proposals?${new URLSearchParams({ ...(value !== "all" ? { status: value } : {}), ...(q ? { q } : {}) })}`}
        />
        <SearchForm defaultValue={q} placeholder="Procurar igreja ou número…" hidden={filter !== "all" ? { status: filter } : undefined} />
      </div>
      <DataTable
        caption="Lista de propostas"
        columns={columns}
        rows={proposals}
        rowKey={(p) => p.id}
        rowHref={(p) => (canManage && p.status !== "CONVERTED" ? `/proposals/${p.id}` : `/proposals/${p.id}/preview`)}
        empty={
          <EmptyState
            icon={FileText}
            title={q || filter !== "all" ? "Nenhuma proposta encontrada" : "Nenhuma proposta ainda."}
            description={q || filter !== "all" ? "Ajuste a pesquisa ou o filtro." : "Crie sua primeira proposta e monte um sistema personalizado para uma igreja."}
            action={
              canManage && (
                <ButtonLink href="/proposals/new" variant="primary" leftIcon={<FilePlus2 className="size-4" />}>
                  Nova proposta
                </ButtonLink>
              )
            }
          />
        }
      />
    </PageContainer>
  );
}
