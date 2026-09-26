import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = Prisma.TransactionClient | PrismaClient;

/** Unguessable token for the client-facing share link. */
export function createPublicToken(): string {
  return randomBytes(18).toString("base64url");
}

function formatNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

function nextSequence(last: string | undefined): number {
  const sequence = last ? Number.parseInt(last.split("-").at(-1) ?? "0", 10) : 0;
  return (Number.isFinite(sequence) ? sequence : 0) + 1;
}

/** Next sequential number per company and year, e.g. PRP-2026-0015. */
export async function nextProposalNumber(db: Db, companyId: string, prefix: string, date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const last = await db.proposal.findFirst({
    where: { companyId, proposalNumber: { startsWith: `${prefix}-${year}-` } },
    orderBy: { proposalNumber: "desc" },
    select: { proposalNumber: true },
  });
  return formatNumber(prefix, year, nextSequence(last?.proposalNumber));
}

export async function nextContractNumber(db: Db, companyId: string, prefix: string, date = new Date()): Promise<string> {
  const year = date.getFullYear();
  const last = await db.contract.findFirst({
    where: { companyId, contractNumber: { startsWith: `${prefix}-${year}-` } },
    orderBy: { contractNumber: "desc" },
    select: { contractNumber: true },
  });
  return formatNumber(prefix, year, nextSequence(last?.contractNumber));
}
