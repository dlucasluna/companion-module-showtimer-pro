"use server";

import type { ProposalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/auth/session";
import { recordAudit, recordProposalEdit } from "@/lib/database/audit";
import { loadDisplayLookup } from "@/lib/database/display";
import { loadPricingContext } from "@/lib/database/pricing";
import { prisma } from "@/lib/database/prisma";
import { UnknownCatalogItemError, type ProposalConfig } from "@/lib/pricing";
import { PricingValidationError } from "@/lib/pricing";
import { createPublicToken, nextContractNumber, nextProposalNumber } from "@/lib/proposals/identifiers";
import { configFromProposal, persistSignature } from "@/lib/proposals/persistence";
import { buildProposalSnapshot } from "@/lib/proposals/snapshot";
import type { ActionResult } from "@/lib/utils";
import {
  createProposalSchema,
  saveProposalSchema,
  type CreateProposalInput,
  type SaveProposalInput,
  type SignProposalInput,
} from "@/lib/validation/proposal";

const LOCKED_STATUSES: ProposalStatus[] = ["CONVERTED"];
const DAY = 86_400_000;

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof UnknownCatalogItemError) return { ok: false, error: "Um dos equipamentos já não está disponível no catálogo." };
  if (error instanceof PricingValidationError) return { ok: false, error: "Condições comerciais inválidas." };
  if (error instanceof Error && error.name === "ForbiddenError") return { ok: false, error: "Sem permissão para esta ação." };
  console.error(error);
  return { ok: false, error: "Não foi possível concluir a operação." };
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

/** Creates a draft from a preset/template (or empty) and returns its id. */
export async function createProposalAction(input: CreateProposalInput): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireActionPermission("proposals.manage");
    const data = createProposalSchema.parse(input);
    const companyId = session.companyId;

    const [client, plan, company, defaultSupport] = await Promise.all([
      prisma.client.findFirst({ where: { id: data.clientId, companyId }, include: { contacts: { orderBy: { isPrimary: "desc" }, take: 1 } } }),
      data.planId ? prisma.plan.findFirst({ where: { id: data.planId, companyId }, include: { items: true } }) : null,
      prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
      prisma.supportPlan.findFirst({ where: { companyId, isDefault: true, active: true } }),
    ]);
    if (!client) return { ok: false, error: "Cliente não encontrado." };

    const context = await loadPricingContext(companyId, plan?.id);
    const config: ProposalConfig = {
      lines: plan?.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })) ?? [],
      contractMonths: plan?.contractMonths ?? context.defaults.contractMonths,
      upfront: { mode: "percent", value: plan?.upfrontPercent ?? context.defaults.upfrontPercent },
      discount: { mode: "percent", value: 0 },
      supportPlanId: plan?.supportPlanId ?? defaultSupport?.id ?? null,
      monthlyOverride: null,
      targetMargin: null,
      pricesIncludeVat: context.defaults.pricesIncludeVat,
    };
    const snapshot = buildProposalSnapshot(config, context, await loadDisplayLookup(prisma, companyId));

    const proposal = await prisma.$transaction(async (tx) => {
      const created = await tx.proposal.create({
        data: {
          companyId,
          proposalNumber: await nextProposalNumber(tx, companyId, company.proposalPrefix),
          title: data.title,
          clientId: client.id,
          contactName: client.contacts[0]?.name ?? null,
          planId: plan?.id ?? null,
          ...conditionColumns(config),
          vatRate: context.rules.vatRate,
          ...snapshot.totals,
          pricingSnapshot: { ...context.rules },
          publicToken: createPublicToken(),
          validUntil: new Date(Date.now() + company.proposalValidityDays * DAY),
          createdById: session.id,
          updatedById: session.id,
          items: { create: snapshot.items },
        },
      });
      await tx.client.update({ where: { id: client.id }, data: { lastInteractionAt: new Date(), status: client.status === "LEAD" ? "PROSPECT" : client.status } });
      await recordAudit(tx, {
        companyId,
        userId: session.id,
        entityType: "Proposal",
        entityId: created.id,
        action: "proposal.created",
        summary: `${session.name.split(" ")[0]} criou a proposta ${created.proposalNumber}${plan ? ` a partir de ${plan.name}` : ""}`,
      });
      return created;
    });

    revalidatePath("/proposals");
    return { ok: true, data: { id: proposal.id } };
  } catch (error) {
    return failure(error);
  }
}

