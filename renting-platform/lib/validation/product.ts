import { z } from "zod";

export const PRODUCT_TYPES = ["HARDWARE", "SERVICE", "INSTALLATION", "SUPPORT", "SOFTWARE", "LICENSE", "CONSUMABLE"] as const;

export const PRODUCT_TYPE_LABELS: Record<(typeof PRODUCT_TYPES)[number], string> = {
  HARDWARE: "Hardware",
  SERVICE: "Serviço",
  INSTALLATION: "Instalação",
  SUPPORT: "Suporte",
  SOFTWARE: "Software",
  LICENSE: "Licença",
  CONSUMABLE: "Consumível",
};

const money = z.number({ error: "Valor inválido" }).int().min(0, "Não pode ser negativo").max(100_000_000);
const optionalInt = z.number().int().min(0).max(600).nullable();

export const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nome da variante").max(60),
  sku: z.string().trim().min(1, "SKU da variante").max(40),
  description: z.string().trim().max(240).optional(),
  benefit: z.string().trim().max(160).optional(),
  internalCost: money,
  referencePrice: money.nullable(),
  isDefault: z.boolean(),
  active: z.boolean(),
});

export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Indique o nome").max(80),
  categoryId: z.string().min(1, "Escolha a categoria"),
  type: z.enum(PRODUCT_TYPES),
  brand: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  sku: z.string().trim().min(1, "Indique o SKU").max(40),
  description: z.string().trim().max(240).optional(),
  salesDescription: z.string().trim().max(1000).optional(),
  benefit: z.string().trim().max(160).optional(),
  internalCost: money,
  referencePrice: money.nullable(),
  supplierId: z.string().nullable(),
  imageUrl: z.string().trim().max(300).optional(),
  warrantyMonths: optionalInt,
  expectedLifeMonths: optionalInt,
  defaultResidualPercent: z.number().min(0).max(1).nullable(),
  maxQuantity: z.number().int().min(1).max(999).nullable(),
  active: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
  variants: z.array(variantSchema).max(12),
});

export type ProductInput = z.infer<typeof productSchema>;
export type VariantInput = z.infer<typeof variantSchema>;
