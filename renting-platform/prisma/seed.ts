import { PrismaClient, type ContractStatus, type Plan, type Product, type ProductVariant } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { loadDisplayLookup } from "../lib/database/display";
import { loadPricingContext } from "../lib/database/pricing";
import type { ConfigLine, ProposalConfig } from "../lib/pricing";
import { createPublicToken } from "../lib/proposals/identifiers";
import { buildProposalSnapshot } from "../lib/proposals/snapshot";
import {
  CATEGORIES,
  CLIENTS,
  COMPANY,
  DEMO_PASSWORD,
  PAYMENT_CONDITIONS,
  PLANS,
  PRODUCTS,
  PROPOSALS,
  SUPPLIERS,
  SUPPORT_PLANS,
  USERS,
  euros,
  type SeedProposal,
} from "./seed-data";

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;

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

async function reset() {
  // Children first (SQLite enforces foreign keys).
  await prisma.auditLog.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.contractItem.deleteMany();
  await prisma.proposalSignature.deleteMany();
  await prisma.proposalItem.deleteMany();
  await prisma.contract.updateMany({ data: { proposalId: null, parentContractId: null } });
  await prisma.proposal.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.planItem.deleteMany();
  await prisma.pricingRule.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.paymentCondition.deleteMany();
  await prisma.supportPlan.deleteMany();
  await prisma.service.deleteMany();
  await prisma.installationService.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();
  await prisma.company.deleteMany();
}

async function seedCatalog(companyId: string) {
  const suppliers = new Map<string, string>();
  for (const supplier of SUPPLIERS) {
    const { key, ...data } = supplier;
    const created = await prisma.supplier.create({ data: { ...data, companyId } });
    suppliers.set(key, created.id);
  }

  const categories = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const created = await prisma.productCategory.create({ data: { ...category, companyId, sortOrder: index } });
    categories.set(category.slug, created.id);
  }

  const products = new Map<string, Product & { variants: ProductVariant[] }>();
  for (const [index, p] of PRODUCTS.entries()) {
    const created = await prisma.product.create({
      data: {
        companyId,
        categoryId: categories.get(p.category)!,
        supplierId: p.supplier ? suppliers.get(p.supplier) : undefined,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        type: p.type,
        brand: p.brand,
        model: p.model,
        description: p.description,
        salesDescription: p.salesDescription,
        benefit: p.benefit,
        internalCost: euros(p.cost),
        referencePrice: p.referencePrice ? euros(p.referencePrice) : undefined,
        defaultResidualPercent: p.residualPercent,
        warrantyMonths: p.warrantyMonths,
        expectedLifeMonths: p.expectedLifeMonths,
        imageUrl: p.image,
        maxQuantity: p.maxQuantity,
        unitLabel: p.unitLabel,
        sortOrder: index,
        variants: p.variants
          ? {
              create: p.variants.map((v, vIndex) => ({
                name: v.name,
                sku: v.sku,
                description: v.description,
                benefit: v.benefit,
                internalCost: euros(v.cost),
                referencePrice: v.referencePrice ? euros(v.referencePrice) : undefined,
                residualPercent: v.residualPercent,
                attributes: v.attributes,
                isDefault: v.isDefault ?? false,
                sortOrder: vIndex,
              })),
            }
          : undefined,
        service: p.service ? { create: p.service } : undefined,
        installationService: p.installation ? { create: p.installation } : undefined,
      },
      include: { variants: true },
    });
    products.set(p.slug, created);
  }

  const supportPlans = new Map<string, string>();
  for (const [index, plan] of SUPPORT_PLANS.entries()) {
    const created = await prisma.supportPlan.create({
      data: {
        companyId,
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        features: [...plan.features],
        monthlyCost: euros(plan.monthlyCost),
        monthlyPrice: euros(plan.monthlyPrice),
        responseTimeHours: plan.responseTimeHours,
        onSite: plan.onSite,
        isDefault: "isDefault" in plan ? plan.isDefault : false,
        sortOrder: index,
      },
    });
    supportPlans.set(plan.slug, created.id);
  }

  return { products, supportPlans };
}

