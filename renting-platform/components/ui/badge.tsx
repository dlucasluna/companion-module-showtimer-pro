import type { ReactNode } from "react";
import type { BadgeTone } from "@/lib/status";
import { cn } from "@/lib/utils";

export type { BadgeTone };

const tones: Record<BadgeTone, string> = {
  neutral: "bg-white/[0.07] text-fg border-white/10",
  accent: "bg-accent/12 text-accent-2 border-accent/25",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
  muted: "bg-white/[0.04] text-fg-3 border-white/[0.06]",
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-fg-2",
  accent: "bg-accent-2",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-fg-3",
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[0.75rem] font-medium",
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} aria-hidden="true" />}
      {children}
    </span>
  );
}
