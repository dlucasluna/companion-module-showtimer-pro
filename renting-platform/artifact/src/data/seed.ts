import type { ContractStatus } from "@prisma/client";
import type { ConfigLine, ProposalConfig } from "@/lib/pricing";
import { buildProposalSnapshot } from "@/lib/proposals/snapshot";
import {
  CATEGORIES,
  CLIENTS,
  COMPANY,
  PAYMENT_CONDITIONS,
  PLANS,
  PRODUCTS,
  PROPOSALS,
  SUPPLIERS,
  SUPPORT_PLANS,
  USERS,
  euros,
} from "../../../prisma/seed-data";
import { newId, newToken } from "../ids";
import { displayLookup, pricingContext } from "./derive";
import type { AssetRec, ContractRec, DemoState, PlanRec, ProductRec, ProposalRec } from "./types";

const DAY = 86_400_000;
const iso = (date: Date) => date.toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * DAY);
const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};
const startOfMonthsAgo = (months: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - months, 1, 9);
};

const TIMELINE: Record<string, (c: Date) => Partial<ProposalRec>> = {
  PRESENTED: (c) => ({ presentedAt: iso(c) }),
  SENT: (c) => ({ presentedAt: iso(c), sentAt: iso(new Date(c.getTime() + DAY)) }),
  VIEWED: (c) => ({ presentedAt: iso(c), sentAt: iso(new Date(c.getTime() + DAY)), viewedAt: iso(new Date(c.getTime() + 2 * DAY)) }),
  CONVERTED: (c) => ({ presentedAt: iso(c), sentAt: iso(new Date(c.getTime() + DAY)), acceptedAt: iso(new Date(c.getTime() + 4 * DAY)) }),
  REJECTED: (c) => ({ presentedAt: iso(c), rejectedAt: iso(new Date(c.getTime() + 10 * DAY)) }),
  EXPIRED: (c) => ({ presentedAt: iso(c), sentAt: iso(new Date(c.getTime() + DAY)) }),
};

