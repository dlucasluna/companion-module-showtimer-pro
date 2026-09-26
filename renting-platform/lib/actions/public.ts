"use server";

import { prisma } from "@/lib/database/prisma";
import { persistSignature } from "@/lib/proposals/persistence";
import type { ActionResult } from "@/lib/utils";
import type { SignProposalInput } from "@/lib/validation/proposal";

/**
 * Signature from the public share link. Authorisation is the unguessable token;
 * expired, rejected or already converted proposals cannot be signed.
 */
export async function signPublicProposalAction(token: string, input: SignProposalInput): Promise<ActionResult> {
  if (typeof token !== "string" || token.length < 16) return { ok: false, error: "Link inválido." };
  const proposal = await prisma.proposal.findUnique({ where: { publicToken: token } });
  if (!proposal) return { ok: false, error: "Proposta não encontrada." };
  if (["REJECTED", "CONVERTED", "ACCEPTED"].includes(proposal.status)) return { ok: false, error: "Esta proposta já não pode ser assinada." };
  if (proposal.validUntil < new Date()) return { ok: false, error: "A validade desta proposta expirou. Contacte-nos para a renovar." };
  return persistSignature(proposal.id, proposal.companyId, input, null);
}