/** Autosave target. Re-prices on the server with database costs — client totals are never trusted. */
export async function saveProposalAction(input: SaveProposalInput): Promise<ActionResult<{ savedAt: string; monthlyPayment: number }>> {
  try {
    const session = await requireActionPermission("proposals.manage");
    const parsed = saveProposalSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const { id, config, planId, title } = parsed.data;
    const companyId = session.companyId;

    const existing = await prisma.proposal.findFirst({ where: { id, companyId }, include: { items: true } });
    if (!existing) return { ok: false, error: "Proposta não encontrada." };
    if (LOCKED_STATUSES.includes(existing.status)) return { ok: false, error: "Propostas convertidas em contrato não podem ser alteradas." };
    if (planId && !(await prisma.plan.findFirst({ where: { id: planId, companyId }, select: { id: true } }))) {
      return { ok: false, error: "Plano inválido." };
    }
    if (config.supportPlanId && !(await prisma.supportPlan.findFirst({ where: { id: config.supportPlanId, companyId }, select: { id: true } }))) {
      return { ok: false, error: "Plano de suporte inválido." };
    }

    // Merge duplicate product lines defensively (one line per product in the configurator).
    const lines = new Map<string, (typeof config.lines)[number]>();
    for (const line of config.lines) if (line.quantity > 0) lines.set(line.productId, line);
    const cleanConfig = { ...config, lines: [...lines.values()] };

    const context = await loadPricingContext(companyId, planId);
    const snapshot = buildProposalSnapshot(cleanConfig, context, await loadDisplayLookup(prisma, companyId));

    const updated = await prisma.$transaction(async (tx) => {
      await tx.proposalItem.deleteMany({ where: { proposalId: id } });
      const saved = await tx.proposal.update({
        where: { id },
        data: {
          title,
          planId,
          ...conditionColumns(cleanConfig),
          vatRate: context.rules.vatRate,
          ...snapshot.totals,
          pricingSnapshot: { ...context.rules },
          updatedById: session.id,
          items: { create: snapshot.items },
        },
      });
      await recordProposalEdit(tx, {
        companyId,
        userId: session.id,
        userName: session.name,
        proposalId: id,
        before: {
          items: existing.items.map((i) => ({ productId: i.productId, displayName: i.displayName, quantity: i.quantity })),
          conditions: { contractMonths: existing.contractMonths, initialPayment: existing.initialPayment, monthlyPayment: existing.monthlyPayment },
        },
        after: {
          items: snapshot.items.map((i) => ({ productId: i.productId, displayName: i.displayName, quantity: i.quantity })),
          conditions: { contractMonths: cleanConfig.contractMonths, initialPayment: snapshot.totals.initialPayment, monthlyPayment: snapshot.totals.monthlyPayment },
        },
      });
      return saved;
    });

    return { ok: true, data: { savedAt: updated.updatedAt.toISOString(), monthlyPayment: updated.monthlyPayment } };
  } catch (error) {
    return failure(error);
  }
}

