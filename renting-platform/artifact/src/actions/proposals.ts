import type { ProposalStatus } from "@prisma/client";
import { UnknownCatalogItemError, PricingValidationError, type ProposalConfig } from "@/lib/pricing";
import { describeConditionChanges, describeItemChanges, type ConditionsSnapshot, type HistoryItem } from "@/lib/proposals/history";
import { buildProposalSnapshot } from "@/lib/proposals/snapshot";
import { formatMoney } from "@/lib/formatters";
import type { ActionResult } from "@/lib/utils";
import {
  createProposalSchema,
  saveProposalSchema,
  signProposalSchema,
  type CreateProposalInput,
  type SaveProposalInput,
  type SignProposalInput,
} from "@/lib/validation/proposal";
import { displayLookup, pricingContext } from "../data/derive";
import { commit, current, logActivity } from "../data/store";
import type { ContractRec, DemoState, HistoryRec, PlanRec, ProposalRec } from "../data/types";
import type { Dirty } from "../data/persistence";
import { newId, newToken } from "../ids";
import { authorize, firstName, nowIso, run } from "./common";

const DAY = 86_400_000;
const LOCKED: ProposalStatus[] = ["CONVERTED"];
const MERGE_WINDOW_MS = 10 * 60 * 1000;

function friendly(error: unknown): ActionResult<never> {
  if (error instanceof UnknownCatalogItemError) return { ok: false, error: "Um dos equipamentos já não está disponível no catálogo." };
  if (error instanceof PricingValidationError) return { ok: false, error: "Condições comerciais inválidas." };
  throw error;
}

export function configFromRecord(p: ProposalRec): ProposalConfig {
  return {
    lines: p.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    contractMonths: p.contractMonths,
    upfront: p.upfrontMode === "PERCENT" ? { mode: "percent", value: p.upfrontValue } : { mode: "amount", value: Math.round(p.upfrontValue) },
    discount: p.discountMode === "PERCENT" ? { mode: "percent", value: p.discountValue } : { mode: "amount", value: Math.round(p.discountValue) },
    supportPlanId: p.supportPlanId,
    monthlyOverride: p.monthlyOverride,
    targetMargin: p.targetMargin,
    pricesIncludeVat: p.pricesIncludeVat,
  };
}

function conditionColumns(config: ProposalConfig) {
  return {
    contractMonths: config.contractMonths,
    upfrontMode: config.upfront.mode === "percent" ? ("PERCENT" as const) : ("AMOUNT" as const),
    upfrontValue: config.upfront.value,
    discountMode: config.discount.mode === "percent" ? ("PERCENT" as const) : ("AMOUNT" as const),
    discountValue: config.discount.value,
    supportPlanId: config.supportPlanId,
    monthlyOverride: config.monthlyOverride,
    targetMargin: config.targetMargin,
    pricesIncludeVat: config.pricesIncludeVat,
  };
}

function nextNumber(values: string[], prefix: string): string {
  const year = new Date().getFullYear();
  const start = `${prefix}-${year}-`;
  const last = values.filter((v) => v.startsWith(start)).sort().at(-1);
  const sequence = last ? Number.parseInt(last.split("-").at(-1) ?? "0", 10) + 1 : 1;
  return `${start}${String(sequence).padStart(4, "0")}`;
}

function snapshotFor(state: DemoState, config: ProposalConfig, planId: string | null) {
  const context = pricingContext(state, planId);
  return { context, snapshot: buildProposalSnapshot(config, context, displayLookup(state)) };
}

function history(userId: string | null, action: string, summary: string, changes?: unknown): HistoryRec {
  const now = nowIso();
  return { id: newId(), userId, action, summary, changes, createdAt: now, updatedAt: now };
}

function withProposal(state: DemoState, proposal: ProposalRec): DemoState {
  return { ...state, proposals: { ...state.proposals, [proposal.id]: proposal } };
}

