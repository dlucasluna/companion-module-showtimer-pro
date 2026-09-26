import { z } from "zod";
import { LOCALES } from "@/lib/i18n/locales";

const fraction = z.number().min(0).max(1);
const optional = (max: number) => z.string().trim().max(max).optional();

export const companySchema = z.object({
  name: z.string().trim().min(2, "Indique o nome").max(80),
  legalName: optional(120),
  taxId: optional(30),
  email: z.union([z.literal(""), z.email("Email inválido")]).optional(),
  phone: optional(40),
  website: optional(120),
  address: optional(160),
  city: optional(80),
  postalCode: optional(20),
  tagline: optional(160),
  locale: z.enum(LOCALES),
  proposalPrefix: z.string().trim().min(1).max(8).regex(/^[A-Z0-9]+$/, "Apenas letras maiúsculas e números"),
  proposalValidityDays: z.number().int().min(1, "Mínimo 1 dia").max(365),
  proposalTerms: optional(4000),
});
export type CompanyInput = z.infer<typeof companySchema>;

export const pricingRuleSchema = z.object({
  targetMultiplier: z.number().min(1, "O multiplicador deve ser ≥ 1").max(5),
  defaultUpfrontPercent: fraction,
  defaultContractMonths: z.number().int().min(1).max(120),
  allowedContractMonths: z.string().regex(/^\s*\d+(\s*,\s*\d+)*\s*$/, "Use meses separados por vírgula, ex.: 12,24,36,48"),
  riskReservePercent: fraction,
  maintenanceReservePercent: fraction,
  defaultResidualPercent: fraction,
  residualCreditPercent: fraction,
  vatRate: z.number().min(0).max(0.5),
  minMarginPercent: fraction,
  pricesIncludeVat: z.boolean(),
  roundMonthlyTo: z.number().int().min(0).max(10_000),
  roundUpfrontTo: z.number().int().min(0).max(100_000),
});
export type PricingRuleInput = z.infer<typeof pricingRuleSchema>;

export const planRuleSchema = z.object({
  targetMultiplier: z.number().min(1).max(5).nullable(),
  minMarginPercent: fraction.nullable(),
  riskReservePercent: fraction.nullable(),
});
export type PlanRuleInput = z.infer<typeof planRuleSchema>;

export const supportPlanSchema = z.object({
  monthlyCost: z.number().int().min(0),
  monthlyPrice: z.number().int().min(0),
  active: z.boolean(),
});
export type SupportPlanInput = z.infer<typeof supportPlanSchema>;
