import { useMemo } from "react";
import { PageContainer } from "@/components/layout/app-shell";
import { useSession } from "@/components/layout/session-context";
import { NewProposalFlow, type PlanTile } from "@/components/proposals/new-proposal-flow";
import { PageHeader } from "@/components/ui/misc";
import { catalogKey, priceConfiguration } from "@/lib/pricing";
import { configuratorPricing, planDTOs } from "../data/derive";
import { useDemoState } from "../data/store";
import { byDateDesc, useQuery } from "./shared";

export function NewProposalPage() {
  const session = useSession();
  const state = useDemoState();
  const preselected = useQuery().get("client");

  const clients = useMemo(
    () =>
      Object.values(state.clients)
        .filter((c) => c.status !== "INACTIVE")
        .sort((a, b) => byDateDesc(a.lastInteractionAt, b.lastInteractionAt) || a.name.localeCompare(b.name))
        .map((c) => {
          const contact = [...c.contacts].sort((x, y) => Number(y.isPrimary) - Number(x.isPrimary))[0];
          return { id: c.id, name: c.name, city: c.city, contactName: contact?.name ?? null };
        }),
    [state.clients],
  );

  // "A partir de €X/mês" — commercial figures only reach the flow component.
  const tiles = useMemo<PlanTile[]>(() => {
    const pricing = configuratorPricing(state);
    const defaultSupport = Object.values(state.supportPlans).find((p) => p.isDefault && p.active);
    return planDTOs(state).map((plan) => {
      const lines = plan.items.filter((item) => pricing.catalog[catalogKey(item.productId, item.variantId)]);
      const { result } = priceConfiguration(
        {
          lines,
          contractMonths: plan.contractMonths ?? pricing.defaults.contractMonths,
          upfront: { mode: "percent", value: plan.upfrontPercent ?? pricing.defaults.upfrontPercent },
          discount: { mode: "percent", value: 0 },
          supportPlanId: plan.supportPlanId ?? defaultSupport?.id ?? null,
          monthlyOverride: null,
          targetMargin: null,
          pricesIncludeVat: pricing.defaults.pricesIncludeVat,
        },
        { catalog: pricing.catalog, supportPlans: pricing.supportPlans, rules: pricing.rulesByPlan[plan.id] ?? pricing.rulesByPlan.global! },
      );
      return {
        id: plan.id,
        name: plan.name,
        kind: plan.kind,
        tagline: plan.tagline,
        description: plan.description,
        highlight: plan.highlight,
        itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
        monthlyPayment: pricing.defaults.pricesIncludeVat ? result.monthlyPaymentGross : result.monthlyPayment,
        initialPayment: pricing.defaults.pricesIncludeVat ? result.initialPaymentGross : result.initialPayment,
        contractMonths: result.contractMonths,
      };
    });
    // Plan tiles only change when catalog, rules or plans change — not on every proposal save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.plans, state.products, state.pricingRules, state.supportPlans]);

  return (
    <PageContainer className="max-w-[1180px]">
      <PageHeader eyebrow="Nova proposta" title="Vamos montar o sistema." description="Escolha a igreja e um ponto de partida. Tudo pode ser ajustado a seguir." />
      <NewProposalFlow
        clients={clients}
        plans={tiles}
        preselectedClientId={clients.some((c) => c.id === preselected) ? preselected : null}
        canCreateClient={session.permissions.includes("clients.manage")}
      />
    </PageContainer>
  );
}
