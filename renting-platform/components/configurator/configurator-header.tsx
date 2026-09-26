"use client";

import {
  ArrowLeft,
  Calculator,
  Copy,
  Eye,
  History,
  LayoutTemplate,
  MoreHorizontal,
  Presentation,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { Kbd } from "@/components/ui/misc";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ProposalStatus } from "@prisma/client";
import { useConfigurator, useConfiguratorData } from "./configurator-context";
import { SaveStatus } from "./save-status";

interface HeaderActions {
  onRetrySave: () => void;
  onNegotiate: () => void;
  onSimulate: () => void;
  onPresent: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
  onHistory: () => void;
  onPreview: () => void;
  canNegotiate: boolean;
}

/** Seller-mode header: breadcrumb, autosave, negotiation tools, client mode. */
export function ConfiguratorHeader(actions: HeaderActions) {
  const meta = useConfigurator((s) => s.meta);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/proposals"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-white/[0.08] text-fg-2 transition hover:bg-white/[0.06] hover:text-fg"
          aria-label="Voltar às propostas"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="num truncate text-small font-medium text-fg-2">{meta.proposalNumber}</span>
            <StatusBadge kind="proposal" status={meta.status as ProposalStatus} />
          </div>
          <SaveStatus onRetry={actions.onRetrySave} className="mt-0.5" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="md" onClick={actions.onSimulate} leftIcon={<Calculator className="size-4" />}>
          <span className="hidden md:inline">Simular condições</span>
          <span className="md:hidden">Simular</span>
        </Button>
        {actions.canNegotiate && (
          <Button variant="secondary" size="md" onClick={actions.onNegotiate} leftIcon={<SlidersHorizontal className="size-4" />} data-testid="open-negotiation">
            Ajustar proposta
          </Button>
        )}
        <Button variant="primary" size="md" onClick={actions.onPresent} leftIcon={<Presentation className="size-4" />} data-testid="enter-client-mode">
          Apresentar ao cliente
          <Kbd className="ml-1 hidden border-white/25 bg-white/15 text-white/90 lg:inline-flex">⌘⇧P</Kbd>
        </Button>
        <Menu
          label="Mais ações"
          items={[
            { label: "Pré-visualizar proposta", icon: Eye, onSelect: actions.onPreview },
            { label: "Duplicar", icon: Copy, onSelect: actions.onDuplicate },
            { label: "Guardar como template", icon: LayoutTemplate, onSelect: actions.onSaveTemplate },
            { label: "Histórico", icon: History, onSelect: actions.onHistory },
          ]}
          trigger={({ open, toggle }) => (
            <Button variant="ghost" size="icon" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label="Mais ações">
              <MoreHorizontal className="size-5" />
            </Button>
          )}
        />
      </div>
    </div>
  );
}

/** Client-mode bar: brand, church, discreet exit. No internal tools. */
export function PresentationBar({ onExit, onSimulate }: { onExit: () => void; onSimulate: () => void }) {
  const { companyName } = useConfiguratorData();
  const clientName = useConfigurator((s) => s.meta.clientName);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <BrandMark className="size-9" />
        <span className="text-[1rem] font-semibold tracking-tight text-fg">{companyName}</span>
      </div>
      <span className="hidden truncate text-small text-fg-2 md:block">{clientName}</span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onSimulate} leftIcon={<Calculator className="size-4" />}>
          Simular
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onExit} aria-label="Sair do modo cliente (⌘⇧P)" title="Sair do modo cliente (⌘⇧P)" data-testid="exit-client-mode">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
