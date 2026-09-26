"use client";

import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import { sectionId, useVisibleCategories } from "./category-sections";

/** Sticky category pills with scroll-spy. */
export function CategoryNav() {
  const categories = useVisibleCategories();
  const [active, setActive] = useState<string | null>(categories[0]?.slug ?? null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) setActive(first.target.id.replace("categoria-", ""));
      },
      { rootMargin: "-120px 0px -60% 0px", threshold: 0 },
    );
    categories.forEach((c) => {
      const el = document.getElementById(sectionId(c.slug));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [categories]);

  useEffect(() => {
    const pill = listRef.current?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    pill?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  return (
    <nav aria-label="Categorias" className="sticky top-0 z-20 -mx-4 bg-bg/70 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-0 lg:rounded-2xl lg:px-0">
      <div ref={listRef} className="no-scrollbar flex gap-1.5 overflow-x-auto [mask-image:linear-gradient(to_right,black_92%,transparent)] pr-8">
        {categories.map((category) => (
          <a
            key={category.id}
            href={`#${sectionId(category.slug)}`}
            data-slug={category.slug}
            onClick={(event) => {
              event.preventDefault();
              setActive(category.slug);
              document.getElementById(sectionId(category.slug))?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            aria-current={active === category.slug ? "true" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-small font-medium transition-colors",
              active === category.slug
                ? "border-white/15 bg-white/[0.1] text-fg shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]"
                : "border-transparent text-fg-2 hover:bg-white/[0.05] hover:text-fg",
            )}
          >
            <CategoryIcon name={category.icon} className="size-3.5" />
            {category.name}
          </a>
        ))}
      </div>
    </nav>
  );
}
