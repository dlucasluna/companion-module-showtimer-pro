import type {
  AdjustmentMode,
  AssetStatus,
  ClientStatus,
  ContractStatus,
  PlanKind,
  ProductType,
  ProposalKind,
  ProposalStatus,
  Role,
  SignatureMethod,
} from "@prisma/client";

/**
 * Browser-side records for the published artifact. They mirror the Prisma
 * models (same field names) with ISO strings instead of Date objects so they
 * can be stored as JSON documents.
 */

export type ISO = string;

export interface CompanyRec {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  locale: string;
  currency: string;
  logoUrl: string | null;
  tagline: string | null;
  proposalPrefix: string;
  contractPrefix: string;
  proposalValidityDays: number;
  proposalTerms: string | null;
  createdAt: ISO;
  updatedAt: ISO;
}

export interface UserRec {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
  active: boolean;
  lastLoginAt: ISO | null;
}

export interface ContactRec {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export interface ClientRec {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  status: ClientStatus;
  notes: string | null;
  lastInteractionAt: ISO | null;
  createdAt: ISO;
  updatedAt: ISO;
  contacts: ContactRec[];
}

export interface SupplierRec {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface CategoryRec {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
}

export interface VariantRec {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  benefit: string | null;
  internalCost: number;
  referencePrice: number | null;
  residualPercent: number | null;
  expectedLifeMonths: number | null;
  attributes: Record<string, string> | null;
  isDefault: boolean;
  active: boolean;
  sortOrder: number;
}

export interface ProductRec {
  id: string;
  categoryId: string;
  supplierId: string | null;
  name: string;
  slug: string;
  sku: string;
  type: ProductType;
  brand: string | null;
  model: string | null;
  description: string | null;
  salesDescription: string | null;
  benefit: string | null;
  internalCost: number;
  referencePrice: number | null;
  defaultResidualPercent: number | null;
  warrantyMonths: number | null;
  expectedLifeMonths: number | null;
  imageUrl: string | null;
  notes: string | null;
  defaultQuantity: number;
  maxQuantity: number | null;
  unitLabel: string | null;
  active: boolean;
  sortOrder: number;
  variants: VariantRec[];
}

export interface SupportPlanRec {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  features: string[];
  monthlyCost: number;
  monthlyPrice: number;
  responseTimeHours: number | null;
  onSite: boolean;
  isDefault: boolean;
  active: boolean;
  sortOrder: number;
}

export interface PricingRuleRec {
  id: string;
  scope: "GLOBAL" | "PLAN";
  planId: string | null;
  targetMultiplier: number | null;
  defaultUpfrontPercent: number | null;
  defaultContractMonths: number | null;
  riskReservePercent: number | null;
  maintenanceReservePercent: number | null;
  defaultResidualPercent: number | null;
  residualCreditPercent: number | null;
  vatRate: number | null;
  minMarginPercent: number | null;
  pricesIncludeVat: boolean | null;
  roundMonthlyTo: number | null;
  roundUpfrontTo: number | null;
  allowedContractMonths: string | null;
}

export interface PaymentConditionRec {
  id: string;
  name: string;
  description: string | null;
  contractMonths: number;
  upfrontPercent: number;
  discountPercent: number;
  active: boolean;
  sortOrder: number;
}

export interface PlanItemRec {
  productId: string;
  variantId: string | null;
  quantity: number;
}

export interface PlanRec {
  id: string;
  name: string;
  slug: string;
  kind: PlanKind;
  tagline: string | null;
  description: string | null;
  highlight: string | null;
  supportPlanId: string | null;
  contractMonths: number | null;
  upfrontPercent: number | null;
  active: boolean;
  sortOrder: number;
  createdById: string | null;
  createdAt: ISO;
  items: PlanItemRec[];
}

export interface ProposalItemRec {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  internalUnitCost: number;
  internalTotal: number;
  displayName: string;
  description: string | null;
  categoryName: string | null;
  productType: ProductType;
  commercialMonthlyImpact: number;
  sortOrder: number;
}

export interface SignatureRec {
  id: string;
  signerName: string;
  signerEmail: string | null;
  signerRole: string | null;
  method: SignatureMethod;
  imageData: string | null;
  acceptedTerms: boolean;
  signedAt: ISO;
}

export interface HistoryRec {
  id: string;
  userId: string | null;
  action: string;
  summary: string;
  changes?: unknown;
  createdAt: ISO;
  updatedAt: ISO;
}

export interface ProposalRec {
  id: string;
  proposalNumber: string;
  title: string;
  status: ProposalStatus;
  kind: ProposalKind;
  clientId: string;
  contactName: string | null;
  planId: string | null;
  supportPlanId: string | null;
  contractId: string | null;
  contractMonths: number;
  upfrontMode: AdjustmentMode;
  upfrontValue: number;
  discountMode: AdjustmentMode;
  discountValue: number;
  monthlyOverride: number | null;
  targetMargin: number | null;
  pricesIncludeVat: boolean;
  vatRate: number;
  initialPayment: number;
  monthlyPayment: number;
  internalCost: number;
  targetRevenue: number;
  contractRevenue: number;
  grossProfit: number;
  grossMargin: number;
  markup: number;
  breakEvenMonth: number | null;
  residualValue: number;
  discountAmount: number;
  notes: string | null;
  publicToken: string;
  validUntil: ISO;
  presentedAt: ISO | null;
  sentAt: ISO | null;
  viewedAt: ISO | null;
  acceptedAt: ISO | null;
  rejectedAt: ISO | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: ISO;
  updatedAt: ISO;
  items: ProposalItemRec[];
  signatures: SignatureRec[];
  history: HistoryRec[];
}

export interface ContractItemRec {
  productId: string;
  variantId: string | null;
  quantity: number;
  displayName: string;
  internalUnitCost: number;
}

export interface ContractRec {
  id: string;
  contractNumber: string;
  clientId: string;
  proposalId: string | null;
  supportPlanId: string | null;
  status: ContractStatus;
  startDate: ISO | null;
  endDate: ISO | null;
  contractMonths: number;
  initialPayment: number;
  monthlyPayment: number;
  vatRate: number;
  internalCost: number;
  grossMargin: number;
  version: number;
  signedAt: ISO | null;
  createdAt: ISO;
  items: ContractItemRec[];
}

export interface AssetRec {
  id: string;
  productId: string;
  variantId: string | null;
  supplierId: string | null;
  clientId: string | null;
  contractId: string | null;
  assetTag: string;
  serialNumber: string | null;
  status: AssetStatus;
  purchaseDate: ISO | null;
  purchaseCost: number;
  warrantyUntil: ISO | null;
  location: string | null;
}

export interface ActivityRec {
  id: string;
  summary: string;
  createdAt: ISO;
}

/** Everything the artifact keeps, keyed by id. */
export interface DemoState {
  company: CompanyRec;
  users: Record<string, UserRec>;
  clients: Record<string, ClientRec>;
  suppliers: Record<string, SupplierRec>;
  categories: Record<string, CategoryRec>;
  products: Record<string, ProductRec>;
  supportPlans: Record<string, SupportPlanRec>;
  pricingRules: Record<string, PricingRuleRec>;
  paymentConditions: Record<string, PaymentConditionRec>;
  plans: Record<string, PlanRec>;
  proposals: Record<string, ProposalRec>;
  contracts: Record<string, ContractRec>;
  assets: Record<string, AssetRec>;
  activity: ActivityRec[];
}

export type CollectionName = Exclude<keyof DemoState, "company" | "activity">;

export const COLLECTIONS: CollectionName[] = [
  "users",
  "clients",
  "suppliers",
  "categories",
  "products",
  "supportPlans",
  "pricingRules",
  "paymentConditions",
  "plans",
  "proposals",
  "contracts",
  "assets",
];
