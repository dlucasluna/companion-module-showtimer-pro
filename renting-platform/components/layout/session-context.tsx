"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Permission, RoleName } from "@/lib/auth/permissions";

export interface ClientSession {
  id: string;
  name: string;
  email: string;
  role: RoleName;
  title: string | null;
  companyName: string;
  permissions: Permission[];
}

const SessionContext = createContext<ClientSession | null>(null);

export function SessionProvider({ session, children }: { session: ClientSession; children: ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): ClientSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}

export function useCan(permission: Permission): boolean {
  return useSession().permissions.includes(permission);
}
