import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, description, action, className, compact = false }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-16", className)}>
      <div className="edge surface relative mb-5 grid size-14 place-items-center rounded-2xl">
        <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_0%,rgb(10_132_255/0.25),transparent_70%)]" aria-hidden="true" />
        <Icon className="relative size-6 text-fg-2" strokeWidth={1.6} aria-hidden="true" />
      </div>
      <h3 className="text-[1.0625rem] font-semibold tracking-tight text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[0.875rem] text-fg-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
