import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/database/prisma";
import { can, permissionsFor, type Permission, type RoleName } from "./permissions";
import { SESSION_COOKIE, SESSION_TTL_MS, decodeSession, encodeSession } from "./token";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  title: string | null;
  companyId: string;
  companyName: string;
  permissions: Permission[];
}

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Sem permissão: ${permission}`);
    this.name = "ForbiddenError";
  }
}

/** Current user, validated against the database once per request. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const payload = decodeSession(store.get(SESSION_COOKIE)?.value);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { company: { select: { name: true } } },
  });
  if (!user || !user.active || user.companyId !== payload.companyId) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    title: user.title,
    companyId: user.companyId,
    companyName: user.company.name,
    permissions: permissionsFor(user.role),
  };
});

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** For pages: redirects to the dashboard when the permission is missing. */
export async function requirePagePermission(permission: Permission): Promise<SessionUser> {
  const session = await requireSession();
  if (!can(session.role, permission)) redirect("/dashboard?denied=1");
  return session;
}

/** For server actions: throws so the action never runs without permission. */
export async function requireActionPermission(permission: Permission): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new ForbiddenError(permission);
  if (!can(session.role, permission)) throw new ForbiddenError(permission);
  return session;
}

export async function startSession(userId: string, companyId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession({ userId, companyId, exp: Date.now() + SESSION_TTL_MS }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