export async function duplicateProposalAction(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireActionPermission("proposals.manage");
    const companyId = session.companyId;
    const source = await prisma.proposal.findFirst({ where: { id, companyId }, include: { items: true } });
    if (!source) return { ok: false, error: "Proposta não encontrada." };
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

    const context = await loadPricingContext(companyId, source.planId);
    const config = configFromProposal(source);
    const snapshot = buildProposalSnapshot(config, context, await loadDisplayLookup(prisma, companyId));

    const copy = await prisma.$transaction(async (tx) => {
      const created = await tx.proposal.create({
        data: {
          companyId,
          proposalNumber: await nextProposalNumber(tx, companyId, company.proposalPrefix),
          title: source.title,
          clientId: source.clientId,
          contactName: source.contactName,
          planId: source.planId,
          ...conditionColumns(config),
          vatRate: context.rules.vatRate,
          ...snapshot.totals,
          pricingSnapshot: { ...context.rules },
          notes: source.notes,
          publicToken: createPublicToken(),
          validUntil: new Date(Date.now() + company.proposalValidityDays * DAY),
          createdById: session.id,
          updatedById: session.id,
          items: { create: snapshot.items },
        },
      });
      await recordAudit(tx, {
        companyId,
        userId: session.id,
        entityType: "Proposal",
        entityId: created.id,
        action: "proposal.duplicated",
        summary: `${session.name.split(" ")[0]} duplicou ${source.proposalNumber}`,
      });
      return created;
    });

    revalidatePath("/proposals");
    return { ok: true, data: { id: copy.id } };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteProposalAction(id: string): Promise<ActionResult> {
  try {
    const session = await requireActionPermission("proposals.manage");
    const proposal = await prisma.proposal.findFirst({ where: { id, companyId: session.companyId } });
    if (!proposal) return { ok: false, error: "Proposta não encontrada." };
    if (proposal.status === "CONVERTED") return { ok: false, error: "Propostas convertidas não podem ser eliminadas." };
    await prisma.proposal.delete({ where: { id } });
    revalidatePath("/proposals");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

/** Saves the current configuration as a reusable template (e.g. "Broadcast Church 2 Cameras"). */
export async function saveAsTemplateAction(id: string, name: string): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireActionPermission("templates.manage");
    const trimmed = name.trim();
    if (trimmed.length < 2) return { ok: false, error: "Indique um nome para o template." };
    const source = await prisma.proposal.findFirst({ where: { id, companyId: session.companyId }, include: { items: true } });
    if (!source) return { ok: false, error: "Proposta não encontrada." };

    const baseSlug = trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const upfrontPercent = source.upfrontMode === "PERCENT" ? source.upfrontValue : null;

    const template = await prisma.plan.create({
      data: {
        companyId: session.companyId,
        name: trimmed,
        slug,
        kind: "TEMPLATE",
        tagline: `Template de ${session.name.split(" ")[0]}`,
        description: `${source.items.reduce((sum, i) => sum + i.quantity, 0)} itens · ${source.contractMonths} meses`,
        supportPlanId: source.supportPlanId,
        contractMonths: source.contractMonths,
        upfrontPercent,
        createdById: session.id,
        items: { create: source.items.map((i, index) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity, sortOrder: index })) },
      },
    });
    await recordAudit(prisma, {
      companyId: session.companyId,
      userId: session.id,
      entityType: "Plan",
      entityId: template.id,
      action: "template.created",
      summary: `${session.name.split(" ")[0]} guardou o template "${trimmed}" a partir de ${source.proposalNumber}`,
    });
    revalidatePath("/plans");
    return { ok: true, data: { id: template.id } };
  } catch (error) {
    return failure(error);
  }
}

const STATUS_TIMESTAMPS: Partial<Record<ProposalStatus, "presentedAt" | "sentAt" | "acceptedAt" | "rejectedAt">> = {
  PRESENTED: "presentedAt",
  SENT: "sentAt",
  ACCEPTED: "acceptedAt",
  REJECTED: "rejectedAt",
};

const STATUS_ORDER: ProposalStatus[] = ["DRAFT", "PRESENTED", "SENT", "VIEWED", "ACCEPTED"];