/** Demo data equivalent to `prisma/seed.ts`, built in the browser. */
export function buildSeed(): DemoState {
  const now = new Date();
  const state: DemoState = {
    company: {
      id: "company",
      ...COMPANY,
      country: "PT",
      locale: "pt-PT",
      currency: "EUR",
      logoUrl: null,
      proposalPrefix: "PRP",
      contractPrefix: "CTR",
      proposalValidityDays: 30,
      createdAt: iso(now),
      updatedAt: iso(now),
    },
    users: {},
    clients: {},
    suppliers: {},
    categories: {},
    products: {},
    supportPlans: {},
    pricingRules: {},
    paymentConditions: {},
    plans: {},
    proposals: {},
    contracts: {},
    assets: {},
    activity: [],
  };

  for (const user of USERS) {
    const id = newId();
    state.users[id] = { id, name: user.name, email: user.email, role: user.role, title: user.title, active: true, lastLoginAt: null };
  }
  const admin = Object.values(state.users).find((u) => u.role === "ADMIN")!;
  const seller = Object.values(state.users).find((u) => u.role === "SALES")!;

  const supplierIds = new Map<string, string>();
  for (const supplier of SUPPLIERS) {
    const id = newId();
    supplierIds.set(supplier.key, id);
    state.suppliers[id] = { id, name: supplier.name, email: supplier.email, phone: "phone" in supplier ? supplier.phone : null };
  }

  const categoryIds = new Map<string, string>();
  CATEGORIES.forEach((category, index) => {
    const id = newId();
    categoryIds.set(category.slug, id);
    state.categories[id] = { id, name: category.name, slug: category.slug, description: category.description, icon: category.icon, sortOrder: index };
  });

  const productsBySlug = new Map<string, ProductRec>();
  PRODUCTS.forEach((p, index) => {
    const id = newId();
    const product: ProductRec = {
      id,
      categoryId: categoryIds.get(p.category)!,
      supplierId: p.supplier ? (supplierIds.get(p.supplier) ?? null) : null,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      type: p.type,
      brand: p.brand ?? null,
      model: p.model ?? null,
      description: p.description,
      salesDescription: p.salesDescription ?? null,
      benefit: p.benefit ?? null,
      internalCost: euros(p.cost),
      referencePrice: p.referencePrice ? euros(p.referencePrice) : null,
      defaultResidualPercent: p.residualPercent ?? null,
      warrantyMonths: p.warrantyMonths ?? null,
      expectedLifeMonths: p.expectedLifeMonths ?? null,
      imageUrl: p.image,
      notes: null,
      defaultQuantity: 1,
      maxQuantity: p.maxQuantity ?? null,
      unitLabel: p.unitLabel ?? null,
      active: true,
      sortOrder: index,
      variants: (p.variants ?? []).map((v, vIndex) => ({
        id: newId(),
        name: v.name,
        sku: v.sku,
        description: v.description,
        benefit: v.benefit,
        internalCost: euros(v.cost),
        referencePrice: v.referencePrice ? euros(v.referencePrice) : null,
        residualPercent: v.residualPercent ?? null,
        expectedLifeMonths: null,
        attributes: v.attributes ?? null,
        isDefault: v.isDefault ?? false,
        active: true,
        sortOrder: vIndex,
      })),
    };
    state.products[id] = product;
    productsBySlug.set(p.slug, product);
  });

  const supportIds = new Map<string, string>();
  SUPPORT_PLANS.forEach((plan, index) => {
    const id = newId();
    supportIds.set(plan.slug, id);
    state.supportPlans[id] = {
      id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      features: [...plan.features],
      monthlyCost: euros(plan.monthlyCost),
      monthlyPrice: euros(plan.monthlyPrice),
      responseTimeHours: plan.responseTimeHours,
      onSite: plan.onSite,
      isDefault: "isDefault" in plan ? plan.isDefault : false,
      active: true,
      sortOrder: index,
    };
  });

  const globalRuleId = newId();
  state.pricingRules[globalRuleId] = {
    id: globalRuleId,
    scope: "GLOBAL",
    planId: null,
    targetMultiplier: 1.8,
    defaultUpfrontPercent: 0.3,
    defaultContractMonths: 24,
    riskReservePercent: 0.02,
    maintenanceReservePercent: 0.015,
    defaultResidualPercent: 0.15,
    residualCreditPercent: 0,
    vatRate: 0.23,
    minMarginPercent: 0.35,
    pricesIncludeVat: false,
    roundMonthlyTo: 100,
    roundUpfrontTo: 1000,
    allowedContractMonths: "12,24,36,48",
  };

  PAYMENT_CONDITIONS.forEach((condition, index) => {
    const id = newId();
    state.paymentConditions[id] = { id, ...condition, discountPercent: 0, active: true, sortOrder: index };
  });

  const plansBySlug = new Map<string, PlanRec>();
  PLANS.forEach((plan, index) => {
    const id = newId();
    const record: PlanRec = {
      id,
      name: plan.name,
      slug: plan.slug,
      kind: "PRESET",
      tagline: plan.tagline,
      description: plan.description,
      highlight: plan.highlight ?? null,
      supportPlanId: supportIds.get(plan.support) ?? null,
      contractMonths: plan.contractMonths,
      upfrontPercent: plan.upfrontPercent,
      active: true,
      sortOrder: index,
      createdById: admin.id,
      createdAt: iso(now),
      items: plan.items.map((item) => {
        const product = productsBySlug.get(item.product)!;
        const variant = item.variant ? product.variants.find((v) => v.sku === item.variant) : undefined;
        return { productId: product.id, variantId: variant?.id ?? null, quantity: item.quantity };
      }),
    };
    state.plans[id] = record;
    plansBySlug.set(plan.slug, record);
    if (plan.multiplierOverride) {
      const ruleId = newId();
      state.pricingRules[ruleId] = {
        id: ruleId,
        scope: "PLAN",
        planId: id,
        targetMultiplier: plan.multiplierOverride,
        defaultUpfrontPercent: null,
        defaultContractMonths: null,
        riskReservePercent: null,
        maintenanceReservePercent: null,
        defaultResidualPercent: null,
        residualCreditPercent: null,
        vatRate: null,
        minMarginPercent: null,
        pricesIncludeVat: null,
        roundMonthlyTo: null,
        roundUpfrontTo: null,
        allowedContractMonths: null,
      };
    }
  });

  const clientIds = new Map<string, { id: string; contactName: string }>();
  CLIENTS.forEach((client, index) => {
    const id = newId();
    clientIds.set(client.key, { id, contactName: client.contact.name });
    state.clients[id] = {
      id,
      name: client.name,
      legalName: null,
      taxId: null,
      email: client.email,
      phone: client.phone,
      website: null,
      address: null,
      city: client.city,
      postalCode: null,
      country: "PT",
      status: client.status,
      notes: null,
      lastInteractionAt: iso(daysAgo(index + 1)),
      createdAt: iso(daysAgo(400 - index * 20)),
      updatedAt: iso(daysAgo(index + 1)),
      contacts: [
        {
          id: newId(),
          name: client.contact.name,
          role: client.contact.role,
          email: client.contact.email ?? null,
          phone: client.contact.phone ?? null,
          isPrimary: true,
        },
      ],
    };
  });

  const lookup = displayLookup(state);
  const camera = productsBySlug.get("camera-ptz")!;
  const ndi = camera.variants.find((v) => v.sku === "PTZ-NDI")!;
  let proposalSeq = 0;
  let contractSeq = 0;
  let assetSeq = 0;

  for (const seed of [...PROPOSALS].sort((a, b) => b.createdDaysAgo - a.createdDaysAgo)) {
    const planDef = PLANS.find((p) => p.slug === seed.plan)!;
    const plan = plansBySlug.get(seed.plan)!;
    const client = clientIds.get(seed.client)!;
    const supportPlanId = supportIds.get(seed.support ?? planDef.support) ?? null;
    const lines: ConfigLine[] = plan.items.map((item) =>
      item.productId !== camera.id
        ? { ...item }
        : { productId: item.productId, variantId: seed.swapToNdi ? ndi.id : item.variantId, quantity: item.quantity + (seed.extraCameras ?? 0) },
    );
    const config: ProposalConfig = {
      lines,
      contractMonths: seed.contractMonths ?? planDef.contractMonths,
      upfront: { mode: "percent", value: seed.upfrontPercent ?? planDef.upfrontPercent },
      discount: { mode: "percent", value: 0 },
      supportPlanId,
      monthlyOverride: null,
      targetMargin: null,
      pricesIncludeVat: false,
    };
    const context = pricingContext(state, plan.id);
    const snapshot = buildProposalSnapshot(config, context, lookup);
    const createdAt = daysAgo(seed.createdDaysAgo);
    proposalSeq += 1;
    const id = newId();
    const number = `PRP-${createdAt.getFullYear()}-${String(proposalSeq).padStart(4, "0")}`;
    const proposal: ProposalRec = {
      id,
      proposalNumber: number,
      title: "Sistema Broadcast",
      status: seed.status,
      kind: "NEW",
      clientId: client.id,
      contactName: client.contactName,
      planId: plan.id,
      supportPlanId,
      contractId: null,
      contractMonths: config.contractMonths,
      upfrontMode: "PERCENT",
      upfrontValue: config.upfront.value,
      discountMode: "PERCENT",
      discountValue: 0,
      monthlyOverride: null,
      targetMargin: null,
      pricesIncludeVat: false,
      vatRate: context.rules.vatRate,
      ...snapshot.totals,
      notes: null,
      publicToken: newToken(),
      validUntil: iso(new Date(createdAt.getTime() + 30 * DAY)),
      presentedAt: null,
      sentAt: null,
      viewedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      createdById: seed.status === "DRAFT" ? seller.id : admin.id,
      updatedById: admin.id,
      createdAt: iso(createdAt),
      updatedAt: iso(new Date(createdAt.getTime() + Math.min(seed.createdDaysAgo, 5) * DAY * 0.6)),
      items: snapshot.items.map((item) => ({ id: newId(), ...item })),
      signatures:
        seed.status === "CONVERTED"
          ? [
              {
                id: newId(),
                signerName: client.contactName,
                signerEmail: null,
                signerRole: null,
                method: "TYPED",
                imageData: null,
                acceptedTerms: true,
                signedAt: iso(new Date(createdAt.getTime() + 4 * DAY)),
              },
            ]
          : [],
      history: [
        {
          id: newId(),
          userId: admin.id,
          action: "proposal.created",
          summary: `Proposta ${number} criada a partir de ${planDef.name}`,
          createdAt: iso(createdAt),
          updatedAt: iso(createdAt),
        },
      ],
      ...(TIMELINE[seed.status]?.(createdAt) ?? {}),
    };
    state.proposals[id] = proposal;
    state.activity.push({ id: newId(), summary: `Proposta ${number} criada a partir de ${planDef.name}`, createdAt: iso(createdAt) });

    if (!seed.contract) continue;
    contractSeq += 1;
    const start = seed.contract.startMonthsAgo > 0 ? startOfMonthsAgo(seed.contract.startMonthsAgo) : null;
    const status: ContractStatus = seed.contract.status;
    const contractId = newId();
    const contract: ContractRec = {
      id: contractId,
      contractNumber: `CTR-${createdAt.getFullYear()}-${String(contractSeq).padStart(4, "0")}`,
      clientId: client.id,
      proposalId: id,
      supportPlanId,
      status,
      startDate: start ? iso(start) : null,
      endDate: start ? iso(addMonths(start, config.contractMonths)) : null,
      contractMonths: config.contractMonths,
      initialPayment: snapshot.totals.initialPayment,
      monthlyPayment: snapshot.totals.monthlyPayment,
      vatRate: context.rules.vatRate,
      internalCost: snapshot.totals.internalCost,
      grossMargin: snapshot.totals.grossMargin,
      version: 1,
      signedAt: iso(new Date(createdAt.getTime() + 4 * DAY)),
      createdAt: iso(new Date(createdAt.getTime() + 4 * DAY)),
      items: snapshot.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        displayName: item.displayName,
        internalUnitCost: item.internalUnitCost,
      })),
    };
    state.contracts[contractId] = contract;

    const assetStatus = status === "ACTIVE" || status === "SUSPENDED" ? "INSTALLED" : status === "ENDED" ? "STOCK" : "RESERVED";
    for (const item of snapshot.items.filter((i) => i.productType === "HARDWARE")) {
      const product = state.products[item.productId]!;
      for (let unit = 0; unit < item.quantity; unit += 1) {
        assetSeq += 1;
        const purchaseDate = new Date((start ?? createdAt).getTime() - 7 * DAY);
        const asset: AssetRec = {
          id: newId(),
          productId: item.productId,
          variantId: item.variantId,
          supplierId: product.supplierId,
          clientId: assetStatus === "STOCK" ? null : client.id,
          contractId: assetStatus === "STOCK" ? null : contractId,
          assetTag: `CT-${String(assetSeq).padStart(5, "0")}`,
          serialNumber: `${product.sku}-${(10_000 + assetSeq * 37).toString(36).toUpperCase()}`,
          status: assetStatus,
          purchaseDate: iso(purchaseDate),
          purchaseCost: item.internalUnitCost,
          warrantyUntil: product.warrantyMonths ? iso(addMonths(purchaseDate, product.warrantyMonths)) : null,
          location: assetStatus === "INSTALLED" ? "Auditório principal" : "Armazém Lisboa",
        };
        state.assets[asset.id] = asset;
      }
    }
  }

  const stock = [
    { slug: "camera-ptz", variant: "PTZ-STD", count: 3, status: "STOCK" as const },
    { slug: "camera-ptz", variant: "PTZ-NDI", count: 2, status: "STOCK" as const },
    { slug: "computador-broadcast", variant: "PC-BC-BASIC", count: 1, status: "STOCK" as const },
    { slug: "controladora-ptz", count: 1, status: "MAINTENANCE" as const },
    { slug: "monitor", count: 1, status: "DAMAGED" as const },
  ];
  for (const entry of stock) {
    const product = productsBySlug.get(entry.slug)!;
    const variant = entry.variant ? product.variants.find((v) => v.sku === entry.variant) : undefined;
    for (let i = 0; i < entry.count; i += 1) {
      assetSeq += 1;
      const purchaseDate = daysAgo(40 + i * 5);
      const asset: AssetRec = {
        id: newId(),
        productId: product.id,
        variantId: variant?.id ?? null,
        supplierId: product.supplierId,
        clientId: null,
        contractId: null,
        assetTag: `CT-${String(assetSeq).padStart(5, "0")}`,
        serialNumber: `${variant?.sku ?? product.sku}-${(10_000 + assetSeq * 37).toString(36).toUpperCase()}`,
        status: entry.status,
        purchaseDate: iso(purchaseDate),
        purchaseCost: variant?.internalCost ?? product.internalCost,
        warrantyUntil: product.warrantyMonths ? iso(addMonths(purchaseDate, product.warrantyMonths)) : null,
        location: entry.status === "MAINTENANCE" ? "Oficina técnica" : "Armazém Lisboa",
      };
      state.assets[asset.id] = asset;
    }
  }

  state.activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return state;
}
