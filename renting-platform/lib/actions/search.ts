"use server";

import { can } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

export interface SearchHit {
  id: string;
  type: "client" | "proposal" | "contract" | "asset";
  title: string;
  subtitle: string;
  href: string;
}

/** Global search for the command palette (⌘K). Results respect the user's permissions. */
export async function searchAction(query: string): Promise<SearchHit[]> {
  const session = await getSession();
  const term = query.trim();
  if (!session || term.length < 2) return [];
  const companyId = session.companyId;
  const contains = { contains: term };

  const [clients, proposals, contracts, assets] = await Promise.all([
    can(session.role, "clients.view")
      ? prisma.client.findMany({ where: { companyId, OR: [{ name: contains }, { city: contains }, { contacts: { some: { name: contains } } }] }, take: 5 })
      : [],
    can(session.role, "proposals.view")
      ? prisma.proposal.findMany({
          where: { companyId, OR: [{ proposalNumber: contains }, { title: contains }, { client: { name: contains } }] },
          include: { client: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          take: 5,
        })
      : [],
    can(session.role, "contracts.view")
      ? prisma.contract.findMany({
          where: { companyId, OR: [{ contractNumber: contains }, { client: { name: contains } }] },
          include: { client: { select: { name: true } } },
          take: 5,
        })
      : [],
    can(session.role, "assets.view")
      ? prisma.asset.findMany({
          where: { companyId, OR: [{ assetTag: contains }, { serialNumber: contains }, { product: { name: contains } }] },
          include: { product: { select: { name: true } } },
          take: 5,
        })
      : [],
  ]);

  return [
    ...clients.map((c): SearchHit => ({ id: c.id, type: "client", title: c.name, subtitle: c.city ?? "Cliente", href: `/clients/${c.id}` })),
    ...proposals.map((p): SearchHit => ({ id: p.id, type: "proposal", title: `${p.proposalNumber} · ${p.title}`, subtitle: p.client.name, href: `/proposals/${p.id}` })),
    ...contracts.map((c): SearchHit => ({ id: c.id, type: "contract", title: c.contractNumber, subtitle: c.client.name, href: `/contracts?q=${encodeURIComponent(c.contractNumber)}` })),
    ...assets.map((a): SearchHit => ({ id: a.id, type: "asset", title: `${a.assetTag} · ${a.product.name}`, subtitle: a.serialNumber ?? "Sem série", href: `/assets?q=${encodeURIComponent(a.assetTag)}` })),
  ];
}
