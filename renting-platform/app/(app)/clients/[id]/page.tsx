import { ArrowLeft, FilePlus2, FileText, FolderOpen, HardDrive, Mail, MapPin, Phone, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EditClientButton } from "@/components/clients/client-actions";
import { PageContainer } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { Avatar, SectionTitle } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { formatDate, formatMoney, formatRelative } from "@/lib/formatters";

export const metadata: Metadata = { title: "Cliente" };

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;

/** Entradas + mensalidades already billed (month of start counts). */
function accumulatedRevenue(
  contracts: { startDate: Date | null; status: string; contractMonths: number; initialPayment: number; monthlyPayment: number }[],
  now: number = Date.now(),
): number {
  return contracts.reduce((sum, c) => {
    if (!c.startDate || c.status === "AWAITING_SIGNATURE") return sum;
    const elapsed = Math.min(c.contractMonths, Math.max(0, Math.floor((now - c.startDate.getTime()) / MONTH_MS) + 1));
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

export default async function ClientProfilePage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  const session = await requirePagePermission("clients.view");
  const client = await prisma.client.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      contacts: { orderBy: { isPrimary: "desc" } },
      proposals: { orderBy: { updatedAt: "desc" } },
      contracts: { orderBy: { createdAt: "desc" }, include: { supportPlan: { select: { name: true } } } },
      assets: { include: { product: { select: { name: true } }, variant: { select: { name: true } } }, orderBy: { assetTag: "asc" } },
    },
  });
  if (!client) notFound();

  const proposalIds = client.proposals.map((p) => p.id);
  const history = await prisma.auditLog.findMany({
    where: { companyId: session.companyId, OR: [{ entityType: "Client", entityId: id }, { entityType: "Proposal", entityId: { in: proposalIds } }] },
    orderBy: { updatedAt: "desc" },
    take: 12,
  });

  const mrr = client.contracts.filter((c) => c.status === "ACTIVE").reduce((sum, c) => sum + c.monthlyPayment, 0);
  const accumulated = accumulatedRevenue(client.contracts);
  const primary = client.contacts[0];
  const canManageClient = can(session.role, "clients.manage");
  const canPropose = can(session.role, "proposals.manage");

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
                <a href={`tel:${primary?.phone ?? client.phone}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                  <Phone className="size-3.5" /> {primary?.phone ?? client.phone}
                </a>
              )}
              {(primary?.email ?? client.email) && (
                <a href={`mailto:${primary?.email ?? client.email}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                  <Mail className="size-3.5" /> {primary?.email ?? client.email}
                </a>
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
        <MetricCard label="Receita acumulada" value={formatMoney(accumulated, { decimals: 0 })} hint="entradas + mensalidades faturadas" />
        <MetricCard label="Contratos" value={client.contracts.length} hint={`${client.contracts.filter((c) => c.status === "ACTIVE").length} ativos`} />
        <MetricCard label="Equipamentos" value={client.assets.length} hint={`${client.assets.filter((a) => a.status === "INSTALLED").length} instalados`} />
      </div>

      <div className="mt-6 grid gap-3 xl:grid-cols-2">
        <Panel title="Propostas" description={`${client.proposals.length} no total`}>
          {client.proposals.length === 0 ? (
            <EmptyState compact icon={FileText} title="Sem propostas" description="Monte o primeiro sistema para esta igreja." />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {client.proposals.map((p) => (
                <li key={p.id}>
                  <Link href={p.status === "CONVERTED" ? `/proposals/${p.id}/preview` : `/proposals/${p.id}`} className="flex items-center justify-between gap-3 py-3 transition hover:opacity-80">
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
          {client.contracts.length === 0 ? (
            <EmptyState compact icon={FileText} title="Sem contratos" description="Os contratos aparecem aqui quando uma proposta é convertida." />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {client.contracts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="num block text-[0.875rem] font-medium text-fg">{c.contractNumber}</span>
                    <span className="block text-small text-fg-3">
                      {c.startDate ? `${formatDate(c.startDate)} → ${formatDate(c.endDate)}` : "A agendar"} · {c.contractMonths} meses
                      {c.supportPlan && ` · Suporte ${c.supportPlan.name}`}
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
          {client.assets.length === 0 ? (
            <EmptyState compact icon={HardDrive} title="Sem equipamentos" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {client.assets.map((a) => (
                <li key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <p className="truncate text-[0.875rem] text-fg">
                    {a.product.name}
                    {a.variant && <span className="text-fg-2"> {a.variant.name}</span>}
                  </p>
                  <p className="num flex items-center justify-between text-small text-fg-3">
                    {a.assetTag} · {a.serialNumber ?? "s/ série"}
                    <StatusBadge kind="asset" status={a.status} />
                  </p>
                </li>
              ))}
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