async function seedPlans(
  companyId: string,
  createdById: string,
  products: Map<string, Product & { variants: ProductVariant[] }>,
  supportPlans: Map<string, string>,
) {
  await prisma.pricingRule.create({
    data: {
      companyId,
      scope: "GLOBAL",
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
    },
  });

  for (const [index, condition] of PAYMENT_CONDITIONS.entries()) {
    await prisma.paymentCondition.create({ data: { ...condition, companyId, sortOrder: index } });
  }

  const plans = new Map<string, Plan>();
  for (const [index, plan] of PLANS.entries()) {
    const created = await prisma.plan.create({
      data: {
        companyId,
        slug: plan.slug,
        name: plan.name,
        kind: "PRESET",
        tagline: plan.tagline,
        description: plan.description,
        highlight: plan.highlight,
        supportPlanId: supportPlans.get(plan.support),
        contractMonths: plan.contractMonths,
        upfrontPercent: plan.upfrontPercent,
        sortOrder: index,
        createdById,
        items: {
          create: plan.items.map((item, itemIndex) => {
            const product = products.get(item.product)!;
            const variant = item.variant ? product.variants.find((v) => v.sku === item.variant) : undefined;
            return { productId: product.id, variantId: variant?.id, quantity: item.quantity, sortOrder: itemIndex };
          }),
        },
      },
    });
    if (plan.multiplierOverride) {
      await prisma.pricingRule.create({
        data: { companyId, scope: "PLAN", planId: created.id, targetMultiplier: plan.multiplierOverride },
      });
    }
    plans.set(plan.slug, created);
  }
  return plans;
}

function buildConfig(
  seed: SeedProposal,
  planItems: { productId: string; variantId: string | null; quantity: number }[],
  plan: (typeof PLANS)[number],
  cameraProduct: Product & { variants: ProductVariant[] },
  supportPlanId: string | null,
): ProposalConfig {
  const ndi = cameraProduct.variants.find((v) => v.sku === "PTZ-NDI")!;
  const lines: ConfigLine[] = planItems.map((item) => {
    if (item.productId !== cameraProduct.id) return { ...item };
    return {
      productId: item.productId,
      variantId: seed.swapToNdi ? ndi.id : item.variantId,
      quantity: item.quantity + (seed.extraCameras ?? 0),
    };
  });
  return {
    lines,
    contractMonths: seed.contractMonths ?? plan.contractMonths,
    upfront: { mode: "percent", value: seed.upfrontPercent ?? plan.upfrontPercent },
    discount: { mode: "percent", value: 0 },
    supportPlanId,
    monthlyOverride: null,
    targetMargin: null,
    pricesIncludeVat: false,
  };
}

const STATUS_TIMELINE: Record<string, (created: Date) => Record<string, Date>> = {
  PRESENTED: (c) => ({ presentedAt: c }),
  SENT: (c) => ({ presentedAt: c, sentAt: new Date(c.getTime() + DAY) }),
  VIEWED: (c) => ({ presentedAt: c, sentAt: new Date(c.getTime() + DAY), viewedAt: new Date(c.getTime() + 2 * DAY) }),
  ACCEPTED: (c) => ({ presentedAt: c, sentAt: new Date(c.getTime() + DAY), viewedAt: new Date(c.getTime() + 2 * DAY), acceptedAt: new Date(c.getTime() + 4 * DAY) }),
  CONVERTED: (c) => ({ presentedAt: c, sentAt: new Date(c.getTime() + DAY), viewedAt: new Date(c.getTime() + 2 * DAY), acceptedAt: new Date(c.getTime() + 4 * DAY) }),
  REJECTED: (c) => ({ presentedAt: c, sentAt: new Date(c.getTime() + DAY), rejectedAt: new Date(c.getTime() + 10 * DAY) }),
  EXPIRED: (c) => ({ presentedAt: c, sentAt: new Date(c.getTime() + DAY) }),
};

