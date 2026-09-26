import { Boxes, CircleDollarSign, FilePlus2, FileSignature, FileText, HardDrive, Percent, Scale, TrendingUp, Users, Wallet } from "lucide-react";
import { useMemo } from "react";
import { PageContainer } from "@/components/layout/app-shell";
import { useSession } from "@/components/layout/session-context";
import { BarList } from "@/components/dashboard/bar-list";
import { MrrChart } from "@/components/dashboard/mrr-chart";
import { ButtonLink } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader, SectionTitle } from "@/components/ui/misc";
import { can } from "@/lib/auth/permissions";
import { formatMoney, formatPercent, formatRelative } from "@/lib/formatters";
import { CONTRACT_STATUS, PROPOSAL_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";
import { useDemoState } from "../data/store";
import { computeDashboard } from "../data/views";

function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Bom dia" : hour < 20 ? "Boa tarde" : "Boa noite";
  return `${part}, ${name.split(" ")[0]}`;
}

export function DashboardPage() {
  const session = useSession();
  const state = useDemoState();
  const showInternal = can(session.role, "internal.view");
  const data = useMemo(() => computeDashboard(state, showInternal), [state, showInternal]);
  const mrrDelta = data.mrrPreviousMonth > 0 ? (data.mrr - data.mrrPreviousMonth) / data.mrrPreviousMonth : null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dashboard"
        title={greeting(session.name)}
        description={`${session.companyName} · visão geral do negócio de renting.`}
        actions={
          can(session.role, "proposals.manage") && (
            <ButtonLink href="/proposals/new" variant="primary" leftIcon={<FilePlus2 className="size-4" />}>
              Nova proposta
            </ButtonLink>
          )
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="MRR"
          icon={TrendingUp}
          value={formatMoney(data.mrr, { decimals: 0 })}
          hint="receita recorrente mensal"
          trend={mrrDelta !== null ? { value: `${mrrDelta >= 0 ? "+" : ""}${formatPercent(mrrDelta)}`, positive: mrrDelta >= 0 } : undefined}
        />
        <MetricCard label="Contratos ativos" icon={FileSignature} value={data.activeContracts} hint={`${data.activeClients} clientes ativos`} />
        <MetricCard label="Receita contratada" icon={CircleDollarSign} value={formatMoney(data.contractedRevenue, { decimals: 0 })} hint="valor total dos contratos em vigor" />
        <MetricCard label="Propostas abertas" icon={FileText} value={data.openProposals} hint={`${formatMoney(data.openPipelineMonthly)}/mês em negociação`} />
        <MetricCard label="Taxa de conversão" icon={Percent} value={data.conversionRate === null ? "—" : formatPercent(data.conversionRate, 0)} hint="ganhas vs. perdidas" />
        <MetricCard label="Equipamentos instalados" icon={HardDrive} value={data.installedAssets} hint="em igrejas clientes" />
        {data.internal && (
          <>
            <MetricCard
              label="Margem média"
              icon={Scale}
              internal
              value={
                <span className={cn(data.internal.averageMargin !== null && data.internal.averageMargin < data.internal.minMargin && "text-warning")}>
                  {data.internal.averageMargin === null ? "—" : formatPercent(data.internal.averageMargin)}
                </span>
              }
            />
            <MetricCard label="Investimento em equipamentos" icon={Wallet} internal value={formatMoney(data.internal.equipmentInvestment, { decimals: 0 })} />
            <MetricCard label="Valor residual da frota" icon={Boxes} internal value={formatMoney(data.internal.fleetResidualValue, { decimals: 0 })} />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="edge surface rounded-card p-5 sm:p-6" aria-labelledby="mrr-title">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 id="mrr-title" className="text-[1.0625rem] font-semibold tracking-tight text-fg">
                Receita recorrente
              </h2>
              <p className="text-small text-fg-3">Últimos 12 meses</p>
            </div>
            <p className="num text-h3 text-fg">
              {formatMoney(data.mrr)}
              <span className="text-small font-normal text-fg-3">/mês</span>
            </p>
          </div>
          <MrrChart data={data.mrrSeries} />
        </section>

        <section className="edge surface rounded-card p-5 sm:p-6">
          <SectionTitle title="Contratos" description="Por estado" />
          <BarList
            label="Contratos por estado"
            items={data.contractsByStatus.map((row) => ({ key: row.status, label: CONTRACT_STATUS[row.status].label, value: row.count, display: String(row.count) }))}
          />
        </section>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="edge surface rounded-card p-5 sm:p-6">
          <SectionTitle title="Pipeline comercial" description="Propostas por fase · mensalidade em negociação" />
          <BarList
            label="Pipeline comercial"
            items={data.pipeline.map((row) => ({
              key: row.status,
              label: PROPOSAL_STATUS[row.status].label,
              value: row.monthly,
              display: `${formatMoney(row.monthly)}/mês`,
              hint: `${row.count} ${row.count === 1 ? "proposta" : "propostas"}`,
            }))}
          />
        </section>

        <section className="edge surface rounded-card p-5 sm:p-6">
          <SectionTitle title="Atividade recente" />
          <ol className="space-y-3.5">
            {data.activity.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-2" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[0.875rem] text-fg">{entry.summary}</p>
                  <p className="text-small text-fg-3">{formatRelative(entry.createdAt)}</p>
                </div>
              </li>
            ))}
            {data.activity.length === 0 && (
              <li className="flex items-center gap-2 text-small text-fg-3">
                <Users className="size-4" /> Sem atividade ainda.
              </li>
            )}
          </ol>
        </section>
      </div>
    </PageContainer>
  );
}
