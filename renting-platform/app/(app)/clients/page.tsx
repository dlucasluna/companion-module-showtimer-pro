import type { ClientStatus, Prisma } from "@prisma/client";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { NewClientButton } from "@/components/clients/client-actions";
import { PageContainer } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterTabs, SearchForm } from "@/components/ui/filter-tabs";
import { Avatar, PageHeader } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { formatMoney, formatRelative } from "@/lib/formatters";
import { CLIENT_STATUS } from "@/lib/status";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const session = await requirePagePermission("clients.view");
  const params = await searchParams;
  const status = typeof params.status === "string" && params.status in CLIENT_STATUS ? (params.status as ClientStatus) : null;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const where: Prisma.ClientWhereInput = {
    companyId: session.companyId,
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { city: { contains: q } }, { contacts: { some: { name: { contains: q } } } }] } : {}),
  };
  const [clients, grouped] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        contacts: { orderBy: { isPrimary: "desc" }, take: 1 },
        contracts: { select: { status: true, monthlyPayment: true } },
      },
      orderBy: [{ lastInteractionAt: "desc" }, { name: "asc" }],
    }),
    prisma.client.groupBy({ by: ["status"], where: { companyId: session.companyId }, _count: true }),
  ]);
  const total = grouped.reduce((sum, g) => sum + g._count, 0);

  type Row = (typeof clients)[number];
  const columns: Column<Row>[] = [
    {
      key: "name",
      header: "Igreja",
      cell: (c) => (
        <span className="flex items-center gap-3">
          <Avatar name={c.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium text-fg">{c.name}</span>
            <span className="block truncate text-small text-fg-3">{c.contacts[0]?.name ?? "—"}</span>
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
          <span className="block">{c.contacts[0]?.phone ?? c.phone ?? "—"}</span>
          <span className="block text-fg-3">{c.contacts[0]?.email ?? c.email ?? ""}</span>
        </span>
      ),
    },
    { key: "status", header: "Estado", cell: (c) => <StatusBadge kind="client" status={c.status} /> },
    { key: "contracts", header: "Contratos", align: "right", hideBelow: "md", cell: (c) => <span className="num">{c.contracts.filter((k) => k.status !== "ENDED").length}</span> },
    {
      key: "mrr",
      header: "MRR",
      align: "right",
      cell: (c) => (
        <span className="num font-medium text-fg">
          {formatMoney(c.contracts.filter((k) => k.status === "ACTIVE").reduce((sum, k) => sum + k.monthlyPayment, 0))}
        </span>
      ),
    },
    { key: "last", header: "Última interação", hideBelow: "lg", cell: (c) => <span className="text-small">{formatRelative(c.lastInteractionAt)}</span> },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="CRM"
        title="Clientes"
        description="Igrejas, responsáveis e contratos."
        actions={
          can(session.role, "clients.manage") && (
            <Suspense>
              <NewClientButton />
            </Suspense>
          )
        }
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Filtrar clientes"
          active={status ?? "all"}
          tabs={[
            { value: "all", label: "Todos", count: total },
            ...Object.entries(CLIENT_STATUS).map(([value, meta]) => ({
              value,
              label: meta.label,
              count: grouped.find((g) => g.status === value)?._count ?? 0,
            })),
          ]}
          hrefFor={(value) => `/clients?${new URLSearchParams({ ...(value !== "all" ? { status: value } : {}), ...(q ? { q } : {}) })}`}
        />
        <SearchForm defaultValue={q} placeholder="Procurar igreja, cidade, pastor…" hidden={status ? { status } : undefined} />
      </div>
      <DataTable
        caption="Clientes"
        columns={columns}
        rows={clients}
        rowKey={(c) => c.id}
        rowHref={(c) => `/clients/${c.id}`}
        empty={<EmptyState icon={Users} title="Nenhum cliente encontrado" description="Crie o primeiro cliente para começar a montar propostas." />}
      />
    </PageContainer>
  );
}