async function main() {
  console.log("↻ Resetting database…");
  await reset();

  const company = await prisma.company.create({ data: COMPANY });
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const users = await Promise.all(
    USERS.map((user) => prisma.user.create({ data: { ...user, companyId: company.id, passwordHash } })),
  );
  const admin = users[0]!;
  const seller = users[1]!;

  console.log("◆ Catalog, plans and pricing rules…");
  const { products, supportPlans } = await seedCatalog(company.id);
  const plans = await seedPlans(company.id, admin.id, products, supportPlans);

  console.log("◆ Clients…");
  const clients = new Map<string, { id: string; contactName: string }>();
  for (const client of CLIENTS) {
    const { key, contact, ...data } = client;
    const created = await prisma.client.create({
      data: {
        ...data,
        companyId: company.id,
        lastInteractionAt: daysAgo(Math.floor(Math.random() * 20) + 1),
        contacts: { create: { ...contact, isPrimary: true } },
      },
    });
    clients.set(key, { id: created.id, contactName: contact.name });
  }

  console.log("◆ Proposals, contracts and assets…");
  const lookup = await loadDisplayLookup(prisma, company.id);
  const camera = products.get("camera-ptz")!;
  let proposalSeq = 0;
  let contractSeq = 0;
  let assetSeq = 0;

  const sortedProposals = [...PROPOSALS].sort((a, b) => b.createdDaysAgo - a.createdDaysAgo);
  for (const seed of sortedProposals) {
    const planDef = PLANS.find((p) => p.slug === seed.plan)!;
    const plan = plans.get(seed.plan)!;
    const client = clients.get(seed.client)!;
    const planItems = await prisma.planItem.findMany({ where: { planId: plan.id }, orderBy: { sortOrder: "asc" } });
    const supportPlanId = supportPlans.get(seed.support ?? planDef.support) ?? null;
    const config = buildConfig(seed, planItems, planDef, camera, supportPlanId);
    const context = await loadPricingContext(company.id, plan.id);
    const snapshot = buildProposalSnapshot(config, context, lookup);

    const createdAt = daysAgo(seed.createdDaysAgo);
    proposalSeq += 1;
    const proposal = await prisma.proposal.create({
      data: {
        companyId: company.id,
        proposalNumber: `PRP-${createdAt.getFullYear()}-${String(proposalSeq).padStart(4, "0")}`,
        title: "Sistema Broadcast",
        status: seed.status,
        clientId: client.id,
        contactName: client.contactName,
        planId: plan.id,
        supportPlanId,
        contractMonths: config.contractMonths,
        upfrontMode: "PERCENT",
        upfrontValue: config.upfront.value,
        discountMode: "PERCENT",
        discountValue: 0,
        pricesIncludeVat: false,
        vatRate: context.rules.vatRate,
        ...snapshot.totals,
        pricingSnapshot: { ...context.rules },
        publicToken: createPublicToken(),
        validUntil: new Date(createdAt.getTime() + 30 * DAY),
        createdAt,
        updatedAt: new Date(createdAt.getTime() + Math.min(seed.createdDaysAgo, 5) * DAY * 0.6),
        createdById: seed.status === "DRAFT" ? seller.id : admin.id,
        updatedById: admin.id,
        ...(STATUS_TIMELINE[seed.status]?.(createdAt) ?? {}),
        items: { create: snapshot.items },
        signatures:
          seed.status === "CONVERTED" || seed.status === "ACCEPTED"
            ? { create: { signerName: client.contactName, method: "TYPED", acceptedTerms: true, signedAt: new Date(createdAt.getTime() + 4 * DAY) } }
            : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        companyId: company.id,
        userId: admin.id,
        entityType: "Proposal",
        entityId: proposal.id,
        action: "proposal.created",
        summary: `Proposta ${proposal.proposalNumber} criada a partir de ${planDef.name}`,
        createdAt,
        updatedAt: createdAt,
      },
    });

    if (!seed.contract) continue;

    contractSeq += 1;
    const start = seed.contract.startMonthsAgo > 0 ? startOfMonthsAgo(seed.contract.startMonthsAgo) : null;
    const status: ContractStatus = seed.contract.status;
    const contract = await prisma.contract.create({
      data: {
        companyId: company.id,
        contractNumber: `CTR-${createdAt.getFullYear()}-${String(contractSeq).padStart(4, "0")}`,
        clientId: client.id,
        proposalId: proposal.id,
        supportPlanId,
        status,
        startDate: start,
        endDate: start ? addMonths(start, config.contractMonths) : null,
        contractMonths: config.contractMonths,
        initialPayment: snapshot.totals.initialPayment,
        monthlyPayment: snapshot.totals.monthlyPayment,
        vatRate: context.rules.vatRate,
        internalCost: snapshot.totals.internalCost,
        grossMargin: snapshot.totals.grossMargin,
        signedAt: new Date(createdAt.getTime() + 4 * DAY),
        createdAt: new Date(createdAt.getTime() + 4 * DAY),
        items: {
          create: snapshot.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            displayName: item.displayName,
            internalUnitCost: item.internalUnitCost,
          })),
        },
      },
    });

    const assetStatus = status === "ACTIVE" || status === "SUSPENDED" ? "INSTALLED" : status === "ENDED" ? "STOCK" : "RESERVED";
    for (const item of snapshot.items.filter((i) => i.productType === "HARDWARE")) {
      const product = [...products.values()].find((p) => p.id === item.productId)!;
      for (let unit = 0; unit < item.quantity; unit += 1) {
        assetSeq += 1;
        const purchaseDate = new Date((start ?? createdAt).getTime() - 7 * DAY);
        await prisma.asset.create({
          data: {
            companyId: company.id,
            productId: item.productId,
            variantId: item.variantId,
            supplierId: product.supplierId,
            clientId: assetStatus === "STOCK" ? null : client.id,
            contractId: assetStatus === "STOCK" ? null : contract.id,
            assetTag: `CT-${String(assetSeq).padStart(5, "0")}`,
            serialNumber: `${product.sku}-${(10_000 + assetSeq * 37).toString(36).toUpperCase()}`,
            status: assetStatus,
            purchaseDate,
            purchaseCost: item.internalUnitCost,
            warrantyUntil: product.warrantyMonths ? addMonths(purchaseDate, product.warrantyMonths) : null,
            location: assetStatus === "INSTALLED" ? "Auditório principal" : "Armazém Lisboa",
          },
        });
      }
    }
  }

  console.log("◆ Stock and maintenance assets…");
  const stock = [
    { slug: "camera-ptz", variant: "PTZ-STD", count: 3, status: "STOCK" as const },
    { slug: "camera-ptz", variant: "PTZ-NDI", count: 2, status: "STOCK" as const },
    { slug: "computador-broadcast", variant: "PC-BC-BASIC", count: 1, status: "STOCK" as const },
    { slug: "controladora-ptz", count: 1, status: "MAINTENANCE" as const },
    { slug: "monitor", count: 1, status: "DAMAGED" as const },
  ];
  for (const entry of stock) {
    const product = products.get(entry.slug)!;
    const variant = entry.variant ? product.variants.find((v) => v.sku === entry.variant) : undefined;
    for (let i = 0; i < entry.count; i += 1) {
      assetSeq += 1;
      const purchaseDate = daysAgo(40 + i * 5);
      await prisma.asset.create({
        data: {
          companyId: company.id,
          productId: product.id,
          variantId: variant?.id,
          supplierId: product.supplierId,
          assetTag: `CT-${String(assetSeq).padStart(5, "0")}`,
          serialNumber: `${variant?.sku ?? product.sku}-${(10_000 + assetSeq * 37).toString(36).toUpperCase()}`,
          status: entry.status,
          purchaseDate,
          purchaseCost: variant?.internalCost ?? product.internalCost,
          warrantyUntil: product.warrantyMonths ? addMonths(purchaseDate, product.warrantyMonths) : null,
          location: entry.status === "MAINTENANCE" ? "Oficina técnica" : "Armazém Lisboa",
        },
      });
    }
  }

  console.log(`✔ Seed complete — login with any demo user and password "${DEMO_PASSWORD}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
