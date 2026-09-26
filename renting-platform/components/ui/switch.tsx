"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  className?: string;
  id?: string;
}

export function Switch({ checked, onChange, label, description, className, id }: SwitchProps) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4", className)} htmlFor={id}>
      <span className="min-w-0">
        <span className="block text-[0.875rem] font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-small text-fg-3">{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[26px] w-[44px] shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-accent/50 bg-accent" : "border-white/10 bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute left-[2px] top-[2px] size-5 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.4)] transition-transform duration-200 ease-[var(--ease-out-soft)]",
            checked && "translate-x-[18px]",
          )}
        />
      </button>
    </label>
  );
}
