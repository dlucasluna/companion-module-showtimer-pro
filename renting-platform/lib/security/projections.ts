import type { Company, Client, Contact, Proposal, ProposalItem, ProposalSignature, ProposalStatus, SupportPlan, ProductType } from "@prisma/client";

/**
 * Commercial projection of a proposal — the ONLY shape that reaches the proposal
 * document, the public share link (/p/[token]) and client-facing views.
 * Built by explicit field picking (allow-list), never by spreading database rows,
 * so new internal columns can't leak by accident.
 */

export interface CommercialItem {
  name: string;
  description: string | null;
  quantity: number;
  category: string | null;
}

export interface CommercialProposalDTO {
  number: string;
  title: string;
  status: ProposalStatus;
  createdAt: string;
  validUntil: string;
  expired: boolean;
  company: {
    name: string;
    legalName: string | null;
    taxId: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    tagline: string | null;
    locale: string;
  };
  client: { name: string; city: string | null; address: string | null; email: string | null; phone: string | null };
  contactName: string | null;
  equipment: CommercialItem[];
  services: CommercialItem[];
  support: { name: string; description: string | null; features: string[]; monthlyPrice: number } | null;
  commercial: {
    initialPayment: number;
    monthlyPayment: number;
    contractMonths: number;
    vatRate: number;
    pricesIncludeVat: boolean;
    discountAmount: number;
    totalContract: number;
  };
  terms: string[];
  notes: string | null;
  signature: { signerName: string; signerRole: string | null; signedAt: string; imageData: string | null } | null;
}

/** Keys that must never appear in a client-facing payload (verified by tests). */
export const FORBIDDEN_CLIENT_KEYS = [
  "internalCost",
  "internalUnitCost",
  "internalTotal",
  "grossProfit",
  "grossMargin",
  "markup",
  "breakEvenMonth",
  "targetRevenue",
  "contractRevenue",
  "residualValue",
  "pricingSnapshot",
  "internalNotes",
  "monthlyCost",
  "targetMargin",
  "monthlyOverride",
  "commercialMonthlyImpact",
  "publicToken",
] as const;

const SERVICE_TYPES: ProductType[] = ["SERVICE", "INSTALLATION", "SUPPORT"];

type ProposalWithRelations = Proposal & {
  company: Company;
  client: Client & { contacts?: Contact[] };
  items: ProposalItem[];
  supportPlan: SupportPlan | null;
  signatures: ProposalSignature[];
};

const gross = (net: number, vat: number) => Math.round(net * (1 + vat));

export function toCommercialProposal(proposal: ProposalWithRelations, now = new Date()): CommercialProposalDTO {
  const vat = proposal.vatRate;
  const display = (net: number) => (proposal.pricesIncludeVat ? gross(net, vat) : net);
  const toItem = (item: ProposalItem): CommercialItem => ({
    name: item.displayName,
    description: item.description,
    quantity: item.quantity,
    category: item.categoryName,
  });
  const signature = proposal.signatures.at(-1) ?? null;
  const features = Array.isArray(proposal.supportPlan?.features) ? (proposal.supportPlan.features as unknown[]).map(String) : [];
  const initialPayment = display(proposal.initialPayment);
  const monthlyPayment = display(proposal.monthlyPayment);

  return {
    number: proposal.proposalNumber,
    title: proposal.title,
    status: proposal.status,
    createdAt: proposal.createdAt.toISOString(),
    validUntil: proposal.validUntil.toISOString(),
    expired: proposal.validUntil < now && !["ACCEPTED", "CONVERTED"].includes(proposal.status),
    company: {
      name: proposal.company.name,
      legalName: proposal.company.legalName,
      taxId: proposal.company.taxId,
      email: proposal.company.email,
      phone: proposal.company.phone,
      website: proposal.company.website,
      address: proposal.company.address,
      city: proposal.company.city,
      postalCode: proposal.company.postalCode,
      tagline: proposal.company.tagline,
      locale: proposal.company.locale,
    },
    client: {
      name: proposal.client.name,
      city: proposal.client.city,
      address: proposal.client.address,
      email: proposal.client.email,
      phone: proposal.client.phone,
    },
    contactName: proposal.contactName,
    equipment: proposal.items.filter((i) => !SERVICE_TYPES.includes(i.productType)).map(toItem),
    services: proposal.items.filter((i) => SERVICE_TYPES.includes(i.productType)).map(toItem),
    support: proposal.supportPlan
      ? {
          name: proposal.supportPlan.name,
          description: proposal.supportPlan.description,
          features,
          monthlyPrice: display(proposal.supportPlan.monthlyPrice),
        }
      : null,
    commercial: {
      initialPayment,
      monthlyPayment,
      contractMonths: proposal.contractMonths,
      vatRate: vat,
      pricesIncludeVat: proposal.pricesIncludeVat,
      discountAmount: display(proposal.discountAmount),
      totalContract: initialPayment + monthlyPayment * proposal.contractMonths,
    },
    terms: (proposal.company.proposalTerms ?? "").split("\n").map((t) => t.trim()).filter(Boolean),
    notes: proposal.notes,
    signature: signature
      ? {
          signerName: signature.signerName,
          signerRole: signature.signerRole,
          signedAt: signature.signedAt.toISOString(),
          imageData: signature.imageData,
        }
      : null,
  };
}

/** Recursively lists every key of a serialisable value (used by leak tests). */
export function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, keys));
  else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      keys.add(key);
      collectKeys(v, keys);
    }
  }
  return keys;
}
