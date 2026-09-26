"use client";

import { motion } from "framer-motion";
import { LogOut, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { Avatar, Kbd } from "@/components/ui/misc";
import { BrandMark } from "./brand-mark";
import { NAV_ITEMS, isActive } from "./nav-items";
import { useSession } from "./session-context";

export function SidebarContent({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const session = useSession();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const items = NAV_ITEMS.filter((item) => session.permissions.includes(item.permission));

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center gap-3 px-4", collapsed && "justify-center px-0")}>
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-semibold tracking-tight text-fg">{session.companyName}</p>
            <p className="truncate text-micro text-fg-3">Renting audiovisual</p>
          </div>
        )}
      </div>

      <div className={cn("px-3 pb-2", collapsed && "px-2")}>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            setCommandOpen(true);
          }}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.04] px-3 text-small text-fg-3 transition hover:border-white/12 hover:text-fg-2",
            collapsed && "justify-center px-0",
          )}
          aria-label="Pesquisar (⌘K)"
        >
          <Search className="size-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Pesquisar</span>
              <Kbd>⌘K</Kbd>
            </>
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Navegação principal">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-[0.875rem] font-medium transition-colors duration-150",
                    collapsed && "justify-center px-0",
                    active ? "text-fg" : "text-fg-2 hover:bg-white/[0.045] hover:text-fg",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-[10px] border border-white/[0.09] bg-[linear-gradient(180deg,rgb(255_255_255/0.1),rgb(255_255_255/0.05))] shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon className={cn("relative size-[18px] shrink-0", item.primary && !active && "text-accent-2")} strokeWidth={1.8} />
                  {!collapsed && <span className="relative truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={cn("border-t border-white/[0.06] p-3", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-3 rounded-xl p-2", collapsed && "flex-col p-0")}>
          <Avatar name={session.name} size="sm" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-medium text-fg">{session.name}</p>
              <p className="truncate text-micro text-fg-3">
                {ROLE_LABELS[session.role]} · {session.companyName}
              </p>
            </div>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              className="grid size-8 place-items-center rounded-lg text-fg-3 transition hover:bg-white/[0.07] hover:text-fg"
              aria-label="Terminar sessão"
              title="Terminar sessão"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "glass fixed inset-y-3 left-3 z-40 hidden rounded-panel transition-[width] duration-300 ease-[var(--ease-out-soft)] lg:block",
        collapsed ? "w-[72px]" : "w-[240px]",
      )}
    >
      <SidebarContent collapsed={collapsed} />
      <button
        type="button"
        onClick={toggle}
        className="absolute -right-3 top-5 grid size-6 place-items-center rounded-full border border-white/10 bg-bg-3 text-fg-3 shadow-lg transition hover:text-fg"
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        aria-expanded={!collapsed}
      >
        {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
      </button>
    </aside>
  );
}
