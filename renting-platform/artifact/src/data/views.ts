import type { ContractStatus, ProposalStatus } from "@prisma/client";
import type { DashboardData } from "@/lib/database/dashboard";
import { toCommercialProposal, type CommercialProposalDTO } from "@/lib/security/projections";
import { OPEN_PROPOSAL_STATUSES } from "@/lib/status";
import { rulesFor } from "./derive";
import type { ContractRec, DemoState, ProposalRec } from "./types";

const MONTH_MS = 30.44 * 24 * 60 * 60 * 1000;
const REVENUE: ContractStatus[] = ["ACTIVE", "SUSPENDED", "ENDED"];
const LIVE: ContractStatus[] = ["ACTIVE", "AWAITING_INSTALLATION", "AWAITING_SIGNATURE", "SUSPENDED"];

const contractValue = (c: ContractRec) => c.initialPayment + c.monthlyPayment * c.contractMonths;

/** Same aggregates as lib/database/dashboard.ts, computed from the artifact's data. */
export function computeDashboard(state: DemoState, includeInternal: boolean): DashboardData {
  const now = new Date();
  const contracts = Object.values(state.contracts);
  const proposals = Object.values(state.proposals);
  const assets = Object.values(state.assets).filter((a) => a.status !== "RETIRED");
  const active = contracts.filter((c) => c.status === "ACTIVE");
  const mrr = active.reduce((sum, c) => sum + c.monthlyPayment, 0);

  const months = Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - (11 - i), 1));
  const mrrSeries = months.map((start) => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const value = contracts
      .filter((c) => REVENUE.includes(c.status) && c.startDate && new Date(c.startDate) < end && (!c.endDate || new Date(c.endDate) > start))
      .reduce((sum, c) => sum + c.monthlyPayment, 0);
    return { month: start.toISOString(), value };
  });

  const count = (statuses: ProposalStatus[]) => proposals.filter((p) => statuses.includes(p.status)).length;
  const won = count(["ACCEPTED", "CONVERTED"]);
  const lost = count(["REJECTED", "EXPIRED"]);
  const open = proposals.filter((p) => OPEN_PROPOSAL_STATUSES.includes(p.status));
  const live = contracts.filter((c) => LIVE.includes(c.status));

  let internal: DashboardData["internal"] = null;
  if (includeInternal) {
    const { rules } = rulesFor(state);
    const revenue = live.reduce((sum, c) => sum + contractValue(c), 0);
    internal = {
      averageMargin: revenue > 0 ? live.reduce((sum, c) => sum + contractValue(c) * c.grossMargin, 0) / revenue : null,
      equipmentInvestment: assets.reduce((sum, a) => sum + a.purchaseCost, 0),
      fleetResidualValue: assets.reduce((sum, a) => {
        const product = state.products[a.productId];
        const floor = product?.defaultResidualPercent ?? rules.defaultResidualPercent;
        const age = a.purchaseDate ? (now.getTime() - Date.parse(a.purchaseDate)) / MONTH_MS : 0;
        const life = product?.expectedLifeMonths;
        return sum + Math.round(a.purchaseCost * Math.min(1, life ? Math.max(floor, 1 - age / life) : floor));
      }, 0),
      minMargin: rules.minMarginPercent,
    };
  }

  return {
    mrr,
    mrrPreviousMonth: mrrSeries.at(-2)?.value ?? 0,
    activeContracts: active.length,
    activeClients: Object.values(state.clients).filter((c) => c.status === "ACTIVE").length,
    openProposals: open.length,
    openPipelineMonthly: open.reduce((sum, p) => sum + p.monthlyPayment, 0),
    conversionRate: won + lost > 0 ? won / (won + lost) : null,
    installedAssets: assets.filter((a) => a.status === "INSTALLED").length,
    contractedRevenue: live.reduce((sum, c) => sum + contractValue(c), 0),
    mrrSeries,
    contractsByStatus: (["ACTIVE", "AWAITING_INSTALLATION", "AWAITING_SIGNATURE", "SUSPENDED", "ENDED"] as ContractStatus[]).map((status) => ({
      status,
      count: contracts.filter((c) => c.status === status).length,
    })),
    pipeline: (["DRAFT", "PRESENTED", "SENT", "VIEWED", "ACCEPTED"] as ProposalStatus[]).map((status) => {
      const rows = proposals.filter((p) => p.status === status);
      return { status, count: rows.length, monthly: rows.reduce((sum, p) => sum + p.monthlyPayment, 0) };
    }),
    activity: state.activity.slice(0, 7).map((a) => ({ id: a.id, summary: a.summary, createdAt: a.createdAt })),
    internal,
  };
}

/** Commercial projection (the same allow-list the real app uses for documents and share links). */
export function commercialProposal(state: DemoState, proposal: ProposalRec): CommercialProposalDTO {
  const client = state.clients[proposal.clientId];
  const support = proposal.supportPlanId ? state.supportPlans[proposal.supportPlanId] : undefined;
  const hydrated = {
    ...proposal,
    createdAt: new Date(proposal.createdAt),
    updatedAt: new Date(proposal.updatedAt),
    validUntil: new Date(proposal.validUntil),
    company: { ...state.company, createdAt: new Date(state.company.createdAt), updatedAt: new Date(state.company.updatedAt) },
    client: { ...client, contacts: client?.contacts ?? [] },
    items: [...proposal.items].sort((a, b) => a.sortOrder - b.sortOrder).map((i) => ({ ...i, proposalId: proposal.id })),
    supportPlan: support ? { ...support, companyId: "company" } : null,
    signatures: proposal.signatures.map((s) => ({ ...s, proposalId: proposal.id, signedAt: new Date(s.signedAt) })),
  };
  return toCommercialProposal(hydrated as unknown as Parameters<typeof toCommercialProposal>[0]);
}
