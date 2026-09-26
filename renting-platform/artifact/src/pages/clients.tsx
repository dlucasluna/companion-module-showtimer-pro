import type { ClientStatus } from "@prisma/client";
import { ArrowLeft, FilePlus2, FileText, FolderOpen, HardDrive, Mail, MapPin, Phone, Users, Wrench } from "lucide-react";
import { useCallback, useMemo, type ReactNode } from "react";
import { EditClientButton, NewClientButton } from "@/components/clients/client-actions";
import { PageContainer } from "@/components/layout/app-shell";
import { useSession } from "@/components/layout/session-context";
import { ButtonLink } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { MetricCard } from "@/components/ui/metric-card";
import { Avatar, PageHeader, SectionTitle } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatMoney, formatRelative } from "@/lib/formatters";
import { CLIENT_STATUS } from "@/lib/status";
import { variantDisplayName } from "@/lib/proposals/snapshot";
import Link from "../shims/next-link";
import { useDemoState } from "../data/store";
import type { ClientRec, ContractRec } from "../data/types";
import { useRouterStore } from "../router";
import { byDateDesc, hrefWith, includesText, NotFoundPage, SearchBox, useQuery } from "./shared";

const primaryContact = (client: ClientRec) => [...client.contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))[0];

export function ClientsPage() {
  const session = useSession();
  const state = useDemoState();
  const query = useQuery();
  const raw = query.get("status");
  const status = raw && raw in CLIENT_STATUS ? (raw as ClientStatus) : null;
  const q = (query.get("q") ?? "").trim();

  const all = useMemo(
    () => Object.values(state.clients).sort((a, b) => byDateDesc(a.lastInteractionAt, b.lastInteractionAt) || a.name.localeCompare(b.name)),
    [state.clients],
  );
  const contractsByClient = useMemo(() => {
    const map = new Map<string, ContractRec[]>();
    for (const c of Object.values(state.contracts)) map.set(c.clientId, [...(map.get(c.clientId) ?? []), c]);
    return map;
  }, [state.contracts]);
  const rows = all.filter((c) => (!status || c.status === status) && includesText([c.name, c.city, ...c.contacts.map((k) => k.name)], q));
  const onSearch = useCallback((next: string) => useRouterStore.getState().replace(hrefWith("/clients", { status, q: next })), [status]);

  const columns: Column<ClientRec>[] = [
    {
      key: "name",
      header: "Igreja",
      cell: (c) => (
        <span className="flex items-center gap-3">
          <Avatar name={c.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-fg">{c.name}</span>
            <span className="block truncate text-small text-fg-3">{primaryContact(c)?.name ?? "—"}</span>
          </span>
        </span>
      ),
    },
    { key: "city", header: "Cidade", hideBelow: "md", cell: (c) => c.city ?? "—" },
    {
      key: "contact",
      header: "Contacto",
      hideBelow: "lg",
      cell: (c) => (
        <span className="text-small">
          <span className="block">{primaryContact(c)?.phone ?? c.phone ?? "—"}</span>
          <span className="block text-fg-3">{primaryContact(c)?.email ?? c.email ?? ""}</span>
        </span>
      ),
    },
    { key: "status", header: "Estado", cell: (c) => <StatusBadge kind="client" status={c.status} /> },
    {
      key: "contracts",
      header: "Contratos",
      align: "right",
      hideBelow: "md",
      cell: (c) => <span className="num">{(contractsByClient.get(c.id) ?? []).filter((k) => k.status !== "ENDED").length}</span>,
    },
    {
      key: "mrr",
      header: "MRR",
      align: "right",
      cell: (c) => (
        <span className="num font-medium text-fg">
          {formatMoney((contractsByClient.get(c.id) ?? []).filter((k) => k.status === "ACTIVE").reduce((sum, k) => sum + k.monthlyPayment, 0))}
        </span>
      ),
    },
    { key: "last", header: "Última interação", hideBelow: "lg", cell: (c) => <span className="text-small">{formatRelative(c.lastInteractionAt)}</span> },
  ];

  return (
    <PageContainer>
      <PageHeader eyebrow="CRM" title="Clientes" description="Igrejas, responsáveis e contratos." actions={can(session.role, "clients.manage") && <NewClientButton />} />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Filtrar clientes"
          active={status ?? "all"}
          tabs={[
            { value: "all", label: "Todos", count: all.length },
            ...Object.entries(CLIENT_STATUS).map(([value, meta]) => ({ value, label: meta.label, count: all.filter((c) => c.status === value).length })),
          ]}
          hrefFor={(value) => hrefWith("/clients", { status: value !== "all" ? value : null, q })}
        />
        <SearchBox value={q} placeholder="Procurar igreja, cidade, pastor…" onSearch={onSearch} />
      </div>
      <DataTable
        caption="Clientes"
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        rowHref={(c) => `/clients/${c.id}`}
        empty={<EmptyState icon={Users} title="Nenhum cliente encontrado" description="Crie o primeiro cliente para começar a montar propostas." />}
      />
    </PageContainer>
  );
}

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;

/** Entradas + mensalidades already billed (month of start counts). */
function accumulatedRevenue(contracts: ContractRec[], now: number = Date.now()): number {
  return contracts.reduce((sum, c) => {
    if (!c.startDate || c.status === "AWAITING_SIGNATURE") return sum;
    const elapsed = Math.min(c.contractMonths, Math.max(0, Math.floor((now - Date.parse(c.startDate)) / MONTH_MS) + 1));
    return sum + c.initialPayment + c.monthlyPayment * elapsed;
  }, 0);
}

function Panel({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="edge surface rounded-card p-5 sm:p-6">
      <SectionTitle title={title} description={description} actions={action} />
      {children}
    </section>
  );
}

export function ClientProfilePage({ id }: { id: string }) {
  const session = useSession();
  const state = useDemoState();
  const client = state.clients[id];
  if (!client) return <NotFoundPage what="Cliente" />;

  const proposals = Object.values(state.proposals)
    .filter((p) => p.clientId === id)
    .sort((a, b) => byDateDesc(a.updatedAt, b.updatedAt));
  const contracts = Object.values(state.contracts)
    .filter((c) => c.clientId === id)
    .sort((a, b) => byDateDesc(a.createdAt, b.createdAt));
  const assets = Object.values(state.assets)
    .filter((a) => a.clientId === id)
    .sort((a, b) => a.assetTag.localeCompare(b.assetTag));
  const history = proposals
    .flatMap((p) => p.history)
    .sort((a, b) => byDateDesc(a.updatedAt, b.updatedAt))
    .slice(0, 12);

  const mrr = contracts.filter((c) => c.status === "ACTIVE").reduce((sum, c) => sum + c.monthlyPayment, 0);
  const primary = primaryContact(client);
  const canManageClient = can(session.role, "clients.manage");
  const canPropose = can(session.role, "proposals.manage");
  const canConfigure = canPropose && can(session.role, "internal.view");

  return (
    <PageContainer>
      <Link href="/clients" className="mb-6 inline-flex items-center gap-1.5 text-small text-fg-2 hover:text-fg">
        <ArrowLeft className="size-4" /> Clientes
      </Link>

      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={client.name} size="lg" className="size-16 text-[1.25rem]" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h2 text-fg sm:text-h1">{client.name}</h1>
              <StatusBadge kind="client" status={client.status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-small text-fg-2">
              {primary && (
                <span>
                  {primary.name}
                  {primary.role && <span className="text-fg-3"> · {primary.role}</span>}
                </span>
              )}
              {client.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {client.city}
                </span>
              )}
              {(primary?.phone ?? client.phone) && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" /> {primary?.phone ?? client.phone}
                </span>
              )}
              {(primary?.email ?? client.email) && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" /> {primary?.email ?? client.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageClient && (
            <EditClientButton
              clientId={client.id}
              defaults={{
                name: client.name,
                city: client.city ?? "",
                email: client.email ?? "",
                phone: client.phone ?? "",
                address: client.address ?? "",
                postalCode: client.postalCode ?? "",
                taxId: client.taxId ?? "",
                status: client.status,
                notes: client.notes ?? "",
                contactName: primary?.name ?? "",
                contactRole: primary?.role ?? "",
                contactEmail: primary?.email ?? "",
                contactPhone: primary?.phone ?? "",
              }}
            />
          )}
          {canPropose && (
            <ButtonLink href={`/proposals/new?client=${client.id}`} variant="primary" leftIcon={<FilePlus2 className="size-4" />}>
              Nova proposta
            </ButtonLink>
          )}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="MRR" value={formatMoney(mrr)} hint="mensalidade ativa" />
        <MetricCard label="Receita acumulada" value={formatMoney(accumulatedRevenue(contracts), { decimals: 0 })} hint="entradas + mensalidades faturadas" />
        <MetricCard label="Contratos" value={contracts.length} hint={`${contracts.filter((c) => c.status === "ACTIVE").length} ativos`} />
        <MetricCard label="Equipamentos" value={assets.length} hint={`${assets.filter((a) => a.status === "INSTALLED").length} instalados`} />
      </div>

      <div className="mt-6 grid gap-3 xl:grid-cols-2">
        <Panel title="Propostas" description={`${proposals.length} no total`}>
          {proposals.length === 0 ? (
            <EmptyState compact icon={FileText} title="Sem propostas" description="Monte o primeiro sistema para esta igreja." />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {proposals.map((p) => (
                <li key={p.id}>
                  <Link
                    href={p.status === "CONVERTED" || !canConfigure ? `/proposals/${p.id}/preview` : `/proposals/${p.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition hover:opacity-80"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.875rem] font-medium text-fg">
                        {p.proposalNumber} · {p.title}
                      </span>
                      <span className="block text-small text-fg-3">Atualizada {formatRelative(p.updatedAt)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="num text-small text-fg">{formatMoney(p.monthlyPayment)}/mês</span>
                      <StatusBadge kind="proposal" status={p.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Contratos">
          {contracts.length === 0 ? (
            <EmptyState compact icon={FileText} title="Sem contratos" description="Os contratos aparecem aqui quando uma proposta é convertida." />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {contracts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="num block text-[0.875rem] font-medium text-fg">{c.contractNumber}</span>
                    <span className="block text-small text-fg-3">
                      {c.startDate ? `${formatDate(c.startDate)} → ${formatDate(c.endDate)}` : "A agendar"} · {c.contractMonths} meses
                      {c.supportPlanId && state.supportPlans[c.supportPlanId] && ` · Suporte ${state.supportPlans[c.supportPlanId]!.name}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="num text-small text-fg">{formatMoney(c.monthlyPayment)}/mês</span>
                    <StatusBadge kind="contract" status={c.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Equipamentos instalados" description="Ativos físicos associados à igreja">
          {assets.length === 0 ? (
            <EmptyState compact icon={HardDrive} title="Sem equipamentos" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {assets.map((a) => {
                const product = state.products[a.productId];
                const variant = product?.variants.find((v) => v.id === a.variantId);
                return (
                  <li key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                    <p className="truncate text-[0.875rem] text-fg">{variantDisplayName(product?.name ?? "—", variant?.name)}</p>
                    <p className="num flex items-center justify-between text-small text-fg-3">
                      {a.assetTag} · {a.serialNumber ?? "s/ série"}
                      <StatusBadge kind="asset" status={a.status} />
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Histórico">
          {history.length === 0 ? (
            <p className="text-small text-fg-3">Sem registos.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="flex items-start gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-2" aria-hidden="true" />
                  <span>
                    <span className="block text-[0.875rem] text-fg">{h.summary}</span>
                    <span className="block text-small text-fg-3">{formatRelative(h.updatedAt)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Chamados e manutenções" description="Assistência técnica">
          <EmptyState compact icon={Wrench} title="Sem chamados abertos" description="O registo de chamados e manutenções está preparado para a próxima fase (portal do cliente)." />
        </Panel>

        <Panel title="Documentos" description="Contratos assinados, manuais, faturas">
          <EmptyState compact icon={FolderOpen} title="Sem documentos" description="As propostas assinadas ficam disponíveis no histórico de propostas." />
        </Panel>
      </div>

      {client.notes && (
        <section className="edge surface mt-3 rounded-card p-5 sm:p-6">
          <SectionTitle title="Notas" />
          <p className="whitespace-pre-line text-[0.875rem] text-fg-2">{client.notes}</p>
        </section>
      )}
    </PageContainer>
  );
}
