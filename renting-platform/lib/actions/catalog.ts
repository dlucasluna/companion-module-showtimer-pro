"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/database/audit";
import { prisma } from "@/lib/database/prisma";
import type { ActionResult } from "@/lib/utils";
import { productSchema, type ProductInput } from "@/lib/validation/product";

const blank = (value: string | undefined) => (value && value.length > 0 ? value : null);

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Creates or updates a product and its variants. Removed variants are deactivated (history keeps references). */
export async function saveProductAction(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireActionPermission("catalog.manage");
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const { variants, id, ...data } = parsed.data;
    const companyId = session.companyId;

    const category = await prisma.productCategory.findFirst({ where: { id: data.categoryId, companyId } });
    if (!category) return { ok: false, error: "Categoria inválida." };
    const duplicateSku = await prisma.product.findFirst({ where: { companyId, sku: data.sku, NOT: id ? { id } : undefined } });
    if (duplicateSku) return { ok: false, error: `O SKU ${data.sku} já existe.` };
    const variantSkus = variants.map((v) => v.sku);
    if (new Set(variantSkus).size !== variantSkus.length) return { ok: false, error: "SKUs de variantes repetidos." };

    const fields = {
      name: data.name,
      categoryId: data.categoryId,
      type: data.type,
      brand: blank(data.brand),
      model: blank(data.model),
      sku: data.sku,
      description: blank(data.description),
      salesDescription: blank(data.salesDescription),
      benefit: blank(data.benefit),
      internalCost: data.internalCost,
      referencePrice: data.referencePrice,
      supplierId: data.supplierId,
      imageUrl: blank(data.imageUrl),
      warrantyMonths: data.warrantyMonths,
      expectedLifeMonths: data.expectedLifeMonths,
      defaultResidualPercent: data.defaultResidualPercent,
      maxQuantity: data.maxQuantity,
      active: data.active,
      notes: blank(data.notes),
    };

    const product = await prisma.$transaction(async (tx) => {
      let productId = id;
      if (productId) {
        const existing = await tx.product.findFirst({ where: { id: productId, companyId } });
        if (!existing) throw new Error("NOT_FOUND");
        await tx.product.update({ where: { id: productId }, data: fields });
      } else {
        const baseSlug = slugify(data.name) || "produto";
        const taken = await tx.product.count({ where: { companyId, slug: { startsWith: baseSlug } } });
        const created = await tx.product.create({ data: { ...fields, companyId, slug: taken ? `${baseSlug}-${taken + 1}` : baseSlug } });
        productId = created.id;
      }

      const existingVariants = await tx.productVariant.findMany({ where: { productId } });
      const keep = new Set<string>();
      for (const [index, variant] of variants.entries()) {
        const values = {
          name: variant.name,
          sku: variant.sku,
          description: blank(variant.description),
          benefit: blank(variant.benefit),
          internalCost: variant.internalCost,
          referencePrice: variant.referencePrice,
          isDefault: variant.isDefault,
          active: variant.active,
          sortOrder: index,
        };
        const match = variant.id ? existingVariants.find((v) => v.id === variant.id) : undefined;
        if (match) {
          await tx.productVariant.update({ where: { id: match.id }, data: values });
          keep.add(match.id);
        } else {
          const created = await tx.productVariant.create({ data: { ...values, productId } });
          keep.add(created.id);
        }
      }
      const removed = existingVariants.filter((v) => !keep.has(v.id)).map((v) => v.id);
      if (removed.length) await tx.productVariant.updateMany({ where: { id: { in: removed } }, data: { active: false } });

      await recordAudit(tx, {
        companyId,
        userId: session.id,
        entityType: "Product",
        entityId: productId,
        action: id ? "product.updated" : "product.created",
        summary: `${session.name.split(" ")[0]} ${id ? "atualizou" : "criou"} o produto ${data.name}`,
      });
      return { id: productId };
    });

    revalidatePath("/catalog");
    return { ok: true, data: product };
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") return { ok: false, error: "Produto não encontrado." };
    console.error(error);
    return { ok: false, error: "Não foi possível guardar o produto." };
  }
}

export async function toggleProductActiveAction(id: string, active: boolean): Promise<ActionResult> {
  try {
    const session = await requireActionPermission("catalog.manage");
    const product = await prisma.product.findFirst({ where: { id, companyId: session.companyId } });
    if (!product) return { ok: false, error: "Produto não encontrado." };
    await prisma.product.update({ where: { id }, data: { active } });
    revalidatePath("/catalog");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Não foi possível atualizar o produto." };
  }
}
