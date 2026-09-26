import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { BarList } from "@/components/dashboard/bar-list";
import { DataTable, type Column } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader, SectionTitle } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { requirePagePermission } from "@/lib/auth/session";
import { loadPricingRules } from "@/lib/database/pricing";
import { prisma } from "@/lib/database/prisma";
import { formatMoney, formatMonthShort, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinancePage() {
  const session = await requirePagePermission("finance.view");
  const companyId = session.companyId;
  const [contracts, { rules }] = await Promise.all([
    prisma.contract.findMany({
      where: { companyId, status: { not: "ENDED" } },
      include: { client: { select: { name: true } } },
      orderBy: { monthlyPayment: "desc" },
    }),
    loadPricingRules(companyId),
  ]);

  const now = new Date();
  const forecast = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const value = contracts
      .filter((c) => c.status === "ACTIVE" || c.status === "AWAITING_INSTALLATION")
      .filter((c) => {
        const from = c.startDate ?? new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const to = c.endDate ?? new Date(from.getFullYear(), from.getMonth() + c.contractMonths, 1);
        return from < end && to > start;
      })
      .reduce((sum, c) => sum + c.monthlyPayment, 0);
    return { month: start.toISOString(), value };
  });

  const rows = contracts.map((c) => {
    const revenue = c.initialPayment + c.monthlyPayment * c.contractMonths;
    const profit = revenue - c.internalCost;
    return { ...c, revenue, profit, margin: revenue > 0 ? profit / revenue : 0 };
  });
  const totals = rows.reduce((acc, r) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.internalCost, profit: acc.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 });
  const forecastTotal = forecast.reduce((s, f) => s + f.value, 0);

  type Row = (typeof rows)[number];
  const columns: Column<Row>[] = [
    {
      key: "contract",
      header: "Contrato",
      cell: (r) => (
        <span className="block">
          <span className="block text-fg">{r.client.name}</span>
          <span className="num block text-small text-fg-3">{r.contractNumber}</span>
        </span>
      ),
    },
    { key: "status", header: "Estado", hideBelow: "md", cell: (r) => <StatusBadge kind="contract" status={r.status} /> },
    { key: "revenue", header: "Receita", align: "right", cell: (r) => <span className="num text-fg">{formatMoney(r.revenue, { decimals: 0 })}</span> },
    { key: "cost", header: "Custo", align: "right", hideBelow: "md", cell: (r) => <span className="num">{formatMoney(r.internalCost, { decimals: 0 })}</span> },
    { key: "profit", header: "Lucro bruto", align: "right", cell: (r) => <span className="num text-fg">{formatMoney(r.profit, { decimals: 0 })}</span> },
    {
      key: "margin",
      header: "Margem",
      align: "right",
      cell: (r) => <span className={cn("num", r.margin < rules.minMarginPercent ? "text-warning" : "text-fg-2")}>{formatPercent(r.margin)}</span>,
    },
  ];

  return (
    <PageContainer>
      <PageHeader eyebrow="Financeiro" title="Receita e rentabilidade" description="Previsão de faturação e margem dos contratos em vigor. Visível apenas para Financeiro e Administração." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Faturação prevista (12 meses)" value={formatMoney(forecastTotal, { decimals: 0 })} hint="mensalidades de contratos ativos e a instalar" />
        <MetricCard label="Receita contratada" value={formatMoney(totals.revenue, { decimals: 0 })} internal />
        <MetricCard label="Custo dos contratos" value={formatMoney(totals.cost, { decimals: 0 })} internal />
        <MetricCard label="Lucro bruto" value={formatMoney(totals.profit, { decimals: 0 })} hint={totals.revenue > 0 ? `margem ${formatPercent(totals.profit / totals.revenue)}` : undefined} internal />
      </div>

      <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="edge surface rounded-card p-5 sm:p-6">
          <SectionTitle title="Faturação prevista" description="Mensalidades por mês (sem IVA)" />
          <BarList
            label="Faturação prevista por mês"
            items={forecast.map((f) => ({ key: f.month, label: formatMonthShort(f.month), value: f.value, display: formatMoney(f.value, { decimals: 0 }) }))}
            className="[&_li>div:first-child>span:first-child]:capitalize"
          />
        </section>
        <section>
          <SectionTitle title="Rentabilidade por contrato" />
          <DataTable caption="Rentabilidade por contrato" columns={columns} rows={rows} rowKey={(r) => r.id} />
        </section>
      </div>
    </PageContainer>
  );
}
