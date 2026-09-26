import type { ActionResult } from "@/lib/utils";

/** Converts thrown errors (e.g. ForbiddenError) into a typed ActionResult for the client. */
export async function guarded<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") return { ok: false, error: "Sem permissão para esta ação." };
    console.error(error);
    return { ok: false, error: "Não foi possível concluir a operação." };
  }
}
