import type { ActionResult } from "@/lib/utils";
import { clientSchema, type ClientInput } from "@/lib/validation/client";
import { newId } from "../ids";
import { commit, logActivity } from "../data/store";
import type { ClientRec } from "../data/types";
import { authorize, blank, firstName, nowIso, run } from "./common";

function contactFrom(input: ClientInput, id: string) {
  return { id, name: input.contactName, role: blank(input.contactRole), email: blank(input.contactEmail), phone: blank(input.contactPhone), isPrimary: true };
}

export async function createClientAction(input: ClientInput): Promise<ActionResult<{ id: string; name: string; contactName: string }>> {
  return run(() => {
    const { user, state } = authorize("clients.manage");
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const d = parsed.data;
    const id = newId();
    const now = nowIso();
    const client: ClientRec = {
      id,
      name: d.name,
      legalName: null,
      taxId: blank(d.taxId),
      email: blank(d.email),
      phone: blank(d.phone),
      website: null,
      address: blank(d.address),
      city: blank(d.city),
      postalCode: blank(d.postalCode),
      country: "PT",
      status: d.status,
      notes: blank(d.notes),
      lastInteractionAt: now,
      createdAt: now,
      updatedAt: now,
      contacts: [contactFrom(d, newId())],
    };
    const logged = logActivity({ ...state, clients: { ...state.clients, [id]: client } }, `${firstName(user)} criou o cliente ${client.name}`);
    commit(logged.state, [{ collection: "clients", id }, logged.dirty]);
    return { ok: true, data: { id, name: client.name, contactName: d.contactName } };
  });
}

export async function updateClientAction(id: string, input: ClientInput): Promise<ActionResult> {
  return run(() => {
    const { state } = authorize("clients.manage");
    const parsed = clientSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const existing = state.clients[id];
    if (!existing) return { ok: false, error: "Cliente não encontrado." };
    const d = parsed.data;
    const primary = existing.contacts.find((c) => c.isPrimary);
    const contact = contactFrom(d, primary?.id ?? newId());
    const client: ClientRec = {
      ...existing,
      name: d.name,
      city: blank(d.city),
      email: blank(d.email),
      phone: blank(d.phone),
      address: blank(d.address),
      postalCode: blank(d.postalCode),
      taxId: blank(d.taxId),
      status: d.status,
      notes: blank(d.notes),
      updatedAt: nowIso(),
      contacts: primary ? existing.contacts.map((c) => (c.id === primary.id ? contact : c)) : [contact, ...existing.contacts],
    };
    commit({ ...state, clients: { ...state.clients, [id]: client } }, [{ collection: "clients", id }]);
    return { ok: true, data: undefined };
  });
}
