import "server-only";
import type { ContractStatus, ProposalStatus } from "@prisma/client";
import { OPEN_PROPOSAL_STATUSES } from "@/lib/status";
import { loadPricingRules } from "./pricing";
import { prisma } from "./prisma";

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;
const REVENUE_STATUSES: ContractStatus[] = ["ACTIVE", "SUSPENDED", "ENDED"];
const LIVE_STATUSES: ContractStatus[] = ["ACTIVE", "AWAITING_INSTALLATION", "AWAITING_SIGNATURE", "SUSPENDED"];

export interface MrrPoint {
  month: string; // ISO date of the month start
  value: number;
}

export interface DashboardData {
  mrr: number;
  mrrPreviousMonth: number;
  activeContracts: number;
  activeClients: number;
  openProposals: number;
  openPipelineMonthly: number;
  conversionRate: number | null;
  installedAssets: number;
  contractedRevenue: number;
  mrrSeries: MrrPoint[];
  contractsByStatus: { status: ContractStatus; count: number }[];
  pipeline: { status: ProposalStatus; count: number; monthly: number }[];
  activity: { id: string; summary: string; createdAt: string }[];
  internal: {
    averageMargin: number | null;
    equipmentInvestment: number;
    fleetResidualValue: number;
    minMargin: number;
  } | null;
}

function monthStarts(count: number, now = new Date()): Date[] {
  return Array.from({ length: count }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1));
}

function activeDuring(contract: { startDate: Date | null; endDate: Date | null }, start: Date, end: Date): boolean {
  if (!contract.startDate || contract.startDate >= end) return false;
  return !contract.endDate || contract.endDate > start;
}

/** Aggregates for the dashboard. Internal figures are only computed when requested. */
export async function loadDashboard(companyId: string, includeInternal: boolean): Promise<DashboardData> {
  const [contracts, clientsActive, proposals, assets, activity] = await Promise.all([
    prisma.contract.findMany({ where: { companyId } }),
    prisma.client.count({ where: { companyId, status: "ACTIVE" } }),
    prisma.proposal.findMany({ where: { companyId }, select: { status: true, monthlyPayment: true } }),
    prisma.asset.findMany({
      where: { companyId, status: { not: "RETIRED" } },
      select: { status: true, purchaseCost: true, purchaseDate: true, product: { select: { expectedLifeMonths: true, defaultResidualPercent: true } } },
    }),
    prisma.auditLog.findMany({ where: { companyId }, orderBy: { updatedAt: "desc" }, take: 7 }),
  ]);

  const now = new Date();
  const active = contracts.filter((c) => c.status === "ACTIVE");
  const mrr = active.reduce((sum, c) => sum + c.monthlyPayment, 0);

  const months = monthStarts(12, now);
  const mrrSeries = months.map((start) => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const value = contracts
      .filter((c) => REVENUE_STATUSES.includes(c.status) && activeDuring(c, start, end))
      .reduce((sum, c) => sum + c.monthlyPayment, 0);
    return { month: start.toISOString(), value };
  });

  const count = (statuses: ProposalStatus[]) => proposals.filter((p) => statuses.includes(p.status)).length;
  const won = count(["ACCEPTED", "CONVERTED"]);
  const lost = count(["REJECTED", "EXPIRED"]);
  const open = proposals.filter((p) => OPEN_PROPOSAL_STATUSES.includes(p.status));

  const live = contracts.filter((c) => LIVE_STATUSES.includes(c.status));
  const contractValue = (c: (typeof contracts)[number]) => c.initialPayment + c.monthlyPayment * c.contractMonths;

  const pipelineStatuses: ProposalStatus[] = ["DRAFT", "PRESENTED", "SENT", "VIEWED", "ACCEPTED"];
  const contractStatuses: ContractStatus[] = ["ACTIVE", "AWAITING_INSTALLATION", "AWAITING_SIGNATURE", "SUSPENDED", "ENDED"];

  let internal: DashboardData["internal"] = null;
  if (includeInternal) {
    const { rules } = await loadPricingRules(companyId);
    const revenue = live.reduce((sum, c) => sum + contractValue(c), 0);
    const weightedMargin = live.reduce((sum, c) => sum + contractValue(c) * c.grossMargin, 0);
    internal = {
      averageMargin: revenue > 0 ? weightedMargin / revenue : null,
      equipmentInvestment: assets.reduce((sum, a) => sum + a.purchaseCost, 0),
      fleetResidualValue: assets.reduce((sum, a) => {
        const floor = a.product.defaultResidualPercent ?? rules.defaultResidualPercent;
        const age = a.purchaseDate ? (now.getTime() - a.purchaseDate.getTime()) / MONTH_MS : 0;
        const life = a.product.expectedLifeMonths;
        const factor = life ? Math.max(floor, 1 - age / life) : floor;
        return sum + Math.round(a.purchaseCost * Math.min(1, factor));
      }, 0),
      minMargin: rules.minMarginPercent,
    };
  }

  return {
    mrr,
    mrrPreviousMonth: mrrSeries.at(-2)?.value ?? 0,
    activeContracts: active.length,
    activeClients: clientsActive,
    openProposals: open.length,
    openPipelineMonthly: open.reduce((sum, p) => sum + p.monthlyPayment, 0),
    conversionRate: won + lost > 0 ? won / (won + lost) : null,
    installedAssets: assets.filter((a) => a.status === "INSTALLED").length,
    contractedRevenue: live.reduce((sum, c) => sum + contractValue(c), 0),
    mrrSeries,
    contractsByStatus: contractStatuses.map((status) => ({ status, count: contracts.filter((c) => c.status === status).length })),
    pipeline: pipelineStatuses.map((status) => {
      const rows = proposals.filter((p) => p.status === status);
      return { status, count: rows.length, monthly: rows.reduce((sum, p) => sum + p.monthlyPayment, 0) };
    }),
    activity: activity.map((a) => ({ id: a.id, summary: a.summary, createdAt: a.updatedAt.toISOString() })),
    internal,
  };
}
