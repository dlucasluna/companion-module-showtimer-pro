import type { ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border border-white/10 bg-[linear-gradient(180deg,rgb(255_255_255/0.14),rgb(255_255_255/0.05))] font-semibold text-fg",
        size === "sm" && "size-7 text-[0.6875rem]",
        size === "md" && "size-9 text-[0.8125rem]",
        size === "lg" && "size-12 text-[1rem]",
        className,
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] px-1.5 font-sans text-[0.6875rem] font-medium text-fg-2",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("hairline", className)} role="separator" />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-h2 text-fg sm:text-h1">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[0.9375rem] text-fg-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[1.0625rem] font-semibold tracking-tight text-fg">{title}</h2>
        {description && <p className="mt-0.5 text-small text-fg-3">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function KeyValue({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-2", className)}>
      <dt className="text-small text-fg-3">{label}</dt>
      <dd className="num text-right text-[0.875rem] text-fg">{value}</dd>
    </div>
  );
}
