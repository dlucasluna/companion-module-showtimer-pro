import { readdir } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { CatalogView, type CatalogRow } from "@/components/catalog/catalog-view";
import { PageContainer } from "@/components/layout/app-shell";
import { can } from "@/lib/auth/permissions";
import { requirePagePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

export const metadata: Metadata = { title: "Catálogo" };

async function productImages(): Promise<string[]> {
  try {
    const files = await readdir(path.join(process.cwd(), "public", "products"));
    return files.filter((f) => /\.(svg|png|jpe?g|webp)$/i.test(f)).map((f) => `/products/${f}`);
  } catch {
    return [];
  }
}

export default async function CatalogPage() {
  const session = await requirePagePermission("catalog.view");
  const canManage = can(session.role, "catalog.manage");
  const showCost = can(session.role, "internal.view");
  const companyId = session.companyId;

  const [categories, products, suppliers, images] = await Promise.all([
    prisma.productCategory.findMany({ where: { companyId }, orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({ where: { companyId }, include: { variants: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
    canManage ? prisma.supplier.findMany({ where: { companyId }, select: { id: true, name: true } }) : [],
    canManage ? productImages() : [],
  ]);

  // Costs are only serialised for roles allowed to see them.
  const rows: CatalogRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    type: p.type,
    categoryId: p.categoryId,
    imageUrl: p.imageUrl,
    description: p.description,
    active: p.active,
    variants: p.variants.map((v) => ({ name: v.name, cost: showCost ? v.internalCost : null, active: v.active })),
    cost: showCost ? p.internalCost : null,
    referencePrice: showCost ? p.referencePrice : null,
    editable: canManage
      ? {
          id: p.id,
          name: p.name,
          categoryId: p.categoryId,
          type: p.type,
          brand: p.brand ?? "",
          model: p.model ?? "",
          sku: p.sku,
          description: p.description ?? "",
          salesDescription: p.salesDescription ?? "",
          benefit: p.benefit ?? "",
          internalCost: p.internalCost,
          referencePrice: p.referencePrice,
          supplierId: p.supplierId,
          imageUrl: p.imageUrl ?? "",
          warrantyMonths: p.warrantyMonths,
          expectedLifeMonths: p.expectedLifeMonths,
          defaultResidualPercent: p.defaultResidualPercent,
          maxQuantity: p.maxQuantity,
          active: p.active,
          notes: p.notes ?? "",
          variants: p.variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            description: v.description ?? "",
            benefit: v.benefit ?? "",
            internalCost: v.internalCost,
            referencePrice: v.referencePrice,
            isDefault: v.isDefault,
            active: v.active,
          })),
        }
      : null,
  }));

  return (
    <PageContainer>
      <CatalogView
        categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
        products={rows}
        suppliers={suppliers}
        images={images}
        canManage={canManage}
      />
    </PageContainer>
  );
}
