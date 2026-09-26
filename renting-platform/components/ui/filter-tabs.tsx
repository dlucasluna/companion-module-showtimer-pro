import Link from "next/link";
import { cn } from "@/lib/utils";

interface FilterTab {
  value: string;
  label: string;
  count?: number;
}

/** URL-driven filter tabs (server rendered, works without JS). */
export function FilterTabs({ tabs, active, hrefFor, label }: { tabs: FilterTab[]; active: string; hrefFor: (value: string) => string; label: string }) {
  return (
    <nav aria-label={label} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
      {tabs.map((tab) => {
        const selected = tab.value === active;
        return (
          <Link
            key={tab.value}
            href={hrefFor(tab.value)}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-small font-medium transition-colors",
              selected ? "border-white/15 bg-white/[0.1] text-fg" : "border-transparent text-fg-2 hover:bg-white/[0.05] hover:text-fg",
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className={cn("num text-micro", selected ? "text-fg-2" : "text-fg-3")}>{tab.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/** GET search form (no JS required). */
export function SearchForm({ defaultValue, placeholder, hidden }: { defaultValue?: string; placeholder: string; hidden?: Record<string, string> }) {
  return (
    <form role="search" className="relative w-full sm:w-72">
      {hidden && Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <svg className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-full border border-white/10 bg-white/[0.045] pl-10 pr-4 text-[0.875rem] text-fg placeholder:text-fg-3 focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15"
      />
    </form>
  );
}
