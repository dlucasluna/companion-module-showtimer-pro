import type { ActionResult } from "@/lib/utils";
import type { SignProposalInput } from "@/lib/validation/proposal";
import { current } from "../data/store";
import { persistSignature } from "./proposals";

/** Client-side acceptance (the artifact has no separate public page). */
export async function signPublicProposalAction(token: string, input: SignProposalInput): Promise<ActionResult> {
  const proposal = Object.values(current().proposals).find((p) => p.publicToken === token);
  if (!proposal) return { ok: false, error: "Proposta não encontrada." };
  return persistSignature(proposal.id, input, false);
}
