"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/database/audit";
import { prisma } from "@/lib/database/prisma";
import type { ActionResult } from "@/lib/utils";
import { clientSchema, type ClientInput } from "@/lib/validation/client";

const nullable = (value: string | undefined) => (value && value.length > 0 ? value : null);

export async function createClientAction(input: ClientInput): Promise<ActionResult<{ id: string; name: string; contactName: string }>> {
  try {
    const session = await requireActionPermission("clients.manage");
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const data = parsed.data;

    const client = await prisma.client.create({
      data: {
        companyId: session.companyId,
        name: data.name,
        city: nullable(data.city),
        email: nullable(data.email),
        phone: nullable(data.phone),
        address: nullable(data.address),
        postalCode: nullable(data.postalCode),
        taxId: nullable(data.taxId),
        status: data.status,
        notes: nullable(data.notes),
        lastInteractionAt: new Date(),
        contacts: {
          create: {
            name: data.contactName,
            role: nullable(data.contactRole),
            email: nullable(data.contactEmail),
            phone: nullable(data.contactPhone),
            isPrimary: true,
          },
        },
      },
    });
    await recordAudit(prisma, {
      companyId: session.companyId,
      userId: session.id,
      entityType: "Client",
      entityId: client.id,
      action: "client.created",
      summary: `${session.name.split(" ")[0]} criou o cliente ${client.name}`,
    });
    revalidatePath("/clients");
    return { ok: true, data: { id: client.id, name: client.name, contactName: data.contactName } };
  } catch (error) {
    console.error(error);
    return { ok: false, error: error instanceof Error && error.name === "ForbiddenError" ? "Sem permissão." : "Não foi possível criar o cliente." };
  }
}

export async function updateClientAction(id: string, input: ClientInput): Promise<ActionResult> {
  try {
    const session = await requireActionPermission("clients.manage");
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const data = parsed.data;
    const client = await prisma.client.findFirst({ where: { id, companyId: session.companyId }, include: { contacts: { where: { isPrimary: true }, take: 1 } } });
    if (!client) return { ok: false, error: "Cliente não encontrado." };

    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id },
        data: {
          name: data.name,
          city: nullable(data.city),
          email: nullable(data.email),
          phone: nullable(data.phone),
          address: nullable(data.address),
          postalCode: nullable(data.postalCode),
          taxId: nullable(data.taxId),
          status: data.status,
          notes: nullable(data.notes),
        },
      });
      const contact = { name: data.contactName, role: nullable(data.contactRole), email: nullable(data.contactEmail), phone: nullable(data.contactPhone) };
      const primary = client.contacts[0];
      if (primary) await tx.contact.update({ where: { id: primary.id }, data: contact });
      else await tx.contact.create({ data: { ...contact, clientId: id, isPrimary: true } });
      await recordAudit(tx, {
        companyId: session.companyId,
        userId: session.id,
        entityType: "Client",
        entityId: id,
        action: "client.updated",
        summary: `${session.name.split(" ")[0]} atualizou os dados do cliente`,
      });
    });
    revalidatePath(`/clients/${id}`);
    revalidatePath("/clients");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "Não foi possível atualizar o cliente." };
  }
}
