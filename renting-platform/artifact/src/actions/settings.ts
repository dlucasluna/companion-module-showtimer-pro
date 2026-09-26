import { ROLES, type RoleName } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/utils";
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
import { globalRule, planRule } from "../data/derive";
import { commit, logActivity } from "../data/store";
import type { PricingRuleRec } from "../data/types";
import { newId } from "../ids";
import { authorize, blank, firstName, nowIso, run } from "./common";

const EMPTY_RULE: Omit<PricingRuleRec, "id" | "scope" | "planId"> = {
  targetMultiplier: null,
  defaultUpfrontPercent: null,
  defaultContractMonths: null,
  riskReservePercent: null,
  maintenanceReservePercent: null,
  defaultResidualPercent: null,
  residualCreditPercent: null,
  vatRate: null,
  minMarginPercent: null,
  pricesIncludeVat: null,
  roundMonthlyTo: null,
  roundUpfrontTo: null,
  allowedContractMonths: null,
};

export async function updateCompanyAction(input: CompanyInput): Promise<ActionResult> {
  return run(() => {
    const { user, state } = authorize("settings.manage");
    const parsed = companySchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;
    const company = {
      ...state.company,
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
      updatedAt: nowIso(),
    };
    const logged = logActivity({ ...state, company }, `${firstName(user)} atualizou os dados da empresa`);
    commit(logged.state, [{ doc: "company" }, logged.dirty]);
    return { ok: true, data: undefined };
  });
}

export async function updatePricingRuleAction(input: PricingRuleInput): Promise<ActionResult> {
  return run(() => {
    const { user, state } = authorize("settings.manage");
    const parsed = pricingRuleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;
    const months = d.allowedContractMonths.split(",").map((m) => Number.parseInt(m.trim(), 10));
    if (!months.includes(d.defaultContractMonths)) return { ok: false, error: "A duração padrão tem de estar entre as durações permitidas." };
    const existing = globalRule(state);
    const rule: PricingRuleRec = {
      ...(existing ?? { id: newId(), scope: "GLOBAL", planId: null, ...EMPTY_RULE }),
      ...d,
      allowedContractMonths: months.sort((a, b) => a - b).join(","),
    };
    const logged = logActivity(
      { ...state, pricingRules: { ...state.pricingRules, [rule.id]: rule } },
      `${firstName(user)} atualizou as regras de pricing (multiplicador ${d.targetMultiplier}×, margem mínima ${Math.round(d.minMarginPercent * 100)}%)`,
    );
    commit(logged.state, [{ collection: "pricingRules", id: rule.id }, logged.dirty]);
    return { ok: true, data: undefined };
  });
}

export async function updatePlanRuleAction(planId: string, input: PlanRuleInput): Promise<ActionResult> {
  return run(() => {
    const { state } = authorize("plans.manage");
    const parsed = planRuleSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    if (!state.plans[planId]) return { ok: false, error: "Plano não encontrado." };
    const existing = planRule(state, planId);
    const empty = Object.values(parsed.data).every((v) => v === null);
    const pricingRules = { ...state.pricingRules };
    let id = existing?.id ?? newId();
    if (empty) {
      if (existing) delete pricingRules[existing.id];
    } else {
      pricingRules[id] = { ...(existing ?? { id, scope: "PLAN", planId, ...EMPTY_RULE }), ...parsed.data };
    }
    if (empty && !existing) id = "";
    commit({ ...state, pricingRules }, id ? [{ collection: "pricingRules", id }] : []);
    return { ok: true, data: undefined };
  });
}

export async function deletePlanAction(planId: string): Promise<ActionResult> {
  return run(() => {
    const { user, state } = authorize("templates.manage");
    const plan = state.plans[planId];
    if (!plan) return { ok: false, error: "Plano não encontrado." };
    const admin = user.role === "ADMIN";
    if (plan.kind === "PRESET" && !admin) return { ok: false, error: "Apenas administradores podem remover planos base." };
    if (plan.kind === "TEMPLATE" && plan.createdById !== user.id && !admin) return { ok: false, error: "Só pode remover os seus templates." };
    commit({ ...state, plans: { ...state.plans, [planId]: { ...plan, active: false } } }, [{ collection: "plans", id: planId }]);
    return { ok: true, data: undefined };
  });
}

export async function updateSupportPlanAction(id: string, input: SupportPlanInput): Promise<ActionResult> {
  return run(() => {
    const { state } = authorize("settings.manage");
    const parsed = supportPlanSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const plan = state.supportPlans[id];
    if (!plan) return { ok: false, error: "Plano de suporte não encontrado." };
    commit({ ...state, supportPlans: { ...state.supportPlans, [id]: { ...plan, ...parsed.data } } }, [{ collection: "supportPlans", id }]);
    return { ok: true, data: undefined };
  });
}

export async function updateUserRoleAction(userId: string, role: RoleName): Promise<ActionResult> {
  return run(() => {
    const { user, state } = authorize("settings.manage");
    if (!ROLES.includes(role) || role === "CLIENT") return { ok: false, error: "Função inválida." };
    if (userId === user.id) return { ok: false, error: "Não pode alterar a sua própria função." };
    const target = state.users[userId];
    if (!target) return { ok: false, error: "Utilizador não encontrado." };
    commit({ ...state, users: { ...state.users, [userId]: { ...target, role } } }, [{ collection: "users", id: userId }]);
    return { ok: true, data: undefined };
  });
}
