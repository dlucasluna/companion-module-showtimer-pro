"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

/** Minimal accessible dropdown menu (Esc / outside click close, arrow keys move). */
export function Menu({ trigger, items, align = "end", label }: { trigger: (props: { open: boolean; toggle: () => void }) => ReactNode; items: MenuItem[]; align?: "start" | "end"; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length];
        next?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            role="menu"
            aria-label={label}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -2, transition: { duration: 0.1 } }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
            className={cn(
              "glass-strong edge absolute top-[calc(100%+6px)] z-50 min-w-52 rounded-2xl p-1.5",
              align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left",
            )}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[0.875rem] outline-none transition-colors disabled:opacity-40",
                  item.destructive ? "text-danger hover:bg-danger/10 focus:bg-danger/10" : "text-fg hover:bg-white/[0.08] focus:bg-white/[0.08]",
                )}
              >
                {item.icon && <item.icon className="size-4 opacity-70" />}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
