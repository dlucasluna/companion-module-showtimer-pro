import type { SearchHit } from "../../../lib/actions/search";
import { can } from "@/lib/auth/permissions";
import { current, currentUser } from "../data/store";

export type { SearchHit };

const norm = (value: string | null | undefined) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Global search for ⌘K — same result shape and permission filters as the server. */
export async function searchAction(query: string): Promise<SearchHit[]> {
  const term = norm(query.trim());
  if (term.length < 2) return [];
  const state = current();
  const role = currentUser().role;
  const has = (...values: (string | null | undefined)[]) => values.some((v) => norm(v).includes(term));
  const hits: SearchHit[] = [];
  if (can(role, "clients.view")) {
    for (const c of Object.values(state.clients).filter((c) => has(c.name, c.city, ...c.contacts.map((x) => x.name))).slice(0, 5))
      hits.push({ id: c.id, type: "client", title: c.name, subtitle: c.city ?? "Cliente", href: `/clients/${c.id}` });
  }
  if (can(role, "proposals.view")) {
    for (const p of Object.values(state.proposals)
      .filter((p) => has(p.proposalNumber, p.title, state.clients[p.clientId]?.name))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5))
      hits.push({ id: p.id, type: "proposal", title: `${p.proposalNumber} · ${p.title}`, subtitle: state.clients[p.clientId]?.name ?? "", href: `/proposals/${p.id}` });
  }
  if (can(role, "contracts.view")) {
    for (const c of Object.values(state.contracts).filter((c) => has(c.contractNumber, state.clients[c.clientId]?.name)).slice(0, 5))
      hits.push({ id: c.id, type: "contract", title: c.contractNumber, subtitle: state.clients[c.clientId]?.name ?? "", href: `/contracts?q=${encodeURIComponent(c.contractNumber)}` });
  }
  if (can(role, "assets.view")) {
    for (const a of Object.values(state.assets).filter((a) => has(a.assetTag, a.serialNumber, state.products[a.productId]?.name)).slice(0, 5))
      hits.push({ id: a.id, type: "asset", title: `${a.assetTag} · ${state.products[a.productId]?.name ?? ""}`, subtitle: a.serialNumber ?? "Sem série", href: `/assets?q=${encodeURIComponent(a.assetTag)}` });
  }
  return hits;
}
