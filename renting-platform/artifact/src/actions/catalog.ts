import type { ActionResult } from "@/lib/utils";
import { productSchema, type ProductInput } from "@/lib/validation/product";
import { newId } from "../ids";
import { commit, logActivity } from "../data/store";
import type { ProductRec } from "../data/types";
import { authorize, blank, firstName, run } from "./common";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}


export async function saveProductAction(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  return run(() => {
    const { user, state } = authorize("catalog.manage");
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const { variants, id, ...d } = parsed.data;
    if (!state.categories[d.categoryId]) return { ok: false, error: "Categoria inválida." };
    if (Object.values(state.products).some((p) => p.sku === d.sku && p.id !== id)) return { ok: false, error: `O SKU ${d.sku} já existe.` };
    const skus = variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) return { ok: false, error: "SKUs de variantes repetidos." };

    const existing = id ? state.products[id] : undefined;
    if (id && !existing) return { ok: false, error: "Produto não encontrado." };
    const productId = existing?.id ?? newId();
    const baseSlug = slugify(d.name) || "produto";
    const kept = variants.map((v, index) => {
      const match = v.id ? existing?.variants.find((x) => x.id === v.id) : undefined;
      return {
        id: match?.id ?? newId(),
        name: v.name,
        sku: v.sku,
        description: blank(v.description),
        benefit: blank(v.benefit),
        internalCost: v.internalCost,
        referencePrice: v.referencePrice,
        residualPercent: match?.residualPercent ?? null,
        expectedLifeMonths: match?.expectedLifeMonths ?? null,
        attributes: match?.attributes ?? null,
        isDefault: v.isDefault,
        active: v.active,
        sortOrder: index,
      };
    });
    const removed = (existing?.variants ?? []).filter((v) => !kept.some((k) => k.id === v.id)).map((v) => ({ ...v, active: false }));
    const product: ProductRec = {
      id: productId,
      categoryId: d.categoryId,
      supplierId: d.supplierId,
      name: d.name,
      slug: existing?.slug ?? (Object.values(state.products).some((p) => p.slug === baseSlug) ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug),
      sku: d.sku,
      type: d.type,
      brand: blank(d.brand),
      model: blank(d.model),
      description: blank(d.description),
      salesDescription: blank(d.salesDescription),
      benefit: blank(d.benefit),
      internalCost: d.internalCost,
      referencePrice: d.referencePrice,
      defaultResidualPercent: d.defaultResidualPercent,
      warrantyMonths: d.warrantyMonths,
      expectedLifeMonths: d.expectedLifeMonths,
      imageUrl: blank(d.imageUrl),
      notes: blank(d.notes),
      defaultQuantity: existing?.defaultQuantity ?? 1,
      maxQuantity: d.maxQuantity,
      unitLabel: existing?.unitLabel ?? null,
      active: d.active,
      sortOrder: existing?.sortOrder ?? Object.keys(state.products).length,
      variants: [...kept, ...removed],
    };
    const logged = logActivity(
      { ...state, products: { ...state.products, [productId]: product } },
      `${firstName(user)} ${existing ? "atualizou" : "criou"} o produto ${product.name}`,
    );
    commit(logged.state, [{ collection: "products", id: productId }, logged.dirty]);
    return { ok: true, data: { id: productId } };
  });
}

export async function toggleProductActiveAction(id: string, active: boolean): Promise<ActionResult> {
  return run(() => {
    const { state } = authorize("catalog.manage");
    const product = state.products[id];
    if (!product) return { ok: false, error: "Produto não encontrado." };
    commit({ ...state, products: { ...state.products, [id]: { ...product, active } } }, [{ collection: "products", id }]);
    return { ok: true, data: undefined };
  });
}
