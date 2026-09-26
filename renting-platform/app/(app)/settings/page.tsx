import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/app-shell";
import { CompanyForm } from "@/components/settings/company-form";
import { PricingForm } from "@/components/settings/pricing-form";
import { SupportPlansEditor } from "@/components/settings/support-plans-editor";
import { UsersEditor } from "@/components/settings/users-editor";
import { PageHeader } from "@/components/ui/misc";
import { requirePagePermission } from "@/lib/auth/session";
import { loadPricingRules } from "@/lib/database/pricing";
import { prisma } from "@/lib/database/prisma";
import { toLocale } from "@/lib/i18n/locales";
import { formatPercent, formatRelative } from "@/lib/formatters";

export const metadata: Metadata = { title: "Configurações" };

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

export default async function SettingsPage() {
  const session = await requirePagePermission("settings.manage");
  const companyId = session.companyId;
  const [company, { rules, defaults }, supportPlans, users, conditions] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
    loadPricingRules(companyId),
    prisma.supportPlan.findMany({ where: { companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.user.findMany({ where: { companyId, role: { not: "CLIENT" } }, orderBy: { createdAt: "asc" } }),
    prisma.paymentCondition.findMany({ where: { companyId }, orderBy: { sortOrder: "asc" } }),
  ]);

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
          plans={supportPlans.map((p) => ({ id: p.id, name: p.name, description: p.description, monthlyCost: p.monthlyCost, monthlyPrice: p.monthlyPrice, active: p.active }))}
        />
      </Section>

      <Section id="condicoes" title="Condições de pagamento" description="Combinações pré-definidas usadas em Simular condições.">
        <ul className="divide-y divide-white/[0.06]">
          {conditions.map((c) => (
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

      <Section id="utilizadores" title="Utilizadores e funções" description="Administrador, Comercial, Financeiro, Técnico e Leitura. Os dados internos só são enviados a funções autorizadas.">
        <UsersEditor
          currentUserId={session.id}
          users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, title: u.title, lastLoginLabel: u.lastLoginAt ? formatRelative(u.lastLoginAt) : "nunca" }))}
        />
      </Section>
    </PageContainer>
  );
}
