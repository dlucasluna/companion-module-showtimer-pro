"use server";

import { revalidatePath } from "next/cache";
import { ROLES, type RoleName } from "@/lib/auth/permissions";
import { requireActionPermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/database/audit";
import { prisma } from "@/lib/database/prisma";
import type { ActionResult } from "@/lib/utils";
import { guarded } from "./guard";
import {
  companySchema,
  planRuleSchema,
  pricingRuleSchema,
  supportPlanSchema,
  type CompanyInput,
  type PlanRuleInput,
  type PricingRuleInput,
  type SupportPlanInput,
} from "@/lib/validation/settings";

const blank = (value: string | undefined) => (value && value.length > 0 ? value : null);
const firstIssue = (issues: { message: string }[]) => issues[0]?.message ?? "Dados inválidos.";

export async function updateCompanyAction(input: CompanyInput): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireActionPermission("settings.manage");
    const parsed = companySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
    const d = parsed.data;
    await prisma.company.update({
      where: { id: session.companyId },
      data: {
        name: d.name,
        legalName: blank(d.legalName),
        taxId: blank(d.taxId),
        email: blank(d.email),
        phone: blank(d.phone),
        website: blank(d.website),
        address: blank(d.address),
        city: blank(d.city),
        postalCode: blank(d.postalCode),
        tagline: blank(d.tagline),
        locale: d.locale,
        proposalPrefix: d.proposalPrefix,
        proposalValidityDays: d.proposalValidityDays,
        proposalTerms: blank(d.proposalTerms),
      },
    });
    await recordAudit(prisma, { companyId: session.companyId, userId: session.id, entityType: "Company", entityId: session.companyId, action: "company.updated", summary: `${session.name.split(" ")[0]} atualizou os dados da empresa` });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  });
}

export async function updatePricingRuleAction(input: PricingRuleInput): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireActionPermission("settings.manage");
    const parsed = pricingRuleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
    const d = parsed.data;
    const months = d.allowedContractMonths.split(",").map((m) => Number.parseInt(m.trim(), 10));
    if (!months.includes(d.defaultContractMonths)) return { ok: false, error: "A duração padrão tem de estar entre as durações permitidas." };

    const data = { ...d, allowedContractMonths: months.sort((a, b) => a - b).join(",") };
    const existing = await prisma.pricingRule.findFirst({ where: { companyId: session.companyId, scope: "GLOBAL" } });
    if (existing) await prisma.pricingRule.update({ where: { id: existing.id }, data });
    else await prisma.pricingRule.create({ data: { ...data, companyId: session.companyId, scope: "GLOBAL" } });

    await recordAudit(prisma, {
      companyId: session.companyId,
      userId: session.id,
      entityType: "PricingRule",
      entityId: existing?.id ?? "global",
      action: "pricing.updated",
      summary: `${session.name.split(" ")[0]} atualizou as regras de pricing (multiplicador ${d.targetMultiplier}×, margem mínima ${Math.round(d.minMarginPercent * 100)}%)`,
      changes: { before: existing ? { ...existing, createdAt: undefined, updatedAt: undefined } : null, after: data },
    });
    revalidatePath("/", "layout");
    return { ok: true, data: undefined };
  });
}

export async function updatePlanRuleAction(planId: string, input: PlanRuleInput): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireActionPermission("plans.manage");
    const parsed = planRuleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
    const plan = await prisma.plan.findFirst({ where: { id: planId, companyId: session.companyId } });
    if (!plan) return { ok: false, error: "Plano não encontrado." };
    const empty = Object.values(parsed.data).every((v) => v === null);
    const existing = await prisma.pricingRule.findUnique({ where: { planId } });
    if (empty) {
      if (existing) await prisma.pricingRule.delete({ where: { id: existing.id } });
    } else if (existing) await prisma.pricingRule.update({ where: { id: existing.id }, data: parsed.data });
    else await prisma.pricingRule.create({ data: { ...parsed.data, companyId: session.companyId, scope: "PLAN", planId } });
    revalidatePath("/plans");
    return { ok: true, data: undefined };
  });
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireActionPermission("templates.manage");
    const plan = await prisma.plan.findFirst({ where: { id: planId, companyId: session.companyId } });
    if (!plan) return { ok: false, error: "Plano não encontrado." };
    const canManagePresets = session.permissions.includes("plans.manage");
    if (plan.kind === "PRESET" && !canManagePresets) return { ok: false, error: "Apenas administradores podem remover planos base." };
    if (plan.kind === "TEMPLATE" && plan.createdById !== session.id && !canManagePresets) return { ok: false, error: "Só pode remover os seus templates." };
    // Soft delete keeps historical proposals linked to the plan.
    await prisma.plan.update({ where: { id: planId }, data: { active: false } });
    revalidatePath("/plans");
    return { ok: true, data: undefined };
  });
}

export async function updateSupportPlanAction(id: string, input: SupportPlanInput): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireActionPermission("settings.manage");
    const parsed = supportPlanSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: firstIssue(parsed.error.issues) };
    const plan = await prisma.supportPlan.findFirst({ where: { id, companyId: session.companyId } });
    if (!plan) return { ok: false, error: "Plano de suporte não encontrado." };
    await prisma.supportPlan.update({ where: { id }, data: parsed.data });
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  });
}

export async function updateUserRoleAction(userId: string, role: RoleName): Promise<ActionResult> {
  return guarded(async () => {
    const session = await requireActionPermission("settings.manage");
    if (!ROLES.includes(role) || role === "CLIENT") return { ok: false, error: "Função inválida." };
    if (userId === session.id) return { ok: false, error: "Não pode alterar a sua própria função." };
    const user = await prisma.user.findFirst({ where: { id: userId, companyId: session.companyId } });
    if (!user) return { ok: false, error: "Utilizador não encontrado." };
    await prisma.user.update({ where: { id: userId }, data: { role } });
    await recordAudit(prisma, { companyId: session.companyId, userId: session.id, entityType: "User", entityId: userId, action: "user.role", summary: `${session.name.split(" ")[0]} alterou a função de ${user.name} para ${role}` });
    revalidatePath("/settings");
    return { ok: true, data: undefined };
  });
}
