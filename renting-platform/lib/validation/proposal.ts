import { z } from "zod";

const adjustment = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("percent"), value: z.number().min(0).max(1) }),
  z.object({ mode: z.literal("amount"), value: z.number().int().min(0).max(100_000_000) }),
]);

export const configLineSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).nullable(),
  quantity: z.number().int().min(0, "Quantidade não pode ser negativa").max(999),
});

export const proposalConfigSchema = z.object({
  lines: z.array(configLineSchema).max(200),
  contractMonths: z.number().int().min(1, "Contrato deve ter pelo menos 1 mês").max(120),
  upfront: adjustment,
  discount: adjustment,
  supportPlanId: z.string().max(64).nullable(),
  monthlyOverride: z.number().int().min(0, "Mensalidade não pode ser negativa").nullable(),
  targetMargin: z.number().min(0).max(0.95).nullable(),
  pricesIncludeVat: z.boolean(),
});

export const saveProposalSchema = z.object({
  id: z.string().min(1),
  planId: z.string().nullable(),
  title: z.string().trim().min(1).max(120),
  config: proposalConfigSchema,
});
export type SaveProposalInput = z.infer<typeof saveProposalSchema>;

export const createProposalSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente"),
  planId: z.string().nullable(),
  title: z.string().trim().min(1).max(120).default("Sistema Broadcast"),
});
export type CreateProposalInput = z.input<typeof createProposalSchema>;

export const signProposalSchema = z.object({
  signerName: z.string().trim().min(2, "Indique o nome de quem assina").max(120),
  signerEmail: z.union([z.literal(""), z.email("Email inválido")]).optional(),
  signerRole: z.string().trim().max(80).optional(),
  imageData: z
    .string()
    .max(400_000, "Assinatura demasiado grande")
    .refine((v) => v.startsWith("data:image/png;base64,"), "Assinatura inválida")
    .nullable(),
  acceptedTerms: z.literal(true, { error: "É necessário aceitar os termos" }),
});
export type SignProposalInput = z.infer<typeof signProposalSchema>;
