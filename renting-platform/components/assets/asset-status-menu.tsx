"use client";

import type { AssetStatus } from "@prisma/client";
import { StatusMenu } from "@/components/ui/status-menu";
import { updateAssetStatusAction } from "@/lib/actions/operations";
import { ASSET_STATUS } from "@/lib/status";

export function AssetStatusMenu({ id, tag, status }: { id: string; tag: string; status: AssetStatus }) {
  return (
    <StatusMenu
      label={`Estado do equipamento ${tag}`}
      current={status}
      options={(Object.keys(ASSET_STATUS) as AssetStatus[]).map((value) => ({ value, label: `Marcar como ${ASSET_STATUS[value].label.toLowerCase()}` }))}
      update={(value) => updateAssetStatusAction(id, value)}
      successMessage="Equipamento atualizado."
    />
  );
}
