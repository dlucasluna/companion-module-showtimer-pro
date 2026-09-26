"use client";

import type { ReactNode } from "react";
import { usePresentation } from "./presentation-context";
import { useCan } from "./session-context";

/**
 * Renders internal financial UI (cost, margin, profit, break-even) only for
 * roles with `internal.view` and never in client mode. Children are unmounted,
 * not hidden with CSS, so nothing internal is left in the DOM.
 */
export function InternalOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  return useShowInternal() ? <>{children}</> : <>{fallback}</>;
}

export function useShowInternal(): boolean {
  const allowed = useCan("internal.view");
  const presenting = usePresentation((s) => s.active);
  return allowed && !presenting;
}
