/**
 * Role based access control. The server enforces these on every page and
 * server action; the UI only uses them to decide what to render.
 */

export const ROLES = ["ADMIN", "SALES", "TECHNICIAN", "FINANCE", "VIEWER", "CLIENT"] as const;
export type RoleName = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard.view",
  /** Internal financials: costs, margin, markup, profit, break-even. */
  "internal.view",
  "proposals.view",
  "proposals.manage",
  "clients.view",
  "clients.manage",
  "contracts.view",
  "contracts.manage",
  "catalog.view",
  "catalog.manage",
  "plans.manage",
  "templates.manage",
  "assets.view",
  "assets.manage",
  "finance.view",
  "settings.manage",
  "portal.view",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const MATRIX: Record<RoleName, readonly Permission[]> = {
  ADMIN: PERMISSIONS.filter((p) => p !== "portal.view"),
  SALES: [
    "dashboard.view",
    "internal.view",
    "proposals.view",
    "proposals.manage",
    "clients.view",
    "clients.manage",
    "contracts.view",
    "catalog.view",
    "templates.manage",
  ],
  FINANCE: [
    "dashboard.view",
    "internal.view",
    "finance.view",
    "proposals.view",
    "clients.view",
    "contracts.view",
    "contracts.manage",
    "catalog.view",
    "assets.view",
  ],
  TECHNICIAN: ["dashboard.view", "assets.view", "assets.manage", "contracts.view", "clients.view", "catalog.view"],
  VIEWER: ["dashboard.view", "proposals.view", "clients.view", "contracts.view", "catalog.view", "assets.view"],
  CLIENT: ["portal.view"],
};

export function can(role: RoleName, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function permissionsFor(role: RoleName): Permission[] {
  return [...MATRIX[role]];
}

export const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: "Administrador",
  SALES: "Comercial",
  TECHNICIAN: "Técnico",
  FINANCE: "Financeiro",
  VIEWER: "Leitura",
  CLIENT: "Cliente",
};