export async function createProposalAction(input: CreateProposalInput): Promise<ActionResult<{ id: string }>> {
  return run(() => {
    const { user, state } = authorize("proposals.manage");
    const data = createProposalSchema.parse(input);
    const client = state.clients[data.clientId];
    if (!client) return { ok: false, error: "Cliente não encontrado." };
    const plan: PlanRec | null = data.planId ? (state.plans[data.planId] ?? null) : null;
    const defaultSupport = Object.values(state.supportPlans).find((p) => p.isDefault && p.active);
    const context = pricingContext(state, plan?.id);
    const config: ProposalConfig = {
      lines: plan?.items.map((i) => ({ ...i })) ?? [],
      contractMonths: plan?.contractMonths ?? context.defaults.contractMonths,
      upfront: { mode: "percent", value: plan?.upfrontPercent ?? context.defaults.upfrontPercent },
      discount: { mode: "percent", value: 0 },
      supportPlanId: plan?.supportPlanId ?? defaultSupport?.id ?? null,
      monthlyOverride: null,
      targetMargin: null,
      pricesIncludeVat: context.defaults.pricesIncludeVat,
    };
    let snapshot;
    try {
      snapshot = snapshotFor(state, config, plan?.id ?? null).snapshot;
    } catch (error) {
      return friendly(error);
    }
    const now = nowIso();
    const id = newId();
    const number = nextNumber(Object.values(state.proposals).map((p) => p.proposalNumber), state.company.proposalPrefix);
    const summary = `${firstName(user)} criou a proposta ${number}${plan ? ` a partir de ${plan.name}` : ""}`;
    const proposal: ProposalRec = {
      id,
      proposalNumber: number,
      title: data.title,
      status: "DRAFT",
      kind: "NEW",
      clientId: client.id,
      contactName: client.contacts.find((c) => c.isPrimary)?.name ?? client.contacts[0]?.name ?? null,
      planId: plan?.id ?? null,
      contractId: null,
      ...conditionColumns(config),
      vatRate: context.rules.vatRate,
      ...snapshot.totals,
      notes: null,
      publicToken: newToken(),
      validUntil: new Date(Date.now() + state.company.proposalValidityDays * DAY).toISOString(),
      presentedAt: null,
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      createdById: user.id,
      updatedById: user.id,
      createdAt: now,
      updatedAt: now,
      items: snapshot.items.map((i) => ({ id: newId(), ...i })),
      signatures: [],
      history: [history(user.id, "proposal.created", summary)],
    };
    const clientUpdate = { ...client, lastInteractionAt: now, status: client.status === "LEAD" ? ("PROSPECT" as const) : client.status };
    const logged = logActivity({ ...withProposal(state, proposal), clients: { ...state.clients, [client.id]: clientUpdate } }, summary);
    commit(logged.state, [{ collection: "proposals", id }, { collection: "clients", id: client.id }, logged.dirty]);
    return { ok: true, data: { id } };
  });
}

interface EditSnapshot {
  items: HistoryItem[];
  conditions: ConditionsSnapshot;
}

/** Same coalescing as the server: one entry per user per 10 minutes. */
function recordEdit(proposal: ProposalRec, userId: string, userName: string, before: EditSnapshot, after: EditSnapshot): HistoryRec[] {
  const summarize = (from: EditSnapshot) => {
    const parts = [...describeItemChanges(from.items, after.items), ...describeConditionChanges(from.conditions, after.conditions, (c) => formatMoney(c))];
    return parts.length ? `${userName.split(" ")[0]} ${parts.join("; ")}` : null;
  };
  const [last, ...rest] = [...proposal.history].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const mergeable = last && last.action === "proposal.edited" && last.userId === userId && Date.now() - Date.parse(last.updatedAt) < MERGE_WINDOW_MS;
  if (mergeable) {
    const origin = (last.changes as { before: EditSnapshot }).before;
    const summary = summarize(origin);
    if (!summary) return rest;
    return [{ ...last, summary, changes: { before: origin, after }, updatedAt: nowIso() }, ...rest];
  }
  const summary = summarize(before);
  if (!summary) return proposal.history;
  return [history(userId, "proposal.edited", summary, { before, after }), ...proposal.history].slice(0, 40);
}

export async function saveProposalAction(input: SaveProposalInput): Promise<ActionResult<{ savedAt: string; monthlyPayment: number }>> {
  return run(() => {
    const { user, state } = authorize("proposals.manage");
    const parsed = saveProposalSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const { id, config, planId, title } = parsed.data;
    const existing = state.proposals[id];
    if (!existing) return { ok: false, error: "Proposta não encontrada." };
    if (LOCKED.includes(existing.status)) return { ok: false, error: "Propostas convertidas em contrato não podem ser alteradas." };
    if (planId && !state.plans[planId]) return { ok: false, error: "Plano inválido." };
    if (config.supportPlanId && !state.supportPlans[config.supportPlanId]) return { ok: false, error: "Plano de suporte inválido." };

    const lines = new Map<string, (typeof config.lines)[number]>();
    for (const line of config.lines) if (line.quantity > 0) lines.set(line.productId, line);
    const clean = { ...config, lines: [...lines.values()] };
    let result;
    try {
      result = snapshotFor(state, clean, planId);
    } catch (error) {
      return friendly(error);
    }
    const { context, snapshot } = result;
    // Strictly increasing timestamps keep the autosave's "newer snapshot" check correct.
    const savedAt = new Date(Math.max(Date.now(), Date.parse(existing.updatedAt) + 1)).toISOString();
    const proposal: ProposalRec = {
      ...existing,
      title,
      planId,
      ...conditionColumns(clean),
      vatRate: context.rules.vatRate,
      ...snapshot.totals,
      updatedById: user.id,
      updatedAt: savedAt,
      items: snapshot.items.map((i) => ({ id: newId(), ...i })),
      history: recordEdit(
        existing,
        user.id,
        user.name,
        {
          items: existing.items.map((i) => ({ productId: i.productId, displayName: i.displayName, quantity: i.quantity })),
          conditions: { contractMonths: existing.contractMonths, initialPayment: existing.initialPayment, monthlyPayment: existing.monthlyPayment },
        },
        {
          items: snapshot.items.map((i) => ({ productId: i.productId, displayName: i.displayName, quantity: i.quantity })),
          conditions: { contractMonths: clean.contractMonths, initialPayment: snapshot.totals.initialPayment, monthlyPayment: snapshot.totals.monthlyPayment },
        },
      ),
    };
    commit(withProposal(state, proposal), [{ collection: "proposals", id }]);
    return { ok: true, data: { savedAt, monthlyPayment: proposal.monthlyPayment } };
  });
}

