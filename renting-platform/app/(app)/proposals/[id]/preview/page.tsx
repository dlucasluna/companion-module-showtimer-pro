import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProposalDocument } from "@/components/proposals/proposal-document";
import { PreviewToolbar } from "@/components/proposals/preview-toolbar";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { formatMoney } from "@/lib/formatters";
import { toCommercialProposal } from "@/lib/security/projections";

export const metadata: Metadata = { title: "Proposta" };

export default async function ProposalPreviewPage({ params }: PageProps<"/proposals/[id]/preview">) {
  const { id } = await params;
  const session = await requirePagePermission("proposals.view");
  const proposal = await prisma.proposal.findFirst({
    where: { id, companyId: session.companyId },
    include: {
      company: true,
      client: { include: { contacts: { orderBy: { isPrimary: "desc" }, take: 1 } } },
      items: { orderBy: { sortOrder: "asc" } },
      supportPlan: true,
      signatures: { orderBy: { signedAt: "asc" } },
      resultingContract: { select: { id: true } },
    },
  });
  if (!proposal) notFound();

  // The document only ever receives the commercial projection.
  const document = toCommercialProposal(proposal);
  const contact = proposal.client.contacts[0];

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-4 sm:px-6 lg:py-6">
      <PreviewToolbar
        proposalId={proposal.id}
        number={proposal.proposalNumber}
        status={proposal.status}
        clientName={proposal.client.name}
        contactName={proposal.contactName}
        clientEmail={contact?.email ?? proposal.client.email}
        clientPhone={contact?.phone ?? proposal.client.phone}
        publicPath={`/p/${proposal.publicToken}`}
        monthlyLabel={`${formatMoney(document.commercial.monthlyPayment)}/mês`}
        signed={document.signature !== null}
        contractId={proposal.resultingContract?.id ?? null}
      />
      <ProposalDocument proposal={document} />
    </div>
  );
}
