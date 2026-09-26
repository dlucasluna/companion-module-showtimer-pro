"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** [-] 2 [+] with an animated digit. Never allows negative quantities. */
export function QuantitySelector({ value, onChange, min = 0, max = 99, label, size = "md", className }: QuantitySelectorProps) {
  const dim = size === "sm" ? "size-7" : "size-9";
  const clampValue = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(clampValue(value - 1))}
        disabled={value <= min}
        aria-label={`Diminuir ${label}`}
        className={cn(
          dim,
          "grid place-items-center rounded-full text-fg-2 transition-all hover:bg-white/10 hover:text-fg active:scale-90 disabled:opacity-30",
        )}
      >
        <Minus className="size-4" strokeWidth={2.2} />
      </button>
      <span className={cn("num relative grid min-w-7 place-items-center overflow-hidden font-semibold", size === "sm" ? "h-7 text-[0.875rem]" : "h-9 text-[1rem]")} aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button
        type="button"
        onClick={() => onChange(clampValue(value + 1))}
        disabled={value >= max}
        aria-label={`Aumentar ${label}`}
        className={cn(
          dim,
          "grid place-items-center rounded-full bg-white/[0.08] text-fg transition-all hover:bg-white/15 active:scale-90 disabled:opacity-30",
        )}
      >
        <Plus className="size-4" strokeWidth={2.2} />
      </button>
    </div>
  );
}
