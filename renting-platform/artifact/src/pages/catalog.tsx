import { Layers, LayoutTemplate, Star } from "lucide-react";
import { useMemo } from "react";
import { CatalogView, type CatalogRow } from "@/components/catalog/catalog-view";
import { PageContainer } from "@/components/layout/app-shell";
import { useSession } from "@/components/layout/session-context";
import { PlanCardActions } from "@/components/plans/plan-card-actions";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, SectionTitle } from "@/components/ui/misc";
import { can } from "@/lib/auth/permissions";
import { formatMoney, formatPercent } from "@/lib/formatters";
import { catalogKey, priceConfiguration } from "@/lib/pricing";
import { variantDisplayName } from "@/lib/proposals/snapshot";
import { configuratorPricing, planRule } from "../data/derive";
import { useDemoState } from "../data/store";
import { PRODUCT_IMAGES } from "../images";

export function CatalogPage() {
  const session = useSession();
  const state = useDemoState();
  const canManage = can(session.role, "catalog.manage");
  const showCost = can(session.role, "internal.view");

  // Costs are only handed to the view for roles allowed to see them.
  const rows: CatalogRow[] = Object.values(state.products)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => {
      const variants = [...p.variants].sort((a, b) => a.sortOrder - b.sortOrder);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        type: p.type,
        categoryId: p.categoryId,
        imageUrl: p.imageUrl,
        description: p.description,
        active: p.active,
        variants: variants.map((v) => ({ name: v.name, cost: showCost ? v.internalCost : null, active: v.active })),
        cost: showCost ? p.internalCost : null,
        referencePrice: showCost ? p.referencePrice : null,
        editable: canManage
          ? {
              id: p.id,
              name: p.name,
              categoryId: p.categoryId,
              type: p.type,
              brand: p.brand ?? "",
              model: p.model ?? "",
              sku: p.sku,
              description: p.description ?? "",
              salesDescription: p.salesDescription ?? "",
              benefit: p.benefit ?? "",
              internalCost: p.internalCost,
              referencePrice: p.referencePrice,
              supplierId: p.supplierId,
              imageUrl: p.imageUrl ?? "",
              warrantyMonths: p.warrantyMonths,
              expectedLifeMonths: p.expectedLifeMonths,
              defaultResidualPercent: p.defaultResidualPercent,
              maxQuantity: p.maxQuantity,
              active: p.active,
              notes: p.notes ?? "",
              variants: variants.map((v) => ({
                id: v.id,
                name: v.name,
                sku: v.sku,
                description: v.description ?? "",
                benefit: v.benefit ?? "",
                internalCost: v.internalCost,
                referencePrice: v.referencePrice,
                isDefault: v.isDefault,
                active: v.active,
              })),
            }
          : null,
      };
    });

  return (
    <PageContainer>
      <CatalogView
        categories={Object.values(state.categories)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
        products={rows}
        suppliers={canManage ? Object.values(state.suppliers).map((s) => ({ id: s.id, name: s.name })) : []}
        images={canManage ? Object.keys(PRODUCT_IMAGES) : []}
        canManage={canManage}
      />
    </PageContainer>
  );
}

export function PlansPage() {
  const session = useSession();
  const state = useDemoState();
  const showInternal = can(session.role, "internal.view");
  const canEditRules = can(session.role, "plans.manage");

  const cards = useMemo(() => {
    const pricing = configuratorPricing(state);
    const defaultSupport = Object.values(state.supportPlans).find((p) => p.isDefault);
    return Object.values(state.plans)
      .filter((p) => p.active)
      .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt) : a.kind === "PRESET" ? -1 : 1))
      .map((plan) => {
        const lines = plan.items.filter((i) => pricing.catalog[catalogKey(i.productId, i.variantId)]).map((i) => ({ ...i }));
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
        return { plan, result, rule: planRule(state, plan.id), globalMultiplier: pricing.rulesByPlan.global!.targetMultiplier };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.plans, state.products, state.pricingRules, state.supportPlans]);

  const renderCard = ({ plan, result, rule, globalMultiplier }: (typeof cards)[number]) => (
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
        {plan.items.map((item) => {
          const product = state.products[item.productId];
          const variant = product?.variants.find((v) => v.id === item.variantId);
          return (
            <li key={`${item.productId}-${item.variantId ?? ""}`} className="flex items-baseline gap-2 text-[0.875rem]">
              <span className="num w-6 text-right font-semibold text-fg-2">{item.quantity}×</span>
              <span className="text-fg">{variantDisplayName(product?.name ?? "—", variant?.name)}</span>
            </li>
          );
        })}
        {plan.supportPlanId && state.supportPlans[plan.supportPlanId] && (
          <li className="pl-8 text-small text-fg-3">Suporte {state.supportPlans[plan.supportPlanId]!.name}</li>
        )}
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
                {rule?.targetMultiplier ? ` · ${rule.targetMultiplier}×` : ""}
              </p>
            )}
            {plan.kind === "TEMPLATE" && plan.createdById && state.users[plan.createdById] && (
              <p className="mt-1 text-micro text-fg-3">por {state.users[plan.createdById]!.name}</p>
            )}
          </div>
          <PlanCardActions
            planId={plan.id}
            planName={plan.name}
            canDelete={plan.kind === "TEMPLATE" ? can(session.role, "templates.manage") : canEditRules}
            canEditRules={canEditRules}
            globalMultiplier={globalMultiplier}
            rule={{
              targetMultiplier: rule?.targetMultiplier ?? null,
              minMarginPercent: rule?.minMarginPercent ?? null,
              riskReservePercent: rule?.riskReservePercent ?? null,
            }}
          />
        </div>
      </div>
    </article>
  );

  const presets = cards.filter((c) => c.plan.kind === "PRESET");
  const templates = cards.filter((c) => c.plan.kind === "TEMPLATE");

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
