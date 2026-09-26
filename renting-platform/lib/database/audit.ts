import type { Prisma } from "@prisma/client";
import { formatMoney } from "@/lib/formatters";
import { describeConditionChanges, describeItemChanges, type ConditionsSnapshot, type HistoryItem } from "@/lib/proposals/history";
import { prisma } from "./prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export interface AuditInput {
  companyId: string;
  userId: string | null;
  entityType: string;
  entityId: string;
  action: string;
  summary: string;
  changes?: Prisma.InputJsonValue;
}

export function recordAudit(db: Db, input: AuditInput) {
  return db.auditLog.create({ data: input });
}

interface EditSnapshot {
  items: HistoryItem[];
  conditions: ConditionsSnapshot;
}

const COALESCE_WINDOW_MS = 10 * 60 * 1000;

function summarize(userName: string, before: EditSnapshot, after: EditSnapshot): string | null {
  const parts = [
    ...describeItemChanges(before.items, after.items),
    ...describeConditionChanges(before.conditions, after.conditions, (c) => formatMoney(c)),
  ];
  return parts.length ? `${userName.split(" ")[0]} ${parts.join("; ")}` : null;
}

/**
 * Records meaningful proposal edits. Autosave fires often, so consecutive edits
 * by the same user within 10 minutes are merged into one history entry
 * ("Lucas alterou PTZ Standard ×2 para PTZ NDI ×3").
 */
export async function recordProposalEdit(
  db: Db,
  params: { companyId: string; userId: string; userName: string; proposalId: string; before: EditSnapshot; after: EditSnapshot },
) {
  const last = await db.auditLog.findFirst({
    where: { companyId: params.companyId, entityType: "Proposal", entityId: params.proposalId },
    orderBy: { createdAt: "desc" },
  });

  const mergeable =
    last &&
    last.action === "proposal.edited" &&
    last.userId === params.userId &&
    Date.now() - last.updatedAt.getTime() < COALESCE_WINDOW_MS &&
    last.changes !== null;

  if (mergeable) {
    const origin = (last.changes as unknown as { before: EditSnapshot }).before;
    const summary = summarize(params.userName, origin, params.after);
    if (!summary) {
      await db.auditLog.delete({ where: { id: last.id } });
      return;
    }
    await db.auditLog.update({
      where: { id: last.id },
      data: { summary, changes: { before: origin, after: params.after } as unknown as Prisma.InputJsonValue },
    });
    return;
  }

  const summary = summarize(params.userName, params.before, params.after);
  if (!summary) return;
  await recordAudit(db, {
    companyId: params.companyId,
    userId: params.userId,
    entityType: "Proposal",
    entityId: params.proposalId,
    action: "proposal.edited",
    summary,
    changes: { before: params.before, after: params.after } as unknown as Prisma.InputJsonValue,
  });
}
