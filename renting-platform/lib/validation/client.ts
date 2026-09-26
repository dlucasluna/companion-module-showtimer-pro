import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const optionalEmail = z.union([z.literal(""), z.email("Email inválido")]).optional();

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Indique o nome da igreja").max(120),
  city: optionalText(80),
  email: optionalEmail,
  phone: optionalText(40),
  address: optionalText(160),
  postalCode: optionalText(20),
  taxId: optionalText(30),
  status: z.enum(["LEAD", "PROSPECT", "ACTIVE", "INACTIVE"]),
  contactName: z.string().trim().min(2, "Indique o responsável").max(120),
  contactRole: optionalText(80),
  contactEmail: optionalEmail,
  contactPhone: optionalText(40),
  notes: optionalText(2000),
});

export type ClientInput = z.infer<typeof clientSchema>;
