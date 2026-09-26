import { useEffect, type ReactNode } from "react";
import type { Permission } from "@/lib/auth/permissions";
import { FinancePage, SettingsPage } from "./pages/admin";
import { CatalogPage, PlansPage } from "./pages/catalog";
import { ClientProfilePage, ClientsPage } from "./pages/clients";
import { DashboardPage } from "./pages/dashboard";
import { AssetsPage, ContractsPage } from "./pages/operations";
import { ConfiguratorPage } from "./pages/proposal-configurator";
import { NewProposalPage } from "./pages/proposal-new";
import { PreviewPage } from "./pages/proposal-preview";
import { ProposalsPage } from "./pages/proposals";
import { Forbidden, NotFoundPage } from "./pages/shared";
import { matchRoute, useRouterStore } from "./router";

type Params = Record<string, string>;

/** Same routes and page permissions as the Next.js app. */
const ROUTES: { pattern: string; permission: Permission; render: (params: Params) => ReactNode }[] = [
  { pattern: "/dashboard", permission: "dashboard.view", render: () => <DashboardPage /> },
  { pattern: "/proposals", permission: "proposals.view", render: () => <ProposalsPage /> },
  { pattern: "/proposals/new", permission: "proposals.manage", render: () => <NewProposalPage /> },
  { pattern: "/proposals/:id", permission: "proposals.view", render: (p) => <ConfiguratorPage key={p.id} id={p.id!} /> },
  { pattern: "/proposals/:id/preview", permission: "proposals.view", render: (p) => <PreviewPage id={p.id!} /> },
  { pattern: "/clients", permission: "clients.view", render: () => <ClientsPage /> },
  { pattern: "/clients/:id", permission: "clients.view", render: (p) => <ClientProfilePage id={p.id!} /> },
  { pattern: "/contracts", permission: "contracts.view", render: () => <ContractsPage /> },
  { pattern: "/assets", permission: "assets.view", render: () => <AssetsPage /> },
  { pattern: "/catalog", permission: "catalog.view", render: () => <CatalogPage /> },
  { pattern: "/plans", permission: "catalog.view", render: () => <PlansPage /> },
  { pattern: "/finance", permission: "finance.view", render: () => <FinancePage /> },
  { pattern: "/settings", permission: "settings.manage", render: () => <SettingsPage /> },
];

function Redirect({ to }: { to: string }) {
  useEffect(() => useRouterStore.getState().replace(to), [to]);
  return null;
}

export function AdminRoutes({ pathname, can }: { pathname: string; can: (permission: Permission) => boolean }) {
  if (pathname === "/" || pathname === "") return <Redirect to={can("dashboard.view") ? "/dashboard" : "/assets"} />;
  // "/proposals/new" must win over "/proposals/:id".
  for (const route of ROUTES) {
    const params = matchRoute(route.pattern, pathname);
    if (!params) continue;
    if (route.pattern === "/proposals/:id" && params.id === "new") continue;
    if (!can(route.permission)) return <Forbidden />;
    return route.render(params);
  }
  return <NotFoundPage />;
}