export async function duplicateProposalAction(id: string): Promise<ActionResult<{ id: string }>> {
  return run(() => {
    const { user, state } = authorize("proposals.manage");
    const source = state.proposals[id];
    if (!source) return { ok: false, error: "Proposta não encontrada." };
    const config = configFromRecord(source);
    let result;
    try {
      result = snapshotFor(state, config, source.planId);
    } catch (error) {
      return friendly(error);
    }
    const now = nowIso();
    const copyId = newId();
    const number = nextNumber(Object.values(state.proposals).map((p) => p.proposalNumber), state.company.proposalPrefix);
    const summary = `${firstName(user)} duplicou ${source.proposalNumber}`;
    const copy: ProposalRec = {
      ...source,
      id: copyId,
      proposalNumber: number,
      status: "DRAFT",
      ...conditionColumns(config),
      vatRate: result.context.rules.vatRate,
      ...result.snapshot.totals,
      contractId: null,
      publicToken: newToken(),
      validUntil: new Date(Date.now() + state.company.proposalValidityDays * DAY).toISOString(),
      presentedAt: null,
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      createdById: user.id,
      updatedById: user.id,
      createdAt: now,
      updatedAt: now,
      items: result.snapshot.items.map((i) => ({ id: newId(), ...i })),
      signatures: [],
      history: [history(user.id, "proposal.duplicated", summary)],
    };
    const logged = logActivity(withProposal(state, copy), summary);
    commit(logged.state, [{ collection: "proposals", id: copyId }, logged.dirty]);
    return { ok: true, data: { id: copyId } };
  });
}

export async function deleteProposalAction(id: string): Promise<ActionResult> {
  return run(() => {
    const { state } = authorize("proposals.manage");
    const proposal = state.proposals[id];
    if (!proposal) return { ok: false, error: "Proposta não encontrada." };
    if (proposal.status === "CONVERTED") return { ok: false, error: "Propostas convertidas não podem ser eliminadas." };
    const proposals = { ...state.proposals };
    delete proposals[id];
    commit({ ...state, proposals }, [{ collection: "proposals", id }]);
    return { ok: true, data: undefined };
  });
}

export async function saveAsTemplateAction(id: string, name: string): Promise<ActionResult<{ id: string }>> {
  return run(() => {
    const { user, state } = authorize("templates.manage");
    const trimmed = name.trim();
    if (trimmed.length < 2) return { ok: false, error: "Indique um nome para o template." };
    const source = state.proposals[id];
    if (!source) return { ok: false, error: "Proposta não encontrada." };
    const planId = newId();
    const slug =
      trimmed
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + `-${Date.now().toString(36)}`;
    const plan: PlanRec = {
      id: planId,
      name: trimmed,
      slug,
      kind: "TEMPLATE",
      tagline: `Template de ${firstName(user)}`,
      description: `${source.items.reduce((sum, i) => sum + i.quantity, 0)} itens · ${source.contractMonths} meses`,
      highlight: null,
      supportPlanId: source.supportPlanId,
      contractMonths: source.contractMonths,
      upfrontPercent: source.upfrontMode === "PERCENT" ? source.upfrontValue : null,
      active: true,
      sortOrder: 0,
      createdById: user.id,
      createdAt: nowIso(),
      items: source.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    };
    const logged = logActivity({ ...state, plans: { ...state.plans, [planId]: plan } }, `${firstName(user)} guardou o template "${trimmed}"`);
    commit(logged.state, [{ collection: "plans", id: planId }, logged.dirty]);
    return { ok: true, data: { id: planId } };
  });
}

const STAMPS: Partial<Record<ProposalStatus, keyof ProposalRec>> = {
  PRESENTED: "presentedAt",
  SENT: "sentAt",
  ACCEPTED: "acceptedAt",
  REJECTED: "rejectedAt",
};
const ORDER: ProposalStatus[] = ["DRAFT", "PRESENTED", "SENT", "VIEWED", "ACCEPTED"];

