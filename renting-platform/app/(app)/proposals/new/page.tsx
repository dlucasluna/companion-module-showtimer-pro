import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/misc";
import { NewProposalFlow, type PlanTile } from "@/components/proposals/new-proposal-flow";
import { requirePagePermission } from "@/lib/auth/session";
import { loadPlans } from "@/lib/database/catalog";
import { loadConfiguratorPricing } from "@/lib/database/pricing";
import { prisma } from "@/lib/database/prisma";
import { catalogKey, priceConfiguration } from "@/lib/pricing";

export const metadata: Metadata = { title: "Nova proposta" };

export default async function NewProposalPage({ searchParams }: PageProps<"/proposals/new">) {
  const session = await requirePagePermission("proposals.manage");
  const params = await searchParams;
  const companyId = session.companyId;

  const [clients, plans, pricing, defaultSupport] = await Promise.all([
    prisma.client.findMany({
      where: { companyId, status: { not: "INACTIVE" } },
      include: { contacts: { orderBy: { isPrimary: "desc" }, take: 1 } },
      orderBy: [{ lastInteractionAt: "desc" }, { name: "asc" }],
    }),
    loadPlans(companyId),
    loadConfiguratorPricing(companyId),
    prisma.supportPlan.findFirst({ where: { companyId, isDefault: true, active: true } }),
  ]);

  // "A partir de €X/mês" — commercial figures only are sent to the page.
  const tiles: PlanTile[] = plans.map((plan) => {
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

  const preselected = typeof params.client === "string" ? params.client : null;

  return (
    <PageContainer className="max-w-[1180px]">
      <PageHeader eyebrow="Nova proposta" title="Vamos montar o sistema." description="Escolha a igreja e um ponto de partida. Tudo pode ser ajustado a seguir." />
      <NewProposalFlow
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          city: client.city,
          contactName: client.contacts[0]?.name ?? null,
        }))}
        plans={tiles}
        preselectedClientId={clients.some((c) => c.id === preselected) ? preselected : null}
        canCreateClient={session.permissions.includes("clients.manage")}
      />
    </PageContainer>
  );
}
