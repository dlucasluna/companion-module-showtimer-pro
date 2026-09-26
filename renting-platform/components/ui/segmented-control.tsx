"use client";

import { motion } from "framer-motion";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  stretch?: boolean;
}

/** Radio group with an animated glass thumb. Arrow keys move the selection. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  stretch = true,
}: SegmentedControlProps<T>) {
  const layoutId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const enabled = options.filter((o) => !o.disabled);
    const index = enabled.findIndex((o) => o.value === value);
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = enabled[(index + delta + enabled.length) % enabled.length];
    if (next) {
      onChange(next.value);
      refs.current[options.indexOf(next)]?.focus();
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "relative inline-flex rounded-[14px] border border-white/[0.08] bg-black/30 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]",
        stretch && "flex w-full",
        className,
      )}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (value === null && index === 0) ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-0 flex flex-1 flex-col items-center justify-center rounded-[10px] font-medium transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-2/70",
              size === "sm" && "h-8 px-2.5 text-small",
              size === "md" && "h-10 px-3 text-[0.875rem]",
              size === "lg" && "h-14 px-3 text-[0.9375rem]",
              active ? "text-fg" : "text-fg-2 hover:text-fg",
              option.disabled && "opacity-40",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-[10px] border border-white/[0.14] bg-[linear-gradient(180deg,rgb(255_255_255/0.16),rgb(255_255_255/0.08))] shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_4px_14px_-4px_rgb(0_0_0/0.6)]"
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
              />
            )}
            <span className="num leading-tight">{option.label}</span>
            {option.hint && <span className="text-micro font-normal normal-case tracking-normal text-fg-3">{option.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
