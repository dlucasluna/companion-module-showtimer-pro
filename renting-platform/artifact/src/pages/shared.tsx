import { Lock, SearchX } from "lucide-react";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { splitHref, useRouterStore } from "../router";

/** Current route's query string (the in-memory router keeps it in state). */
export function useQuery(): URLSearchParams {
  const href = useRouterStore((s) => s.href);
  return splitHref(href).search;
}

export function hrefWith(pathname: string, params: Record<string, string | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Live search box: the list filters as you type (replaces the server GET form). */
export function SearchBox({ value, placeholder, onSearch }: { value: string; placeholder: string; onSearch: (q: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => {
      if (text.trim() !== value) onSearch(text.trim());
    }, 150);
    return () => clearTimeout(id);
  }, [text, value, onSearch]);

  return (
    <div role="search" className="relative w-full sm:w-72">
      <svg className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full rounded-full border border-white/10 bg-white/[0.045] pl-10 pr-4 text-[0.875rem] text-fg placeholder:text-fg-3 focus:border-accent/60 focus:outline-none focus:ring-4 focus:ring-accent/15"
      />
    </div>
  );
}

export function includesText(haystack: (string | null | undefined)[], q: string): boolean {
  if (!q) return true;
  const needle = normalize(q);
  return haystack.some((value) => value && normalize(value).includes(needle));
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function Forbidden() {
  return (
    <PageContainer>
      <div className="edge surface rounded-card">
        <EmptyState
          icon={Lock}
          title="Sem acesso a esta área"
          description="O perfil atual não tem permissão para ver esta página. Pode entrar com outro perfil demo."
          action={
            <ButtonLink href="/login" variant="primary">
              Trocar de perfil
            </ButtonLink>
          }
        />
      </div>
    </PageContainer>
  );
}

export function NotFoundPage({ what = "Página" }: { what?: string }) {
  return (
    <PageContainer>
      <div className="edge surface rounded-card">
        <EmptyState
          icon={SearchX}
          title={`${what} não encontrada`}
          description="Pode ter sido removida ou os dados de demonstração foram repostos."
          action={
            <ButtonLink href="/dashboard" variant="primary">
              Ir para o dashboard
            </ButtonLink>
          }
        />
      </div>
    </PageContainer>
  );
}

export const byDateDesc = (a: string | null | undefined, b: string | null | undefined) => (b ?? "").localeCompare(a ?? "");
