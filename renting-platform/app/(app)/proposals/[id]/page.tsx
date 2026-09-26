import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Configurator } from "@/components/configurator/configurator";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { loadConfiguratorCatalog } from "@/lib/database/catalog";
import { loadConfiguratorPricing } from "@/lib/database/pricing";
import { prisma } from "@/lib/database/prisma";
import { toLocale } from "@/lib/i18n/locales";
import { catalogKey } from "@/lib/pricing";
import { configFromProposal } from "@/lib/proposals/persistence";

export const metadata: Metadata = { title: "Configurador" };

export default async function ProposalConfiguratorPage({ params }: PageProps<"/proposals/[id]">) {
  const { id } = await params;
  const session = await requirePagePermission("proposals.view");
  const proposal = await prisma.proposal.findFirst({
    where: { id, companyId: session.companyId },
    include: { items: { orderBy: { sortOrder: "asc" } }, client: true, company: true },
  });
  if (!proposal) notFound();

  // Read-only roles and converted proposals go straight to the document.
  const canEdit = can(session.role, "proposals.manage") && can(session.role, "internal.view");
  if (!canEdit || proposal.status === "CONVERTED") redirect(`/proposals/${id}/preview`);

  const [catalog, pricing] = await Promise.all([loadConfiguratorCatalog(session.companyId), loadConfiguratorPricing(session.companyId)]);

  // Drop lines whose product was deactivated since the proposal was saved.
  const config = configFromProposal(proposal);
  config.lines = config.lines.filter((line) => pricing.catalog[catalogKey(line.productId, line.variantId)]);

  return (
    <Configurator
      init={{
        meta: {
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
          title: proposal.title,
          clientId: proposal.clientId,
          clientName: proposal.client.name,
          contactName: proposal.contactName,
          status: proposal.status,
        },
        config,
        planId: proposal.planId,
      }}
      serverUpdatedAt={proposal.updatedAt.toISOString()}
      catalog={catalog}
      pricing={pricing}
      locale={toLocale(proposal.company.locale)}
      companyName={proposal.company.name}
    />
  );
}
