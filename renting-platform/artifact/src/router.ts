import { create } from "zustand";

/**
 * In-memory router for the published artifact. The artifact frame only passes
 * plain #anchors through, so routes live in state (not in the URL).
 */
interface RouterState {
  href: string;
  /** Bumped by router.refresh() so pages recompute derived data. */
  tick: number;
  history: string[];
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  refresh: () => void;
}

export const useRouterStore = create<RouterState>((set, get) => ({
  href: "/dashboard",
  tick: 0,
  history: [],
  push: (href) => {
    if (href === get().href) return;
    set((s) => ({ href, history: [...s.history.slice(-30), s.href] }));
    window.scrollTo({ top: 0 });
  },
  replace: (href) => set({ href }),
  back: () => {
    const history = get().history;
    const previous = history.at(-1);
    if (previous) set({ href: previous, history: history.slice(0, -1) });
  },
  refresh: () => set((s) => ({ tick: s.tick + 1 })),
}));

export function splitHref(href: string): { pathname: string; search: URLSearchParams } {
  const [pathname = "/", query = ""] = href.split("?");
  return { pathname, search: new URLSearchParams(query) };
}

/** Matches "/proposals/:id/preview" style patterns. */
export function matchRoute(pattern: string, pathname: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const s = pathname.split("/").filter(Boolean);
  if (p.length !== s.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i += 1) {
    const part = p[i]!;
    const value = s[i]!;
    if (part.startsWith(":")) params[part.slice(1)] = decodeURIComponent(value);
    else if (part !== value) return null;
  }
  return params;
}
