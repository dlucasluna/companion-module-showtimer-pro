import { can, type Permission } from "@/lib/auth/permissions";
import type { ActionResult } from "@/lib/utils";
import { current, currentUser } from "../data/store";
import type { DemoState, UserRec } from "../data/types";

export class DemoForbidden extends Error {
  constructor() {
    super("Sem permissão para esta ação.");
    this.name = "ForbiddenError";
  }
}

/** Same role checks as the server actions (UI parity inside the artifact). */
export function authorize(permission: Permission): { user: UserRec; state: DemoState } {
  const user = currentUser();
  if (!can(user.role, permission)) throw new DemoForbidden();
  return { user, state: current() };
}

export async function run<T>(fn: () => ActionResult<T> | Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DemoForbidden) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: error instanceof Error ? error.message : "Não foi possível concluir a operação." };
  }
}

export const firstName = (user: UserRec) => user.name.split(" ")[0] ?? user.name;
export const blank = (value: string | undefined | null) => (value && value.length > 0 ? value : null);
export const nowIso = () => new Date().toISOString();
