import type { AssetStatus, ContractStatus } from "@prisma/client";
import type { AssetInput } from "../../../lib/actions/operations";
import { can } from "@/lib/auth/permissions";
import { ASSET_STATUS, CONTRACT_STATUS } from "@/lib/status";
import type { ActionResult } from "@/lib/utils";
import { commit, logActivity } from "../data/store";
import type { AssetRec, DemoState } from "../data/types";
import type { Dirty } from "../data/persistence";
import { newId } from "../ids";
import { authorize, firstName, run } from "./common";

export type { AssetInput };

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

export async function updateContractStatusAction(id: string, status: ContractStatus): Promise<ActionResult> {
  return run(() => {
    const { user, state } = authorize("contracts.manage");
    if (!(status in CONTRACT_STATUS)) return { ok: false, error: "Estado inválido." };
    const contract = state.contracts[id];
    if (!contract) return { ok: false, error: "Contrato não encontrado." };
    const activating = status === "ACTIVE" && !contract.startDate;
    const start = activating ? new Date() : null;
    const updated = {
      ...contract,
      status,
      ...(start ? { startDate: start.toISOString(), endDate: addMonths(start, contract.contractMonths).toISOString() } : {}),
      ...(status === "ENDED" && !contract.endDate ? { endDate: new Date().toISOString() } : {}),
    };
    let next: DemoState = { ...state, contracts: { ...state.contracts, [id]: updated } };
    const dirty: Dirty[] = [{ collection: "contracts", id }];
    if (status === "ACTIVE") {
      const assets = { ...next.assets };
      for (const asset of Object.values(assets)) {
        if (asset.contractId === id && asset.status === "RESERVED") {
          assets[asset.id] = { ...asset, status: "INSTALLED" };
          dirty.push({ collection: "assets", id: asset.id });
        }
      }
      const client = next.clients[contract.clientId];
      next = { ...next, assets, clients: client ? { ...next.clients, [client.id]: { ...client, status: "ACTIVE" } } : next.clients };
      if (client) dirty.push({ collection: "clients", id: client.id });
    }
    const logged = logActivity(next, `${firstName(user)} alterou ${contract.contractNumber} para "${CONTRACT_STATUS[status].label}"`);
    commit(logged.state, [...dirty, logged.dirty]);
    return { ok: true, data: undefined };
  });
}

export async function updateAssetStatusAction(id: string, status: AssetStatus): Promise<ActionResult> {
  return run(() => {
    const { state } = authorize("assets.manage");
    if (!(status in ASSET_STATUS)) return { ok: false, error: "Estado inválido." };
    const asset = state.assets[id];
    if (!asset) return { ok: false, error: "Equipamento não encontrado." };
    const released = status === "STOCK" || status === "RETIRED";
    const updated: AssetRec = {
      ...asset,
      status,
      ...(released ? { clientId: null, contractId: null, location: status === "STOCK" ? "Armazém" : asset.location } : {}),
    };
    commit({ ...state, assets: { ...state.assets, [id]: updated } }, [{ collection: "assets", id }]);
    return { ok: true, data: undefined };
  });
}

export async function createAssetAction(input: AssetInput): Promise<ActionResult<{ id: string }>> {
  return run(() => {
    const { user, state } = authorize("assets.manage");
    const product = state.products[input.productId];
    if (!product) return { ok: false, error: "Produto inválido." };
    const variant = input.variantId ? product.variants.find((v) => v.id === input.variantId) : undefined;
    if (input.variantId && !variant) return { ok: false, error: "Variante inválida." };
    const cost = can(user.role, "internal.view") && input.purchaseCost !== undefined ? input.purchaseCost : (variant?.internalCost ?? product.internalCost);
    const next = Math.max(0, ...Object.values(state.assets).map((a) => Number.parseInt(a.assetTag.replace(/\D/g, ""), 10) || 0)) + 1;
    const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date();
    const warranty = product.warrantyMonths ?? 0;
    const asset: AssetRec = {
      id: newId(),
      productId: product.id,
      variantId: input.variantId,
      supplierId: input.supplierId ?? product.supplierId,
      clientId: input.clientId,
      contractId: null,
      assetTag: `CT-${String(next).padStart(5, "0")}`,
      serialNumber: input.serialNumber || null,
      status: input.status,
      purchaseDate: purchaseDate.toISOString(),
      purchaseCost: cost,
      warrantyUntil: warranty ? addMonths(purchaseDate, warranty).toISOString() : null,
      location: input.location || null,
    };
    const logged = logActivity({ ...state, assets: { ...state.assets, [asset.id]: asset } }, `${firstName(user)} registou ${asset.assetTag} (${product.name})`);
    commit(logged.state, [{ collection: "assets", id: asset.id }, logged.dirty]);
    return { ok: true, data: { id: asset.id } };
  });
}
