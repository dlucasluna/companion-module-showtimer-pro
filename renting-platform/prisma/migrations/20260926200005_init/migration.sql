-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PT',
    "locale" TEXT NOT NULL DEFAULT 'pt-PT',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "logoUrl" TEXT,
    "tagline" TEXT,
    "proposalPrefix" TEXT NOT NULL DEFAULT 'PRP',
    "contractPrefix" TEXT NOT NULL DEFAULT 'CTR',
    "proposalValidityDays" INTEGER NOT NULL DEFAULT 30,
    "proposalTerms" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SALES',
    "title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "User_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'PT',
    "status" TEXT NOT NULL DEFAULT 'LEAD',
    "notes" TEXT,
    "lastInteractionAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductCategory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "supplierId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HARDWARE',
    "brand" TEXT,
    "model" TEXT,
    "description" TEXT,
    "salesDescription" TEXT,
    "benefit" TEXT,
    "internalCost" INTEGER NOT NULL,
    "referencePrice" INTEGER,
    "defaultResidualPercent" REAL,
    "warrantyMonths" INTEGER,
    "expectedLifeMonths" INTEGER,
    "imageUrl" TEXT,
    "notes" TEXT,
    "defaultQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER,
    "unitLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "benefit" TEXT,
    "internalCost" INTEGER NOT NULL,
    "referencePrice" INTEGER,
    "residualPercent" REAL,
    "expectedLifeMonths" INTEGER,
    "attributes" JSONB,
    "imageUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "deliveryMode" TEXT NOT NULL DEFAULT 'ONSITE',
    "durationHours" REAL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Service_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstallationService" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "estimatedHours" REAL NOT NULL,
    "technicians" INTEGER NOT NULL DEFAULT 1,
    "requiresSiteVisit" BOOLEAN NOT NULL DEFAULT true,
    "travelIncluded" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "InstallationService_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SupportPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "features" JSONB,
    "monthlyCost" INTEGER NOT NULL,
    "monthlyPrice" INTEGER NOT NULL,
    "responseTimeHours" INTEGER,
    "onSite" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupportPlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "planId" TEXT,
    "targetMultiplier" REAL,
    "defaultUpfrontPercent" REAL,
    "defaultContractMonths" INTEGER,
    "riskReservePercent" REAL,
    "maintenanceReservePercent" REAL,
    "defaultResidualPercent" REAL,
    "residualCreditPercent" REAL,
    "vatRate" REAL,
    "minMarginPercent" REAL,
    "pricesIncludeVat" BOOLEAN,
    "roundMonthlyTo" INTEGER,
    "roundUpfrontTo" INTEGER,
    "allowedContractMonths" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PricingRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PricingRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentCondition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "contractMonths" INTEGER NOT NULL,
    "upfrontPercent" REAL NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentCondition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PRESET',
    "tagline" TEXT,
    "description" TEXT,
    "highlight" TEXT,
    "supportPlanId" TEXT,
    "contractMonths" INTEGER,
    "upfrontPercent" REAL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Plan_supportPlanId_fkey" FOREIGN KEY ("supportPlanId") REFERENCES "SupportPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Plan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "proposalNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Sistema Broadcast',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "kind" TEXT NOT NULL DEFAULT 'NEW',
    "clientId" TEXT NOT NULL,
    "contactName" TEXT,
    "planId" TEXT,
    "supportPlanId" TEXT,
    "contractId" TEXT,
    "contractMonths" INTEGER NOT NULL,
    "upfrontMode" TEXT NOT NULL DEFAULT 'PERCENT',
    "upfrontValue" REAL NOT NULL,
    "discountMode" TEXT NOT NULL DEFAULT 'PERCENT',
    "discountValue" REAL NOT NULL DEFAULT 0,
    "monthlyOverride" INTEGER,
    "targetMargin" REAL,
    "pricesIncludeVat" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" REAL NOT NULL,
    "initialPayment" INTEGER NOT NULL DEFAULT 0,
    "monthlyPayment" INTEGER NOT NULL DEFAULT 0,
    "internalCost" INTEGER NOT NULL DEFAULT 0,
    "targetRevenue" INTEGER NOT NULL DEFAULT 0,
    "contractRevenue" INTEGER NOT NULL DEFAULT 0,
    "grossProfit" INTEGER NOT NULL DEFAULT 0,
    "grossMargin" REAL NOT NULL DEFAULT 0,
    "markup" REAL NOT NULL DEFAULT 0,
    "breakEvenMonth" INTEGER,
    "residualValue" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "pricingSnapshot" JSONB,
    "notes" TEXT,
    "internalNotes" TEXT,
    "publicToken" TEXT NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "presentedAt" DATETIME,
    "sentAt" DATETIME,
    "viewedAt" DATETIME,
    "acceptedAt" DATETIME,
    "rejectedAt" DATETIME,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Proposal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Proposal_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Proposal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Proposal_supportPlanId_fkey" FOREIGN KEY ("supportPlanId") REFERENCES "SupportPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Proposal_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Proposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Proposal_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "internalUnitCost" INTEGER NOT NULL,
    "internalTotal" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "categoryName" TEXT,
    "productType" TEXT NOT NULL,
    "commercialMonthlyImpact" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProposalItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProposalItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProposalSignature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proposalId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT,
    "signerRole" TEXT,
    "method" TEXT NOT NULL DEFAULT 'DRAWN',
    "imageData" TEXT,
    "acceptedTerms" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "provider" TEXT,
    "externalId" TEXT,
    CONSTRAINT "ProposalSignature_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "proposalId" TEXT,
    "supportPlanId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_SIGNATURE',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "contractMonths" INTEGER NOT NULL,
    "initialPayment" INTEGER NOT NULL,
    "monthlyPayment" INTEGER NOT NULL,
    "vatRate" REAL NOT NULL,
    "internalCost" INTEGER NOT NULL DEFAULT 0,
    "grossMargin" REAL NOT NULL DEFAULT 0,
    "parentContractId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "signedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contract_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contract_supportPlanId_fkey" FOREIGN KEY ("supportPlanId") REFERENCES "SupportPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Contract_parentContractId_fkey" FOREIGN KEY ("parentContractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContractItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "internalUnitCost" INTEGER NOT NULL,
    "addedInVersion" INTEGER NOT NULL DEFAULT 1,
    "removedInVersion" INTEGER,
    CONSTRAINT "ContractItem_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContractItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContractItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "supplierId" TEXT,
    "clientId" TEXT,
    "contractId" TEXT,
    "assetTag" TEXT NOT NULL,
    "serialNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'STOCK',
    "purchaseDate" DATETIME,
    "purchaseCost" INTEGER NOT NULL,
    "warrantyUntil" DATETIME,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "Client_companyId_status_idx" ON "Client"("companyId", "status");

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_companyId_slug_key" ON "ProductCategory"("companyId", "slug");

