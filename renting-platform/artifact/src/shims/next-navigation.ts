import { useMemo } from "react";
import { splitHref, useRouterStore } from "../router";

/** Browser-only stand-in for `next/navigation` used by the published artifact. */
export function useRouter() {
  const push = useRouterStore((s) => s.push);
  const replace = useRouterStore((s) => s.replace);
  const back = useRouterStore((s) => s.back);
  const refresh = useRouterStore((s) => s.refresh);
  return useMemo(() => ({ push, replace, back, refresh, prefetch: () => undefined, forward: () => undefined }), [push, replace, back, refresh]);
}

export function usePathname(): string {
  return splitHref(useRouterStore((s) => s.href)).pathname;
}

export function useSearchParams(): URLSearchParams {
  const href = useRouterStore((s) => s.href);
  return useMemo(() => splitHref(href).search, [href]);
}

export function redirect(href: string): never {
  useRouterStore.getState().replace(href);
  throw new Error(`redirect:${href}`);
}

export function notFound(): never {
  throw new Error("not-found");
}
