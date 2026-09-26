import { z } from "zod";

const cents = z.number().finite().nonnegative();
const fraction = z.number().finite().min(0).max(1);

const adjustment = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("percent"), value: fraction }),
  z.object({ mode: z.literal("amount"), value: cents }),
]);

export const pricingParamsSchema = z.object({
  equipmentCost: cents,
  installationCost: cents,
  servicesCost: cents,
  contractMonths: z.number().int().min(1).max(120),
  upfront: adjustment,
  targetMultiplier: z.number().finite().positive().max(10),
  supportMonthlyCost: cents,
  supportMonthlyPrice: cents,
  riskReservePercent: fraction,
  maintenanceReservePercent: fraction,
  residualValue: cents,
  residualCreditPercent: fraction,
  discount: adjustment,
  vatRate: fraction,
  vatInclusiveRounding: z.boolean(),
  monthlyOverride: cents.nullable().optional(),
  targetMargin: z.number().finite().min(0).max(0.95).nullable().optional(),
  minMarginPercent: fraction,
  roundMonthlyTo: z.number().int().min(0),
  roundUpfrontTo: z.number().int().min(0),
});

export const pricingLineSchema = z.object({
  quantity: z.number().int().min(0).max(999),
  unitCost: cents,
});

export class PricingValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid pricing input: ${issues.join("; ")}`);
    this.name = "PricingValidationError";
    this.issues = issues;
  }
}

export function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`);
}
