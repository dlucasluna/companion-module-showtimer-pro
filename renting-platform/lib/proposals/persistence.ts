import "server-only";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { recordAudit } from "@/lib/database/audit";
import { prisma } from "@/lib/database/prisma";
import type { ProposalConfig } from "@/lib/pricing";
import type { ActionResult } from "@/lib/utils";
import { signProposalSchema, type SignProposalInput } from "@/lib/validation/proposal";

/** Rebuilds the editable configuration from a stored proposal. */
export function configFromProposal(proposal: {
  contractMonths: number;
  upfrontMode: "PERCENT" | "AMOUNT";
  upfrontValue: number;
  discountMode: "PERCENT" | "AMOUNT";
  discountValue: number;
  supportPlanId: string | null;
  monthlyOverride: number | null;
  targetMargin: number | null;
  pricesIncludeVat: boolean;
  items: { productId: string; variantId: string | null; quantity: number }[];
}): ProposalConfig {
  return {
    lines: proposal.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    contractMonths: proposal.contractMonths,
    upfront: proposal.upfrontMode === "PERCENT" ? { mode: "percent", value: proposal.upfrontValue } : { mode: "amount", value: Math.round(proposal.upfrontValue) },
    discount:
      proposal.discountMode === "PERCENT" ? { mode: "percent", value: proposal.discountValue } : { mode: "amount", value: Math.round(proposal.discountValue) },
    supportPlanId: proposal.supportPlanId,
    monthlyOverride: proposal.monthlyOverride,
    targetMargin: proposal.targetMargin,
    pricesIncludeVat: proposal.pricesIncludeVat,
  };
}

/**
 * Stores a signature and marks the proposal as accepted. NOT a server action:
 * callers must authorise access to the proposal first (session or public token).
 */
export async function persistSignature(proposalId: string, companyId: string, input: SignProposalInput, userId: string | null): Promise<ActionResult> {
  const parsed = signProposalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const requestHeaders = await headers();
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.proposalSignature.create({
      data: {
        proposalId,
        signerName: data.signerName,
        signerEmail: data.signerEmail || null,
        signerRole: data.signerRole || null,
        method: data.imageData ? "DRAWN" : "TYPED",
        imageData: data.imageData,
        acceptedTerms: true,
        ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: requestHeaders.get("user-agent")?.slice(0, 250) ?? null,
      },
    });
    await tx.proposal.update({ where: { id: proposalId }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await recordAudit(tx, {
      companyId,
      userId,
      entityType: "Proposal",
      entityId: proposalId,
      action: "proposal.signed",
      summary: `${data.signerName} assinou e aceitou a proposta`,
    });
  });
  revalidatePath("/proposals");
  return { ok: true, data: undefined };
}