/** Moves a proposal forward (never backwards automatically, e.g. presenting an already sent proposal). */
export async function markProposalStatusAction(id: string, status: ProposalStatus, options: { force?: boolean } = {}): Promise<ActionResult> {
  try {
    const session = await requireActionPermission("proposals.manage");
    const proposal = await prisma.proposal.findFirst({ where: { id, companyId: session.companyId } });
    if (!proposal) return { ok: false, error: "Proposta não encontrada." };
    if (proposal.status === "CONVERTED") return { ok: true, data: undefined };

    const forward = STATUS_ORDER.indexOf(status) > STATUS_ORDER.indexOf(proposal.status);
    if (!forward && !options.force) return { ok: true, data: undefined };

    const stamp = STATUS_TIMESTAMPS[status];
    await prisma.proposal.update({ where: { id }, data: { status, ...(stamp ? { [stamp]: new Date() } : {}) } });
    await recordAudit(prisma, {
      companyId: session.companyId,
      userId: session.id,
      entityType: "Proposal",
      entityId: id,
      action: `proposal.status.${status.toLowerCase()}`,
      summary: `${session.name.split(" ")[0]} marcou a proposta como ${status.toLowerCase()}`,
    });
    revalidatePath("/proposals");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

/** Signature captured on the seller's device ("Assinar agora"). */
export async function signProposalAction(id: string, input: SignProposalInput): Promise<ActionResult> {
  try {
    const session = await requireActionPermission("proposals.manage");
    const proposal = await prisma.proposal.findFirst({ where: { id, companyId: session.companyId } });
    if (!proposal) return { ok: false, error: "Proposta não encontrada." };
    return await persistSignature(proposal.id, proposal.companyId, input, session.id);
  } catch (error) {
    return failure(error);
  }
}

/** Creates a contract (awaiting installation) from an accepted proposal. */
export async function convertToContractAction(id: string): Promise<ActionResult<{ contractId: string }>> {
  try {
    const session = await requireActionPermission("proposals.manage");
    const companyId = session.companyId;
    const proposal = await prisma.proposal.findFirst({ where: { id, companyId }, include: { items: true, resultingContract: true } });
    if (!proposal) return { ok: false, error: "Proposta não encontrada." };
    if (proposal.resultingContract) return { ok: true, data: { contractId: proposal.resultingContract.id } };
    if (proposal.items.length === 0) return { ok: false, error: "A proposta não tem equipamentos." };
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });

    const contract = await prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          companyId,
          contractNumber: await nextContractNumber(tx, companyId, company.contractPrefix),
          clientId: proposal.clientId,
          proposalId: proposal.id,
          supportPlanId: proposal.supportPlanId,
          status: proposal.status === "ACCEPTED" ? "AWAITING_INSTALLATION" : "AWAITING_SIGNATURE",
          contractMonths: proposal.contractMonths,
          initialPayment: proposal.initialPayment,
          monthlyPayment: proposal.monthlyPayment,
          vatRate: proposal.vatRate,
          internalCost: proposal.internalCost,
          grossMargin: proposal.grossMargin,
          signedAt: proposal.acceptedAt,
          items: {
            create: proposal.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              displayName: item.displayName,
              internalUnitCost: item.internalUnitCost,
            })),
          },
        },
      });
      await tx.proposal.update({ where: { id }, data: { status: "CONVERTED" } });
      await tx.client.update({ where: { id: proposal.clientId }, data: { status: "ACTIVE" } });
      await recordAudit(tx, {
        companyId,
        userId: session.id,
        entityType: "Proposal",
        entityId: id,
        action: "proposal.converted",
        summary: `${session.name.split(" ")[0]} converteu a proposta no contrato ${created.contractNumber}`,
      });
      return created;
    });

    revalidatePath("/contracts");
    revalidatePath("/proposals");
    return { ok: true, data: { contractId: contract.id } };
  } catch (error) {
    return failure(error);
  }
}