export async function markProposalStatusAction(id: string, status: ProposalStatus, options: { force?: boolean } = {}): Promise<ActionResult> {
  return run(() => {
    const { user, state } = authorize("proposals.manage");
    const proposal = state.proposals[id];
    if (!proposal) return { ok: false, error: "Proposta não encontrada." };
    if (proposal.status === "CONVERTED") return { ok: true, data: undefined };
    if (!(ORDER.indexOf(status) > ORDER.indexOf(proposal.status)) && !options.force) return { ok: true, data: undefined };
    const stamp = STAMPS[status];
    const updated: ProposalRec = {
      ...proposal,
      status,
      ...(stamp ? { [stamp]: nowIso() } : {}),
      history: [history(user.id, `proposal.status.${status.toLowerCase()}`, `${firstName(user)} marcou a proposta como ${status.toLowerCase()}`), ...proposal.history].slice(0, 40),
    };
    commit(withProposal(state, updated), [{ collection: "proposals", id }]);
    return { ok: true, data: undefined };
  });
}

export async function signProposalAction(id: string, input: SignProposalInput): Promise<ActionResult> {
  return run(() => {
    authorize("proposals.manage");
    return persistSignature(id, input, true);
  });
}

export function persistSignature(id: string, input: SignProposalInput, bySeller: boolean): ActionResult {
  const state = current();
  const proposal = state.proposals[id];
  if (!proposal) return { ok: false, error: "Proposta não encontrada." };
  const parsed = signProposalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const now = nowIso();
  const summary = `${d.signerName} assinou e aceitou a proposta${bySeller ? "" : " (link)"}`;
  const updated: ProposalRec = {
    ...proposal,
    status: "ACCEPTED",
    acceptedAt: now,
    signatures: [
      ...proposal.signatures,
      {
        id: newId(),
        signerName: d.signerName,
        signerEmail: d.signerEmail || null,
        signerRole: d.signerRole || null,
        method: d.imageData ? "DRAWN" : "TYPED",
        imageData: d.imageData,
        acceptedTerms: true,
        signedAt: now,
      },
    ],
    history: [history(null, "proposal.signed", summary), ...proposal.history].slice(0, 40),
  };
  const logged = logActivity(withProposal(state, updated), `${summary} — ${proposal.proposalNumber}`);
  commit(logged.state, [{ collection: "proposals", id }, logged.dirty]);
  return { ok: true, data: undefined };
}

export async function convertToContractAction(id: string): Promise<ActionResult<{ contractId: string }>> {
  return run(() => {
    const { user, state } = authorize("proposals.manage");
    const proposal = state.proposals[id];
    if (!proposal) return { ok: false, error: "Proposta não encontrada." };
    const existing = Object.values(state.contracts).find((c) => c.proposalId === id);
    if (existing) return { ok: true, data: { contractId: existing.id } };
    if (proposal.items.length === 0) return { ok: false, error: "A proposta não tem equipamentos." };
    const contractId = newId();
    const number = nextNumber(Object.values(state.contracts).map((c) => c.contractNumber), state.company.contractPrefix);
    const contract: ContractRec = {
      id: contractId,
      contractNumber: number,
      clientId: proposal.clientId,
      proposalId: id,
      supportPlanId: proposal.supportPlanId,
      status: proposal.status === "ACCEPTED" ? "AWAITING_INSTALLATION" : "AWAITING_SIGNATURE",
      startDate: null,
      endDate: null,
      contractMonths: proposal.contractMonths,
      initialPayment: proposal.initialPayment,
      monthlyPayment: proposal.monthlyPayment,
      vatRate: proposal.vatRate,
      internalCost: proposal.internalCost,
      grossMargin: proposal.grossMargin,
      version: 1,
      signedAt: proposal.acceptedAt,
      createdAt: nowIso(),
      items: proposal.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity, displayName: i.displayName, internalUnitCost: i.internalUnitCost })),
    };
    const summary = `${firstName(user)} converteu ${proposal.proposalNumber} no contrato ${number}`;
    const client = state.clients[proposal.clientId];
    const next: DemoState = {
      ...withProposal(state, { ...proposal, status: "CONVERTED", history: [history(user.id, "proposal.converted", summary), ...proposal.history].slice(0, 40) }),
      contracts: { ...state.contracts, [contractId]: contract },
      clients: client ? { ...state.clients, [client.id]: { ...client, status: "ACTIVE" } } : state.clients,
    };
    const logged = logActivity(next, summary);
    const dirty: Dirty[] = [{ collection: "proposals", id }, { collection: "contracts", id: contractId }, logged.dirty];
    if (client) dirty.push({ collection: "clients", id: client.id });
    commit(logged.state, dirty);
    return { ok: true, data: { contractId } };
  });
}
