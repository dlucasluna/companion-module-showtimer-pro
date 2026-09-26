import { createStore } from "zustand/vanilla";
import type { Adjustment, ConfigLine, ProposalConfig } from "@/lib/pricing";
import type { PlanDTO } from "@/types/catalog";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "offline" | "error";

export interface ConfiguratorMeta {
  proposalId: string;
  proposalNumber: string;
  title: string;
  clientId: string;
  clientName: string;
  contactName: string | null;
  status: string;
}

export interface ConfiguratorState {
  meta: ConfiguratorMeta;
  config: ProposalConfig;
  planId: string | null;
  /** Increments on every change; autosave compares it with savedRevision. */
  revision: number;
  savedRevision: number;
  saveStatus: SaveStatus;
  lastSavedAt: number | null;
  /** Product last touched — used for a short highlight animation. */
  lastChanged: string | null;

  setQuantity: (productId: string, quantity: number, fallbackVariantId: string | null) => void;
  setVariant: (productId: string, variantId: string, fallbackQuantity?: number) => void;
  removeProduct: (productId: string) => void;
  applyPlan: (plan: PlanDTO | null, defaults: { contractMonths: number; upfrontPercent: number; supportPlanId: string | null }) => void;
  setContractMonths: (months: number) => void;
  setUpfront: (upfront: Adjustment) => void;
  setDiscount: (discount: Adjustment) => void;
  setSupportPlan: (supportPlanId: string | null) => void;
  setMonthlyOverride: (cents: number | null) => void;
  setTargetMargin: (margin: number | null) => void;
  setPricesIncludeVat: (value: boolean) => void;
  setTitle: (title: string) => void;
  setStatus: (status: string) => void;
  applyConditions: (conditions: { contractMonths: number; upfront: Adjustment }) => void;
  restore: (snapshot: { config: ProposalConfig; planId: string | null; title?: string }) => void;
  /** Replaces the state with an already-saved snapshot (no autosave). */
  hydrate: (snapshot: { config: ProposalConfig; planId: string | null; title?: string }) => void;
  markSaving: () => void;
  markSaved: (revision: number) => void;
  markFailed: (offline: boolean) => void;
}

export interface ConfiguratorInit {
  meta: ConfiguratorMeta;
  config: ProposalConfig;
  planId: string | null;
}

function upsertLine(lines: ConfigLine[], productId: string, patch: Partial<ConfigLine>, base: ConfigLine): ConfigLine[] {
  const exists = lines.some((l) => l.productId === productId);
  if (!exists) return [...lines, { ...base, ...patch }];
  return lines.map((l) => (l.productId === productId ? { ...l, ...patch } : l));
}

export function createConfiguratorStore(init: ConfiguratorInit) {
  return createStore<ConfiguratorState>()((set) => {
    /** Applies a config change and bumps the revision (triggers autosave). */
    const change = (updater: (config: ProposalConfig) => ProposalConfig, extra: Partial<ConfiguratorState> = {}) =>
      set((state) => ({
        config: updater(state.config),
        revision: state.revision + 1,
        saveStatus: state.saveStatus === "saving" ? "saving" : "dirty",
        ...extra,
      }));

    return {
      meta: init.meta,
      config: init.config,
      planId: init.planId,
      revision: 0,
      savedRevision: 0,
      saveStatus: "idle",
      lastSavedAt: null,
      lastChanged: null,

      setQuantity: (productId, quantity, fallbackVariantId) =>
        change(
          (config) => ({
            ...config,
            lines:
              quantity <= 0
                ? config.lines.filter((l) => l.productId !== productId)
                : upsertLine(config.lines, productId, { quantity: Math.max(0, Math.round(quantity)) }, { productId, variantId: fallbackVariantId, quantity: 1 }),
          }),
          { lastChanged: productId },
        ),

      setVariant: (productId, variantId, fallbackQuantity = 1) =>
        change(
          (config) => ({
            ...config,
            lines: upsertLine(config.lines, productId, { variantId }, { productId, variantId, quantity: fallbackQuantity }),
          }),
          { lastChanged: productId },
        ),

      removeProduct: (productId) =>
        change((config) => ({ ...config, lines: config.lines.filter((l) => l.productId !== productId) }), { lastChanged: productId }),

      applyPlan: (plan, defaults) =>
        change(
          (config) => ({
            ...config,
            lines: plan ? plan.items.map((item) => ({ ...item })) : [],
            contractMonths: plan?.contractMonths ?? defaults.contractMonths,
            upfront: { mode: "percent", value: plan?.upfrontPercent ?? defaults.upfrontPercent },
            supportPlanId: plan?.supportPlanId ?? defaults.supportPlanId,
            monthlyOverride: null,
            targetMargin: null,
          }),
          { planId: plan?.id ?? null, lastChanged: null },
        ),

      setContractMonths: (contractMonths) => change((config) => ({ ...config, contractMonths, monthlyOverride: null })),
      setUpfront: (upfront) => change((config) => ({ ...config, upfront, monthlyOverride: null })),
      setDiscount: (discount) => change((config) => ({ ...config, discount })),
      setSupportPlan: (supportPlanId) => change((config) => ({ ...config, supportPlanId })),
      setMonthlyOverride: (monthlyOverride) => change((config) => ({ ...config, monthlyOverride })),
      setTargetMargin: (targetMargin) => change((config) => ({ ...config, targetMargin })),
      setPricesIncludeVat: (pricesIncludeVat) => change((config) => ({ ...config, pricesIncludeVat })),
      applyConditions: ({ contractMonths, upfront }) => change((config) => ({ ...config, contractMonths, upfront, monthlyOverride: null })),
      setTitle: (title) =>
        set((state) => ({ meta: { ...state.meta, title }, revision: state.revision + 1, saveStatus: "dirty" })),
      hydrate: ({ config, planId, title }) =>
        set((state) => ({ config, planId, meta: title ? { ...state.meta, title } : state.meta })),
      setStatus: (status) => set((state) => ({ meta: { ...state.meta, status } })),
      restore: ({ config, planId, title }) =>
        set((state) => ({
          config,
          planId,
          meta: title ? { ...state.meta, title } : state.meta,
          revision: state.revision + 1,
          saveStatus: "dirty",
        })),

      markSaving: () => set({ saveStatus: "saving" }),
      markSaved: (revision) =>
        set((state) => ({
          savedRevision: Math.max(state.savedRevision, revision),
          saveStatus: state.revision > revision ? "dirty" : "saved",
          lastSavedAt: Date.now(),
        })),
      markFailed: (offline) => set({ saveStatus: offline ? "offline" : "error" }),
    };
  });
}

export type ConfiguratorStore = ReturnType<typeof createConfiguratorStore>;

/** Selector helper: current line for a product. */
export function selectLine(state: ConfiguratorState, productId: string): ConfigLine | undefined {
  return state.config.lines.find((l) => l.productId === productId);
}

export function snapshotForSave(state: ConfiguratorState) {
  return { config: state.config, planId: state.planId, title: state.meta.title, revision: state.revision };
}

export function isDirty(state: Pick<ConfiguratorState, "revision" | "savedRevision">): boolean {
  return state.revision > state.savedRevision;
}
