import { Cloud, HardDrive, RotateCcw, TriangleAlert } from "lucide-react";
import { useState, type ReactNode } from "react";
import { BarList } from "@/components/dashboard/bar-list";
import { PageContainer } from "@/components/layout/app-shell";
import { useSession } from "@/components/layout/session-context";
import { CompanyForm } from "@/components/settings/company-form";
import { PricingForm } from "@/components/settings/pricing-form";
import { SupportPlansEditor } from "@/components/settings/support-plans-editor";
import { UsersEditor } from "@/components/settings/users-editor";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader, SectionTitle } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { formatMoney, formatMonthShort, formatPercent, formatRelative } from "@/lib/formatters";
import { toLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { rulesFor } from "../data/derive";
import { buildSeed } from "../data/seed";
import { getAdapter, useDemo, useDemoState } from "../data/store";
import type { ContractRec } from "../data/types";

export function FinancePage() {
  const state = useDemoState();
  const { rules } = rulesFor(state);
  const contracts = Object.values(state.contracts)
    .filter((c) => c.status !== "ENDED")
    .sort((a, b) => b.monthlyPayment - a.monthlyPayment);

  const now = new Date();
  const forecast = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
    const value = contracts
      .filter((c) => c.status === "ACTIVE" || c.status === "AWAITING_INSTALLATION")
      .filter((c) => {
        const from = c.startDate ? new Date(c.startDate) : new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const to = c.endDate ? new Date(c.endDate) : new Date(from.getFullYear(), from.getMonth() + c.contractMonths, 1);
        return from < end && to > start;
      })
      .reduce((sum, c) => sum + c.monthlyPayment, 0);
    return { month: start.toISOString(), value };
  });

  type Row = ContractRec & { revenue: number; profit: number; margin: number };
  const rows: Row[] = contracts.map((c) => {
    const revenue = c.initialPayment + c.monthlyPayment * c.contractMonths;
    const profit = revenue - c.internalCost;
    return { ...c, revenue, profit, margin: revenue > 0 ? profit / revenue : 0 };
  });
  const totals = rows.reduce((acc, r) => ({ revenue: acc.revenue + r.revenue, cost: acc.cost + r.internalCost, profit: acc.profit + r.profit }), { revenue: 0, cost: 0, profit: 0 });
  const forecastTotal = forecast.reduce((s, f) => s + f.value, 0);

  const columns: Column<Row>[] = [
    {
      key: "contract",
      header: "Contrato",
      cell: (r) => (
        <span className="block">
          <span className="block text-fg">{state.clients[r.clientId]?.name ?? "—"}</span>
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
        <MetricCard
          label="Lucro bruto"
          value={formatMoney(totals.profit, { decimals: 0 })}
          hint={totals.revenue > 0 ? `margem ${formatPercent(totals.profit / totals.revenue)}` : undefined}
          internal
        />
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

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="grid scroll-mt-8 gap-6 border-t border-white/[0.06] py-10 first:border-t-0 first:pt-0 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        <h2 id={`${id}-title`} className="text-h3 text-fg">
          {title}
        </h2>
        <p className="mt-1.5 text-small text-fg-2">{description}</p>
      </div>
      <div className="edge surface rounded-panel p-5 sm:p-6">{children}</div>
    </section>
  );
}

const STORAGE_LABEL = {
  cloud: { icon: Cloud, title: "Guardado na base de dados do artifact", text: "Clientes, propostas e contratos ficam guardados e aparecem em qualquer dispositivo onde abrir este link." },
  local: { icon: HardDrive, title: "Guardado neste navegador", text: "A base de dados partilhada não está disponível nesta vista; os dados ficam apenas neste navegador." },
  memory: { icon: TriangleAlert, title: "Sem armazenamento", text: "Nesta vista nada é guardado: ao recarregar a página, os dados voltam ao início." },
} as const;

function DemoDataPanel() {
  const mode = useDemo((s) => s.mode);
  const pending = useDemo((s) => s.pendingWrites);
  const saveError = useDemo((s) => s.saveError);
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const info = STORAGE_LABEL[mode];

  const reset = async () => {
    setResetting(true);
    try {
      const seed = buildSeed();
      await getAdapter()?.replaceAll(seed);
      useDemo.setState({ state: seed });
      toast.success("Dados repostos", "A demonstração voltou ao estado inicial.");
      setConfirming(false);
    } catch (error) {
      toast.error("Não foi possível repor", error instanceof Error ? error.message : undefined);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <info.icon className="mt-0.5 size-5 shrink-0 text-fg-2" />
        <div>
          <p className="font-medium text-fg">{info.title}</p>
          <p className="mt-1 text-small text-fg-2">{info.text}</p>
          <p className="mt-2 text-small text-fg-3">
            {saveError ? <span className="text-danger">Último erro: {saveError}</span> : pending > 0 ? `A guardar ${pending} alteraç${pending === 1 ? "ão" : "ões"}…` : "Tudo guardado."}
          </p>
        </div>
      </div>
      {confirming ? (
        <div className="rounded-2xl border border-danger/25 bg-danger/10 p-4">
          <p className="text-small text-fg">Apagar todos os clientes, propostas e contratos criados e voltar aos dados de exemplo?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="destructive" size="md" loading={resetting} onClick={() => void reset()}>
              Sim, repor dados
            </Button>
            <Button variant="ghost" size="md" disabled={resetting} onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="md" leftIcon={<RotateCcw className="size-4" />} onClick={() => setConfirming(true)}>
          Repor dados de demonstração
        </Button>
      )}
    </div>
  );
}

export function SettingsPage() {
  const session = useSession();
  const state = useDemoState();
  const { rules, defaults } = rulesFor(state);
  const company = state.company;

  return (
    <PageContainer className="max-w-[1180px]">
      <PageHeader eyebrow="Administração" title="Configurações" description="Empresa, regras de pricing, suporte e utilizadores." />

      <nav aria-label="Secções" className="no-scrollbar -mx-1 mb-8 flex gap-1 overflow-x-auto px-1">
        {[
          ["pricing", "Pricing"],
          ["empresa", "Empresa"],
          ["suporte", "Planos de suporte"],
          ["condicoes", "Condições"],
          ["utilizadores", "Utilizadores"],
          ["dados", "Dados"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="h-9 shrink-0 rounded-full border border-white/[0.08] px-3.5 text-small leading-9 text-fg-2 hover:bg-white/[0.05] hover:text-fg">
            {label}
          </a>
        ))}
      </nav>

      <Section id="pricing" title="Pricing Settings" description="Regras globais do motor financeiro. Podem ser sobrepostas por plano em Planos → Pricing.">
        <PricingForm
          defaults={{
            targetMultiplier: rules.targetMultiplier,
            defaultUpfrontPercent: defaults.upfrontPercent,
            defaultContractMonths: defaults.contractMonths,
            allowedContractMonths: defaults.allowedContractMonths.join(","),
            riskReservePercent: rules.riskReservePercent,
            maintenanceReservePercent: rules.maintenanceReservePercent,
            defaultResidualPercent: rules.defaultResidualPercent,
            residualCreditPercent: rules.residualCreditPercent,
            vatRate: rules.vatRate,
            minMarginPercent: rules.minMarginPercent,
            pricesIncludeVat: defaults.pricesIncludeVat,
            roundMonthlyTo: rules.roundMonthlyTo,
            roundUpfrontTo: rules.roundUpfrontTo,
          }}
        />
      </Section>

      <Section id="empresa" title="Empresa" description="Aparece nas propostas e no modo cliente. O nome ChurchTech Rent é temporário e editável aqui.">
        <CompanyForm
          defaults={{
            name: company.name,
            legalName: company.legalName ?? "",
            taxId: company.taxId ?? "",
            email: company.email ?? "",
            phone: company.phone ?? "",
            website: company.website ?? "",
            address: company.address ?? "",
            city: company.city ?? "",
            postalCode: company.postalCode ?? "",
            tagline: company.tagline ?? "",
            locale: toLocale(company.locale),
            proposalPrefix: company.proposalPrefix,
            proposalValidityDays: company.proposalValidityDays,
            proposalTerms: company.proposalTerms ?? "",
          }}
        />
      </Section>

      <Section id="suporte" title="Planos de suporte" description="Custo interno e preço mensal. O preço soma à mensalidade.">
        <SupportPlansEditor
          plans={Object.values(state.supportPlans)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((p) => ({ id: p.id, name: p.name, description: p.description, monthlyCost: p.monthlyCost, monthlyPrice: p.monthlyPrice, active: p.active }))}
        />
      </Section>

      <Section id="condicoes" title="Condições de pagamento" description="Combinações pré-definidas usadas em Simular condições.">
        <ul className="divide-y divide-white/[0.06]">
          {Object.values(state.paymentConditions)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <span>
                  <span className="block font-medium text-fg">{c.name}</span>
                  <span className="block text-small text-fg-3">{c.description}</span>
                </span>
                <span className="num text-small text-fg-2">
                  {c.contractMonths} meses · {formatPercent(c.upfrontPercent, 0)} entrada
                </span>
              </li>
            ))}
        </ul>
      </Section>

      <Section id="utilizadores" title="Utilizadores e funções" description="Administrador, Comercial, Financeiro, Técnico e Leitura. Os dados internos só são mostrados a funções autorizadas.">
        <UsersEditor
          currentUserId={session.id}
          users={Object.values(state.users)
            .filter((u) => u.role !== "CLIENT")
            .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, title: u.title, lastLoginLabel: u.lastLoginAt ? formatRelative(u.lastLoginAt) : "nunca" }))}
        />
      </Section>

      <Section id="dados" title="Dados da demonstração" description="Onde esta versão guarda o que cria, e como voltar ao início.">
        <DemoDataPanel />
      </Section>
    </PageContainer>
  );
}
