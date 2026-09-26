"use server";

import type { AssetStatus, ContractStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionPermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/database/audit";
import { prisma } from "@/lib/database/prisma";
import { CONTRACT_STATUS, ASSET_STATUS } from "@/lib/status";
import type { ActionResult } from "@/lib/utils";

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

/** Contract lifecycle: awaiting signature → awaiting installation → active → suspended / ended. */
export async function updateContractStatusAction(id: string, status: ContractStatus): Promise<ActionResult> {
  try {
    const session = await requireActionPermission("contracts.manage");
    if (!(status in CONTRACT_STATUS)) return { ok: false, error: "Estado inválido." };
    const contract = await prisma.contract.findFirst({ where: { id, companyId: session.companyId } });
    if (!contract) return { ok: false, error: "Contrato não encontrado." };

    const activating = status === "ACTIVE" && !contract.startDate;
    const start = activating ? new Date() : contract.startDate;
    await prisma.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id },
        data: {
          status,
          ...(activating && start ? { startDate: start, endDate: addMonths(start, contract.contractMonths) } : {}),
          ...(status === "ENDED" && !contract.endDate ? { endDate: new Date() } : {}),
        },
      });
      if (status === "ACTIVE") {
        await tx.asset.updateMany({ where: { contractId: id, status: "RESERVED" }, data: { status: "INSTALLED" } });
        await tx.client.update({ where: { id: contract.clientId }, data: { status: "ACTIVE" } });
      }
      await recordAudit(tx, {
        companyId: session.companyId,
        userId: session.id,
        entityType: "Contract",
        entityId: id,
        action: `contract.status.${status.toLowerCase()}`,
        summary: `${session.name.split(" ")[0]} alterou ${contract.contractNumber} para "${CONTRACT_STATUS[status].label}"`,
      });
    });
    revalidatePath("/contracts");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Não foi possível atualizar o contrato." };
  }
}

export async function updateAssetStatusAction(id: string, status: AssetStatus): Promise<ActionResult> {
  try {
    const session = await requireActionPermission("assets.manage");
    if (!(status in ASSET_STATUS)) return { ok: false, error: "Estado inválido." };
    const asset = await prisma.asset.findFirst({ where: { id, companyId: session.companyId } });
    if (!asset) return { ok: false, error: "Equipamento não encontrado." };
    const released = status === "STOCK" || status === "RETIRED";
    await prisma.asset.update({
      where: { id },
      data: { status, ...(released ? { clientId: null, contractId: null, location: status === "STOCK" ? "Armazém" : asset.location } : {}) },
    });
    await recordAudit(prisma, {
      companyId: session.companyId,
      userId: session.id,
      entityType: "Asset",
      entityId: id,
      action: `asset.status.${status.toLowerCase()}`,
      summary: `${session.name.split(" ")[0]} marcou ${asset.assetTag} como "${ASSET_STATUS[status].label}"`,
    });
    revalidatePath("/assets");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Não foi possível atualizar o equipamento." };
  }
}

const assetSchema = z.object({
  productId: z.string().min(1, "Escolha o produto"),
  variantId: z.string().nullable(),
  serialNumber: z.string().trim().max(80).optional(),
  supplierId: z.string().nullable(),
  purchaseDate: z.string().optional(),
  /** Omitted by roles without internal.view — the catalog cost is used instead. */
  purchaseCost: z.number().int().min(0, "Custo inválido").optional(),
  warrantyMonths: z.number().int().min(0).max(120).optional(),
  status: z.enum(["STOCK", "INSTALLED", "MAINTENANCE", "RESERVED", "DAMAGED", "RETIRED"]),
  clientId: z.string().nullable(),
  location: z.string().trim().max(120).optional(),
});
export type AssetInput = z.infer<typeof assetSchema>;

export async function createAssetAction(input: AssetInput): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireActionPermission("assets.manage");
    const parsed = assetSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const data = parsed.data;
    const companyId = session.companyId;
    const product = await prisma.product.findFirst({ where: { id: data.productId, companyId }, include: { variants: true } });
    if (!product) return { ok: false, error: "Produto inválido." };
    const variant = data.variantId ? product.variants.find((v) => v.id === data.variantId) : undefined;
    if (data.variantId && !variant) return { ok: false, error: "Variante inválida." };
    const canSeeCost = session.permissions.includes("internal.view");
    const purchaseCost = canSeeCost && data.purchaseCost !== undefined ? data.purchaseCost : (variant?.internalCost ?? product.internalCost);
    if (data.clientId && !(await prisma.client.findFirst({ where: { id: data.clientId, companyId } }))) return { ok: false, error: "Cliente inválido." };

    const last = await prisma.asset.findFirst({ where: { companyId }, orderBy: { assetTag: "desc" }, select: { assetTag: true } });
    const next = (Number.parseInt(last?.assetTag.replace(/\D/g, "") ?? "0", 10) || 0) + 1;
    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();
    const warranty = data.warrantyMonths ?? product.warrantyMonths ?? 0;

    const asset = await prisma.asset.create({
      data: {
        companyId,
        productId: product.id,
        variantId: data.variantId,
        supplierId: data.supplierId ?? product.supplierId,
        clientId: data.clientId,
        assetTag: `CT-${String(next).padStart(5, "0")}`,
        serialNumber: data.serialNumber || null,
        status: data.status,
        purchaseDate,
        purchaseCost,
        warrantyUntil: warranty ? new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + warranty, purchaseDate.getDate()) : null,
        location: data.location || null,
      },
    });
    await recordAudit(prisma, {
      companyId,
      userId: session.id,
      entityType: "Asset",
      entityId: asset.id,
      action: "asset.created",
      summary: `${session.name.split(" ")[0]} registou ${asset.assetTag} (${product.name})`,
    });
    revalidatePath("/assets");
    return { ok: true, data: { id: asset.id } };
  } catch {
    return { ok: false, error: "Não foi possível registar o equipamento." };
  }
}
