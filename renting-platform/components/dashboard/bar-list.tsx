import { cn } from "@/lib/utils";

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  display: string;
  hint?: string;
}

/**
 * Horizontal magnitude bars in a single hue. Identity is carried by the text
 * label (never by color); values are printed in text tokens.
 */
export function BarList({ items, className, label }: { items: BarListItem[]; className?: string; label: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-3", className)} aria-label={label}>
      {items.map((item) => (
        <li key={item.key} className="group" title={`${item.label}: ${item.display}${item.hint ? ` · ${item.hint}` : ""}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-small">
            <span className="truncate text-fg-2 transition-colors group-hover:text-fg">{item.label}</span>
            <span className="num shrink-0 text-fg">
              {item.display}
              {item.hint && <span className="ml-1.5 text-fg-3">{item.hint}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <div
              className="h-full rounded-full bg-[#3987e5] transition-[filter] group-hover:brightness-125"
              style={{ width: `${item.value === 0 ? 0 : Math.max(3, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
