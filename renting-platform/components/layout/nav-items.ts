import {
  BookOpen,
  FilePlus2,
  FileSignature,
  FileText,
  HardDrive,
  Layers,
  LayoutDashboard,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  /** Emphasised entry (primary action). */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/proposals/new", label: "Nova proposta", icon: FilePlus2, permission: "proposals.manage", primary: true },
  { href: "/proposals", label: "Propostas", icon: FileText, permission: "proposals.view" },
  { href: "/clients", label: "Clientes", icon: Users, permission: "clients.view" },
  { href: "/contracts", label: "Contratos", icon: FileSignature, permission: "contracts.view" },
  { href: "/assets", label: "Equipamentos", icon: HardDrive, permission: "assets.view" },
  { href: "/catalog", label: "Catálogo", icon: BookOpen, permission: "catalog.view" },
  { href: "/plans", label: "Planos", icon: Layers, permission: "catalog.view" },
  { href: "/finance", label: "Financeiro", icon: Wallet, permission: "finance.view" },
  { href: "/settings", label: "Configurações", icon: Settings, permission: "settings.manage" },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/proposals") return pathname === "/proposals" || (pathname.startsWith("/proposals/") && !pathname.startsWith("/proposals/new"));
  return pathname === href || pathname.startsWith(`${href}/`);
}
