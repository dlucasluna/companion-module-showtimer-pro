import { describe, expect, it } from "vitest";
import { FORBIDDEN_CLIENT_KEYS, collectKeys, toCommercialProposal } from "@/lib/security/projections";
import { can, permissionsFor } from "@/lib/auth/permissions";

const now = new Date("2026-09-26T10:00:00Z");

function fixture() {
  const company = {
    id: "co",
    name: "ChurchTech Rent",
    legalName: "ChurchTech Rent, Lda.",
    taxId: "PT1",
    email: "a@b.pt",
    phone: null,
    website: null,
    address: null,
    city: "Lisboa",
    postalCode: null,
    country: "PT",
    locale: "pt-PT",
    currency: "EUR",
    logoUrl: null,
    tagline: null,
    proposalPrefix: "PRP",
    contractPrefix: "CTR",
    proposalValidityDays: 30,
    proposalTerms: "Termo 1\nTermo 2",
    createdAt: now,
    updatedAt: now,
  };
  const item = (overrides: Record<string, unknown>) => ({
    id: "i",
    proposalId: "p",
    productId: "prod",
    variantId: null,
    quantity: 2,
    internalUnitCost: 99_000,
    internalTotal: 198_000,
    displayName: "Câmera PTZ Standard",
    description: "PTZ",
    categoryName: "Câmeras",
    productType: "HARDWARE" as const,
    commercialMonthlyImpact: 10_700,
    sortOrder: 0,
    ...overrides,
  });
  return {
    id: "p",
    companyId: "co",
    proposalNumber: "PRP-2026-0001",
    title: "Sistema Broadcast",
    status: "SENT" as const,
    kind: "NEW" as const,
    clientId: "c",
    contactName: "Pr. João Silva",
    planId: null,
    supportPlanId: "s",
    contractId: null,
    contractMonths: 24,
    upfrontMode: "PERCENT" as const,
    upfrontValue: 0.3,
    discountMode: "PERCENT" as const,
    discountValue: 0,
    monthlyOverride: 25_000,
    targetMargin: 0.4,
    pricesIncludeVat: true,
    vatRate: 0.23,
    initialPayment: 280_000,
    monthlyPayment: 27_200,
    internalCost: 539_900,
    targetRevenue: 930_000,
    contractRevenue: 932_800,
    grossProfit: 392_900,
    grossMargin: 0.421,
    markup: 0.72,
    breakEvenMonth: 9,
    residualValue: 150_000,
    discountAmount: 0,
    pricingSnapshot: { targetMultiplier: 1.8 },
    notes: null,
    internalNotes: "negociar",
    publicToken: "secret",
    validUntil: new Date("2026-10-26T10:00:00Z"),
    presentedAt: null,
    sentAt: null,
    viewedAt: null,
    acceptedAt: null,
    rejectedAt: null,
    createdById: null,
    updatedById: null,
    createdAt: now,
    updatedAt: now,
    company,
    client: { id: "c", companyId: "co", name: "Igreja Batista Central", legalName: null, taxId: null, email: null, phone: null, website: null, address: null, city: "Lisboa", postalCode: null, country: "PT", status: "PROSPECT" as const, notes: null, lastInteractionAt: null, createdAt: now, updatedAt: now },
    items: [item({}), item({ id: "j", displayName: "Instalação Standard", productType: "INSTALLATION", quantity: 1 })],
    supportPlan: { id: "s", companyId: "co", name: "Remote", slug: "remote", description: null, features: ["A"], monthlyCost: 1500, monthlyPrice: 2900, responseTimeHours: 8, onSite: false, isDefault: false, active: true, sortOrder: 0, createdAt: now, updatedAt: now },
    signatures: [],
  };
}

describe("client-facing projection", () => {
  it("never contains internal keys", () => {
    const dto = toCommercialProposal(fixture(), now);
    const keys = collectKeys(JSON.parse(JSON.stringify(dto)));
    for (const forbidden of FORBIDDEN_CLIENT_KEYS) expect(keys.has(forbidden)).toBe(false);
  });

  it("never contains internal values", () => {
    const json = JSON.stringify(toCommercialProposal(fixture(), now));
    expect(json).not.toContain("99000");
    expect(json).not.toContain("negociar");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("0.421");
  });

  it("shows VAT-inclusive commercial values when configured", () => {
    const dto = toCommercialProposal(fixture(), now);
    expect(dto.commercial.monthlyPayment).toBe(Math.round(27_200 * 1.23));
    expect(dto.commercial.initialPayment).toBe(Math.round(280_000 * 1.23));
    expect(dto.support?.monthlyPrice).toBe(Math.round(2900 * 1.23));
  });

  it("splits equipment and services", () => {
    const dto = toCommercialProposal(fixture(), now);
    expect(dto.equipment.map((i) => i.name)).toEqual(["Câmera PTZ Standard"]);
    expect(dto.services.map((i) => i.name)).toEqual(["Instalação Standard"]);
  });
});

describe("permissions", () => {
  it("only internal roles see internal data", () => {
    expect(can("ADMIN", "internal.view")).toBe(true);
    expect(can("SALES", "internal.view")).toBe(true);
    expect(can("FINANCE", "internal.view")).toBe(true);
    expect(can("VIEWER", "internal.view")).toBe(false);
    expect(can("TECHNICIAN", "internal.view")).toBe(false);
    expect(can("CLIENT", "internal.view")).toBe(false);
  });

  it("client role only has portal access", () => {
    expect(permissionsFor("CLIENT")).toEqual(["portal.view"]);
  });
});
