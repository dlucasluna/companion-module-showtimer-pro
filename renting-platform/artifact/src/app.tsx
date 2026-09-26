import { CloudOff, Loader2, TriangleAlert } from "lucide-react";
import { Component, useMemo, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PresentationProvider } from "@/components/layout/presentation-context";
import { Providers } from "@/components/layout/providers";
import { SessionProvider, type ClientSession } from "@/components/layout/session-context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { can, permissionsFor, type Permission } from "@/lib/auth/permissions";
import { currentUser, useDemo } from "./data/store";
import { AdminRoutes } from "./routes";
import { LoginPage } from "./pages/login";
import { splitHref, useRouterStore } from "./router";

class RouteBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[artifact] page error", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-[70dvh] place-items-center px-4">
        <EmptyState
          icon={TriangleAlert}
          title="Algo correu mal"
          description="Não foi possível mostrar esta página. As suas propostas continuam guardadas."
          action={
            <Button variant="primary" onClick={() => this.setState({ error: null })}>
              Tentar de novo
            </Button>
          }
        />
      </div>
    );
  }
}

function SyncIndicator() {
  const mode = useDemo((s) => s.mode);
  const pending = useDemo((s) => s.pendingWrites);
  const error = useDemo((s) => s.saveError);
  if (mode !== "cloud" || (pending === 0 && !error)) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full border border-white/10 bg-bg/90 px-3 py-1.5 text-micro text-fg-2 shadow-lg backdrop-blur-xl" role="status">
      {error ? (
        <>
          <CloudOff className="size-3.5 text-danger" /> Não foi possível guardar — a tentar de novo na próxima alteração
        </>
      ) : (
        <>
          <Loader2 className="size-3.5 animate-spin" /> A guardar{pending > 5 ? ` (${pending})` : ""}…
        </>
      )}
    </div>
  );
}

export function App() {
  const status = useDemo((s) => s.status);
  const state = useDemo((s) => s.state);
  const userEmail = useDemo((s) => s.userEmail);
  const href = useRouterStore((s) => s.href);
  const { pathname } = splitHref(href);

  const session = useMemo<ClientSession | null>(() => {
    if (!state) return null;
    const user = currentUser();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      companyName: state.company.name,
      permissions: permissionsFor(user.role),
    };
    // userEmail picks the active demo profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.users, state?.company.name, userEmail]);

  if (status !== "ready" || !state || !session) return <BootScreen failed={status === "error"} />;

  return (
    <Providers>
      {pathname === "/login" ? (
        <LoginPage />
      ) : (
        <SessionProvider session={session}>
          <PresentationProvider initial={false}>
            <AppShell>
              <RouteBoundary key={pathname}>
                <AdminRoutes pathname={pathname} can={(p: Permission) => can(session.role, p)} />
              </RouteBoundary>
            </AppShell>
          </PresentationProvider>
        </SessionProvider>
      )}
      <SyncIndicator />
    </Providers>
  );
}

function BootScreen({ failed }: { failed: boolean }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      {failed ? (
        <EmptyState
          icon={TriangleAlert}
          title="Não foi possível abrir a plataforma"
          description="Recarregue a página para tentar de novo."
        />
      ) : (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="size-6 animate-spin text-fg-2" />
          <p className="text-small text-fg-2">A abrir a plataforma…</p>
        </div>
      )}
    </div>
  );
}
