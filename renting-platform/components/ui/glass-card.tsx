import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** "glass" uses backdrop blur (few layers only); "surface" is a flat translucent card. */
  tone?: "glass" | "surface" | "strong";
  interactive?: boolean;
  selected?: boolean;
  padded?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { tone = "surface", interactive = false, selected = false, padded = true, className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "edge rounded-card",
        tone === "glass" && "glass",
        tone === "strong" && "glass-strong",
        tone === "surface" && "surface",
        interactive && "interactive",
        selected && "selected-glow",
        padded && "p-5",
        className,
      )}
      {...props}
    />
  );
});
