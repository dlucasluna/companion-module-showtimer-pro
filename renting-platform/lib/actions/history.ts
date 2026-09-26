"use server";

import { requireActionPermission } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

export interface HistoryEntry {
  id: string;
  summary: string;
  userName: string | null;
  createdAt: string;
}

export async function getProposalHistoryAction(proposalId: string): Promise<HistoryEntry[]> {
  const session = await requireActionPermission("proposals.view");
  const logs = await prisma.auditLog.findMany({
    where: { companyId: session.companyId, entityType: "Proposal", entityId: proposalId },
    include: { user: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return logs.map((log) => ({ id: log.id, summary: log.summary, userName: log.user?.name ?? null, createdAt: log.updatedAt.toISOString() }));
}
