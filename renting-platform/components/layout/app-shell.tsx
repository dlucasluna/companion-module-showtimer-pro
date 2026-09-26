"use client";

import { Menu, Search } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { Drawer } from "@/components/ui/drawer";
import { BrandMark } from "./brand-mark";
import { CommandPalette } from "./command-palette";
import { usePresentation } from "./presentation-context";
import { useSession } from "./session-context";
import { Sidebar, SidebarContent } from "./sidebar";

function MobileTopBar() {
  const session = useSession();
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  return (
    <header className="glass sticky top-0 z-30 flex h-14 items-center gap-3 rounded-none border-x-0 border-t-0 px-4 lg:hidden">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        className="-ml-1.5 grid size-9 place-items-center rounded-lg text-fg-2 hover:bg-white/10 hover:text-fg"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>
      <BrandMark className="size-7" />
      <span className="truncate text-[0.9375rem] font-semibold tracking-tight">{session.companyName}</span>
      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        className="ml-auto grid size-9 place-items-center rounded-lg text-fg-2 hover:bg-white/10 hover:text-fg"
        aria-label="Pesquisar"
      >
        <Search className="size-[18px]" />
      </button>
    </header>
  );
}

/**
 * Application frame. In client mode (presentation) the sidebar, top bar and
 * command palette are unmounted and the page gets the full screen.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const presenting = usePresentation((s) => s.active);
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  // The page subtree must keep the same position in both modes: toggling client
  // mode may never remount the page (that would reset the live configuration).
  return (
    <div className="min-h-dvh">
      {!presenting && (
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar para o conteúdo
        </a>
      )}
      {!presenting && <Sidebar />}
      {!presenting && <MobileTopBar />}
      {!presenting && (
        <Drawer open={mobileNavOpen} onOpenChange={setMobileNavOpen} title="Menu" side="left" width="max-w-[300px]" bare>
          <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
        </Drawer>
      )}
      <main
        id="main"
        className={cn(
          "transition-[padding] duration-300 ease-[var(--ease-out-soft)]",
          !presenting && (collapsed ? "lg:pl-[92px]" : "lg:pl-[260px]"),
        )}
      >
        {children}
      </main>
      {!presenting && <CommandPalette />}
    </div>
  );
}

/** Standard padded container for admin pages. */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10", className)}>{children}</div>;
}
