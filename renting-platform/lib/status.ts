import type { AssetStatus, ClientStatus, ContractStatus, ProposalStatus } from "@prisma/client";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "muted";

interface StatusMeta {
  label: string;
  tone: BadgeTone;
}

export const PROPOSAL_STATUS: Record<ProposalStatus, StatusMeta> = {
  DRAFT: { label: "Rascunho", tone: "muted" },
  PRESENTED: { label: "Apresentada", tone: "accent" },
  SENT: { label: "Enviada", tone: "accent" },
  VIEWED: { label: "Visualizada", tone: "warning" },
  ACCEPTED: { label: "Aceite", tone: "success" },
  REJECTED: { label: "Recusada", tone: "danger" },
  EXPIRED: { label: "Expirada", tone: "muted" },
  CONVERTED: { label: "Convertida", tone: "success" },
};

export const CONTRACT_STATUS: Record<ContractStatus, StatusMeta> = {
  ACTIVE: { label: "Ativo", tone: "success" },
  AWAITING_SIGNATURE: { label: "Aguardando assinatura", tone: "warning" },
  AWAITING_INSTALLATION: { label: "Aguardando instalação", tone: "accent" },
  SUSPENDED: { label: "Suspenso", tone: "danger" },
  ENDED: { label: "Encerrado", tone: "muted" },
};

export const ASSET_STATUS: Record<AssetStatus, StatusMeta> = {
  STOCK: { label: "Stock", tone: "neutral" },
  INSTALLED: { label: "Instalado", tone: "success" },
  MAINTENANCE: { label: "Manutenção", tone: "warning" },
  RESERVED: { label: "Reserva", tone: "accent" },
  DAMAGED: { label: "Danificado", tone: "danger" },
  RETIRED: { label: "Desativado", tone: "muted" },
};

export const CLIENT_STATUS: Record<ClientStatus, StatusMeta> = {
  LEAD: { label: "Lead", tone: "muted" },
  PROSPECT: { label: "Em negociação", tone: "accent" },
  ACTIVE: { label: "Cliente ativo", tone: "success" },
  INACTIVE: { label: "Inativo", tone: "muted" },
};

export const OPEN_PROPOSAL_STATUSES: ProposalStatus[] = ["DRAFT", "PRESENTED", "SENT", "VIEWED"];
