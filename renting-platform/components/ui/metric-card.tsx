import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
  /** Marks internal-only metrics with a discreet lock label. */
  internal?: boolean;
}

export function MetricCard({ label, value, icon: Icon, hint, trend, className, internal }: MetricCardProps) {
  return (
    <div className={cn("edge surface relative overflow-hidden rounded-card p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-small font-medium text-fg-2">{label}</p>
        {Icon && (
          <span className="grid size-8 place-items-center rounded-[10px] bg-white/[0.06] text-fg-2">
            <Icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="num mt-3 text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-fg">{value}</div>
      <div className="mt-2.5 flex min-h-5 items-center gap-2 text-small">
        {trend && <span className={cn("font-medium", trend.positive === false ? "text-danger" : "text-success")}>{trend.value}</span>}
        {hint && <span className="truncate text-fg-3">{hint}</span>}
        {internal && <span className="ml-auto text-micro uppercase tracking-[0.08em] text-fg-3">Interno</span>}
      </div>
    </div>
  );
}