-- CreateIndex
CREATE INDEX "Product_companyId_categoryId_active_idx" ON "Product"("companyId", "categoryId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_sku_key" ON "Product"("companyId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_slug_key" ON "Product"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_sku_key" ON "ProductVariant"("productId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Service_productId_key" ON "Service"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallationService_productId_key" ON "InstallationService"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportPlan_companyId_slug_key" ON "SupportPlan"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_planId_key" ON "PricingRule"("planId");

-- CreateIndex
CREATE INDEX "PricingRule_companyId_scope_idx" ON "PricingRule"("companyId", "scope");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_companyId_slug_key" ON "Plan"("companyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_publicToken_key" ON "Proposal"("publicToken");

-- CreateIndex
CREATE INDEX "Proposal_companyId_status_idx" ON "Proposal"("companyId", "status");

-- CreateIndex
CREATE INDEX "Proposal_clientId_idx" ON "Proposal"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_companyId_proposalNumber_key" ON "Proposal"("companyId", "proposalNumber");

-- CreateIndex
CREATE INDEX "ProposalItem_proposalId_idx" ON "ProposalItem"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_proposalId_key" ON "Contract"("proposalId");

-- CreateIndex
CREATE INDEX "Contract_companyId_status_idx" ON "Contract"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_companyId_contractNumber_key" ON "Contract"("companyId", "contractNumber");

-- CreateIndex
CREATE INDEX "Asset_companyId_status_idx" ON "Asset"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_companyId_assetTag_key" ON "Asset"("companyId", "assetTag");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_entityType_entityId_idx" ON "AuditLog"("companyId", "entityType", "entityId");
