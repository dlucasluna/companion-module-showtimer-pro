import type { HistoryEntry } from "../../../lib/actions/history";
import { current } from "../data/store";
import { authorize } from "./common";

export type { HistoryEntry };

export async function getProposalHistoryAction(proposalId: string): Promise<HistoryEntry[]> {
  authorize("proposals.view");
  const state = current();
  const proposal = state.proposals[proposalId];
  if (!proposal) return [];
  return [...proposal.history]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((h) => ({ id: h.id, summary: h.summary, userName: h.userId ? (state.users[h.userId]?.name ?? null) : null, createdAt: h.updatedAt }));
}
