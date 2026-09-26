import type { Prisma, PrismaClient } from "@prisma/client";
import { variantDisplayName, type DisplayLookup, type ItemDisplayInfo } from "@/lib/proposals/snapshot";

type Db = Prisma.TransactionClient | PrismaClient;

/** Builds a (productId, variantId) → display info lookup used for proposal snapshots. */
export async function loadDisplayLookup(db: Db, companyId: string): Promise<DisplayLookup> {
  const products = await db.product.findMany({
    where: { companyId },
    include: { category: true, variants: true },
  });

  const map = new Map<string, ItemDisplayInfo>();
  for (const product of products) {
    const base: ItemDisplayInfo = {
      productId: product.id,
      variantId: null,
      displayName: product.name,
      description: product.description,
      categoryName: product.category.name,
      productType: product.type,
      sortOrder: product.category.sortOrder * 1000 + product.sortOrder,
    };
    map.set(product.id, base);
    for (const variant of product.variants) {
      map.set(`${product.id}:${variant.id}`, {
        ...base,
        variantId: variant.id,
        displayName: variantDisplayName(product.name, variant.name),
        description: variant.description ?? product.description,
      });
    }
  }
  return (productId, variantId) => map.get(variantId ? `${productId}:${variantId}` : productId);
}
