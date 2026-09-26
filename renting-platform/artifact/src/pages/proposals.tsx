import type { ProposalStatus } from "@prisma/client";
import { FilePlus2, FileText } from "lucide-react";
import { useCallback, useMemo } from "react";
import { PageContainer } from "@/components/layout/app-shell";
import { InternalOnly } from "@/components/layout/internal-only";
import { useSession } from "@/components/layout/session-context";
import { ProposalRowActions } from "@/components/proposals/proposal-row-actions";
import { ButtonLink } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { formatMoney, formatPercent, formatRelative } from "@/lib/formatters";
import { OPEN_PROPOSAL_STATUSES } from "@/lib/status";
import { cn } from "@/lib/utils";
import { rulesFor } from "../data/derive";
import { useDemoState } from "../data/store";
import type { ProposalRec } from "../data/types";
import { useRouterStore } from "../router";
import { byDateDesc, hrefWith, includesText, SearchBox, useQuery } from "./shared";

const FILTERS: Record<string, { label: string; statuses?: ProposalStatus[] }> = {
  all: { label: "Todas" },
  open: { label: "Em aberto", statuses: OPEN_PROPOSAL_STATUSES },
  won: { label: "Ganhas", statuses: ["ACCEPTED", "CONVERTED"] },
  lost: { label: "Perdidas", statuses: ["REJECTED", "EXPIRED"] },
};

export function ProposalsPage() {
  const session = useSession();
  const state = useDemoState();
  const query = useQuery();
  const filter = query.get("status") && query.get("status")! in FILTERS ? query.get("status")! : "all";
  const q = (query.get("q") ?? "").trim();
  const showInternal = can(session.role, "internal.view");
  const canManage = can(session.role, "proposals.manage");
  const { rules } = rulesFor(state);

  const all = useMemo(() => Object.values(state.proposals).sort((a, b) => byDateDesc(a.updatedAt, b.updatedAt)), [state.proposals]);
  const matches = (p: ProposalRec, key: string) => !FILTERS[key]?.statuses || FILTERS[key]!.statuses!.includes(p.status);
  const rows = all.filter((p) => matches(p, filter) && includesText([p.proposalNumber, p.title, state.clients[p.clientId]?.name], q));

  const onSearch = useCallback((next: string) => useRouterStore.getState().replace(hrefWith("/proposals", { status: filter !== "all" ? filter : null, q: next })), [filter]);

  const columns: Column<ProposalRec>[] = [
    {
      key: "client",
      header: "Proposta",
      cell: (p) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-fg">{state.clients[p.clientId]?.name ?? "—"}</span>
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
            cell: (p: ProposalRec) => (
              <InternalOnly>
                <span className={cn("num", p.grossMargin < rules.minMarginPercent ? "text-warning" : "text-fg-2")}>{formatPercent(p.grossMargin)}</span>
              </InternalOnly>
            ),
          },
        ]
      : []),
    { key: "updated", header: "Atualizada", hideBelow: "md", cell: (p) => <span className="text-small">{formatRelative(p.updatedAt)}</span> },
    { key: "owner", header: "Responsável", hideBelow: "lg", cell: (p) => <span className="text-small">{(p.createdById && state.users[p.createdById]?.name) ?? "—"}</span> },
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
          tabs={Object.entries(FILTERS).map(([value, f]) => ({ value, label: f.label, count: all.filter((p) => matches(p, value)).length }))}
          hrefFor={(value) => hrefWith("/proposals", { status: value !== "all" ? value : null, q })}
        />
        <SearchBox value={q} placeholder="Procurar igreja ou número…" onSearch={onSearch} />
      </div>
      <DataTable
        caption="Lista de propostas"
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        rowHref={(p) => (canManage && showInternal && p.status !== "CONVERTED" ? `/proposals/${p.id}` : `/proposals/${p.id}/preview`)}
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
