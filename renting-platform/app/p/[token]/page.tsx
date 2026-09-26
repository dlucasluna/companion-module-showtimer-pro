import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProposalDocument } from "@/components/proposals/proposal-document";
import { PublicProposalActions } from "@/components/proposals/public-actions";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { toCommercialProposal } from "@/lib/security/projections";

export const metadata: Metadata = { title: "Proposta", robots: { index: false, follow: false } };

/** Client-facing share link. No login; the token is the authorisation. Only commercial data is loaded into the page. */
export default async function PublicProposalPage({ params }: PageProps<"/p/[token]">) {
  const { token } = await params;
  const proposal = await prisma.proposal.findUnique({
    where: { publicToken: token },
    include: {
      company: true,
      client: true,
      items: { orderBy: { sortOrder: "asc" } },
      supportPlan: true,
      signatures: { orderBy: { signedAt: "asc" } },
    },
  });
  if (!proposal) notFound();

  // First visit by the client (not by a logged-in seller) marks the proposal as viewed.
  if (!(await getSession()) && ["SENT", "PRESENTED"].includes(proposal.status)) {
    await prisma.proposal.update({ where: { id: proposal.id }, data: { status: "VIEWED", viewedAt: new Date() } });
    await prisma.auditLog.create({
      data: {
        companyId: proposal.companyId,
        entityType: "Proposal",
        entityId: proposal.id,
        action: "proposal.viewed",
        summary: `${proposal.client.name} abriu a proposta`,
      },
    });
  }

  const document = toCommercialProposal(proposal);
  const signable = !document.signature && !document.expired && !["REJECTED", "CONVERTED", "ACCEPTED"].includes(proposal.status);

  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 sm:py-10">
      <PublicProposalActions
        token={token}
        companyName={document.company.name}
        signable={signable}
        signed={document.signature !== null}
        expired={document.expired}
        defaultName={document.contactName ?? ""}
      />
      <ProposalDocument proposal={document} />
    </main>
  );
}
