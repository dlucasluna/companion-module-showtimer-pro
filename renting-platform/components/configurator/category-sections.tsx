"use client";

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import type { CatalogCategoryDTO, CatalogProductDTO } from "@/types/catalog";
import { useConfigurator, useConfiguratorData } from "./configurator-context";
import { ProductCard } from "./product-card";
import { SupportSection } from "./support-section";
import { VariantCompare } from "./variant-compare";

export const SUPPORT_CATEGORY_SLUG = "suporte";

export function sectionId(slug: string) {
  return `categoria-${slug}`;
}

function CategorySection({ category, products, wide }: { category: CatalogCategoryDTO; products: CatalogProductDTO[]; wide: boolean }) {
  const [comparing, setComparing] = useState<string | null>(null);
  const selectedCount = useConfigurator((s) => s.config.lines.filter((l) => products.some((p) => p.id === l.productId)).length);
  const comparedProduct = products.find((p) => p.id === comparing);
  const isSupport = category.slug === SUPPORT_CATEGORY_SLUG;
  // Single-product categories share a row; larger ones (and open comparisons) take the full width.
  const fullWidth = isSupport || products.length > 1 || comparedProduct !== undefined;

  return (
    <section
      id={sectionId(category.slug)}
      aria-labelledby={`${sectionId(category.slug)}-title`}
      className={cn("min-w-0 scroll-mt-28", fullWidth && "@2xl:col-span-2")}
    >
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-fg-2">
            <CategoryIcon name={category.icon} className="size-[18px]" />
          </span>
          <div>
            <h2 id={`${sectionId(category.slug)}-title`} className="text-[1.125rem] font-semibold tracking-tight text-fg">
              {category.name}
            </h2>
            {category.description && <p className="text-small text-fg-3">{category.description}</p>}
          </div>
        </div>
        {selectedCount > 0 && <span className="num shrink-0 whitespace-nowrap text-small text-fg-3">{selectedCount} selecionado{selectedCount > 1 ? "s" : ""}</span>}
      </div>

      {isSupport ? (
        <SupportSection />
      ) : (
        <>
          <div className={cn("grid gap-3", fullWidth && (wide ? "@2xl:grid-cols-2 @6xl:grid-cols-3" : "@2xl:grid-cols-2"))}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                comparing={comparing === product.id}
                onCompare={product.variants.length > 1 ? () => setComparing((c) => (c === product.id ? null : product.id)) : undefined}
              />
            ))}
          </div>
          <AnimatePresence initial={false}>
            {comparedProduct && <VariantCompare key={comparedProduct.id} product={comparedProduct} onClose={() => setComparing(null)} />}
          </AnimatePresence>
        </>
      )}
    </section>
  );
}

/** Categories that have products (or the support plans), in catalog order. */
export function useVisibleCategories() {
  const { catalog } = useConfiguratorData();
  return catalog.categories.filter(
    (category) =>
      (category.slug === SUPPORT_CATEGORY_SLUG && catalog.supportPlans.length > 0) ||
      catalog.products.some((product) => product.categoryId === category.id),
  );
}

export function CategorySections({ wide = false }: { wide?: boolean }) {
  const { catalog } = useConfiguratorData();
  const categories = useVisibleCategories();
  return (
    <div className="grid gap-x-3 gap-y-12 @2xl:grid-cols-2">
      {categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          wide={wide}
          products={catalog.products.filter((product) => product.categoryId === category.id)}
        />
      ))}
    </div>
  );
}
