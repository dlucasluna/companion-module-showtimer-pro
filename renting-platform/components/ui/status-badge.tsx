import type { AssetStatus, ClientStatus, ContractStatus, ProposalStatus } from "@prisma/client";
import { ASSET_STATUS, CLIENT_STATUS, CONTRACT_STATUS, PROPOSAL_STATUS } from "@/lib/status";
import { Badge } from "./badge";

type StatusBadgeProps =
  | { kind: "proposal"; status: ProposalStatus }
  | { kind: "contract"; status: ContractStatus }
  | { kind: "asset"; status: AssetStatus }
  | { kind: "client"; status: ClientStatus };

export function StatusBadge(props: StatusBadgeProps) {
  const meta =
    props.kind === "proposal"
      ? PROPOSAL_STATUS[props.status]
      : props.kind === "contract"
        ? CONTRACT_STATUS[props.status]
        : props.kind === "asset"
          ? ASSET_STATUS[props.status]
          : CLIENT_STATUS[props.status];
  return (
    <Badge tone={meta.tone} dot>
      {meta.label}
    </Badge>
  );
}
