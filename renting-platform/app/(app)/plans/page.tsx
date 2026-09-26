import { Layers, LayoutTemplate, Star } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { PlanCardActions } from "@/components/plans/plan-card-actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionTitle } from "@/components/ui/misc";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { loadConfiguratorPricing } from "@/lib/database/pricing";
import { prisma } from "@/lib/database/prisma";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { catalogKey, priceConfiguration } from "@/lib/pricing";
import { variantDisplayName } from "@/lib/proposals/snapshot";

export const metadata: Metadata = { title: "Planos" };

export default async function PlansPage() {
  const session = await requirePagePermission("catalog.view");
  const companyId = session.companyId;
  const showInternal = can(session.role, "internal.view");
  const canEditRules = can(session.role, "plans.manage");

  const [plans, pricing, defaultSupport] = await Promise.all([
    prisma.plan.findMany({
      where: { companyId, active: true },
      include: {
        items: { include: { product: { select: { name: true } }, variant: { select: { name: true } } }, orderBy: { sortOrder: "asc" } },
        supportPlan: { select: { name: true } },
        pricingRule: true,
        createdBy: { select: { name: true } },
      },
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    loadConfiguratorPricing(companyId),
    prisma.supportPlan.findFirst({ where: { companyId, isDefault: true } }),
  ]);

  const cards = plans.map((plan) => {
    const lines = plan.items
      .filter((i) => pricing.catalog[catalogKey(i.productId, i.variantId)])
      .map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity }));
    const { result } = priceConfiguration(
      {
        lines,
        contractMonths: plan.contractMonths ?? pricing.defaults.contractMonths,
        upfront: { mode: "percent", value: plan.upfrontPercent ?? pricing.defaults.upfrontPercent },
        discount: { mode: "percent", value: 0 },
        supportPlanId: plan.supportPlanId ?? defaultSupport?.id ?? null,
        monthlyOverride: null,
        targetMargin: null,
        pricesIncludeVat: false,
      },
      { catalog: pricing.catalog, supportPlans: pricing.supportPlans, rules: pricing.rulesByPlan[plan.id] ?? pricing.rulesByPlan.global! },
    );
    return { plan, result };
  });

  const presets = cards.filter((c) => c.plan.kind === "PRESET");
  const templates = cards.filter((c) => c.plan.kind === "TEMPLATE");
  const globalMultiplier = pricing.rulesByPlan.global!.targetMultiplier;

  const renderCard = ({ plan, result }: (typeof cards)[number]) => (
    <article key={plan.id} className="edge surface flex flex-col rounded-panel p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {plan.kind === "PRESET" ? <Layers className="size-4 text-fg-2" /> : <LayoutTemplate className="size-4 text-fg-2" />}
            <h3 className="text-h3 text-fg">{plan.name}</h3>
          </div>
          <p className="mt-1 text-small text-fg-2">{plan.tagline}</p>
        </div>
        {plan.highlight && (
          <Badge tone="accent">
            <Star className="size-3" fill="currentColor" /> {plan.highlight}
          </Badge>
        )}
      </div>

      <ul className="mt-5 space-y-1.5">
        {plan.items.map((item) => (
          <li key={item.id} className="flex items-baseline gap-2 text-[0.875rem]">
            <span className="num w-6 text-right font-semibold text-fg-2">{item.quantity}×</span>
            <span className="text-fg">{variantDisplayName(item.product.name, item.variant?.name)}</span>
          </li>
        ))}
        {plan.supportPlan && <li className="pl-8 text-small text-fg-3">Suporte {plan.supportPlan.name}</li>}
      </ul>

      <div className="mt-auto pt-6">
        <div className="flex items-end justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div>
            <p className="num text-[1.5rem] font-semibold tracking-tight text-fg">
              {formatMoney(result.monthlyPayment)}
              <span className="text-small font-normal text-fg-3">/mês</span>
            </p>
            <p className="num text-small text-fg-3">
              {formatMoney(result.initialPayment)} entrada · {result.contractMonths} meses
            </p>
            {showInternal && (
              <p className="num mt-1 text-small text-fg-3">
                Custo {formatMoney(result.totalInternalCost)} · margem {formatPercent(result.grossMargin)}
                {plan.pricingRule?.targetMultiplier ? ` · ${plan.pricingRule.targetMultiplier}×` : ""}
              </p>
            )}
            {plan.kind === "TEMPLATE" && plan.createdBy && <p className="mt-1 text-micro text-fg-3">por {plan.createdBy.name}</p>}
          </div>
          <PlanCardActions
            planId={plan.id}
            planName={plan.name}
            canDelete={plan.kind === "TEMPLATE" ? can(session.role, "templates.manage") : canEditRules}
            canEditRules={canEditRules}
            globalMultiplier={globalMultiplier}
            rule={{
              targetMultiplier: plan.pricingRule?.targetMultiplier ?? null,
              minMarginPercent: plan.pricingRule?.minMarginPercent ?? null,
              riskReservePercent: plan.pricingRule?.riskReservePercent ?? null,
            }}
          />
        </div>
      </div>
    </article>
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Catálogo"
        title="Planos"
        description="Pontos de partida para propostas. Tudo continua editável no configurador."
        actions={
          can(session.role, "proposals.manage") && (
            <ButtonLink href="/proposals/new" variant="primary">
              Usar numa nova proposta
            </ButtonLink>
          )
        }
      />
      <SectionTitle title="Planos base" description="Broadcast Start, Pro e Premium" />
      <div className="grid gap-3 lg:grid-cols-3">{presets.map(renderCard)}</div>

      <div className="mt-12">
        <SectionTitle title="Templates" description="Configurações guardadas a partir de propostas" />
        {templates.length === 0 ? (
          <div className="edge surface rounded-panel">
            <EmptyState
              icon={LayoutTemplate}
              title="Ainda sem templates"
              description='No configurador, use "Guardar como template" para reutilizar uma configuração (ex.: "Broadcast Church 2 Cameras").'
            />
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">{templates.map(renderCard)}</div>
        )}
      </div>
    </PageContainer>
  );
}
