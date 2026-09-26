"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { useShowInternal } from "@/components/layout/internal-only";
import { usePresentation } from "@/components/layout/presentation-context";
import { toast } from "@/components/ui/toast";
import { useHotkey } from "@/hooks/use-hotkey";
import { duplicateProposalAction, markProposalStatusAction } from "@/lib/actions/proposals";
import { cn } from "@/lib/utils";
import type { ConfiguratorInit } from "@/store/configurator-store";
import { CategoryNav } from "./category-nav";
import { CategorySections } from "./category-sections";
import { ConfiguratorHeader, PresentationBar } from "./configurator-header";
import { ConfiguratorHero } from "./configurator-hero";
import { ConfiguratorProvider, useConfigurator, useConfiguratorStore, type ConfiguratorStatic } from "./configurator-context";
import { HistoryDrawer } from "./history-drawer";
import { MobileSummary } from "./mobile-summary";
import { NegotiationDrawer } from "./negotiation-drawer";
import { PlanPicker } from "./plan-picker";
import { PriceSummary } from "./price-summary";
import { SimulationModal } from "./simulation-modal";
import { TemplateModal } from "./template-modal";
import { useAutosave } from "./use-autosave";

interface ConfiguratorProps extends ConfiguratorStatic {
  init: ConfiguratorInit;
  serverUpdatedAt: string;
}

export function Configurator({ init, serverUpdatedAt, ...data }: ConfiguratorProps) {
  return (
    <ConfiguratorProvider init={init} {...data}>
      <ConfiguratorScreen serverUpdatedAt={serverUpdatedAt} />
    </ConfiguratorProvider>
  );
}

type Panel = "negotiation" | "simulation" | "history" | "template" | null;

function ConfiguratorScreen({ serverUpdatedAt }: { serverUpdatedAt: string }) {
  const router = useRouter();
  const store = useConfiguratorStore();
  const meta = useConfigurator((s) => s.meta);
  const setStatus = useConfigurator((s) => s.setStatus);
  const presenting = usePresentation((s) => s.active);
  const enter = usePresentation((s) => s.enter);
  const exit = usePresentation((s) => s.exit);
  const showInternal = useShowInternal();
  const { flush } = useAutosave(serverUpdatedAt);
  const [panel, setPanel] = useState<Panel>(null);
  const [generating, startGenerating] = useTransition();
  const [saving, startSaving] = useTransition();

  const enterClientMode = useCallback(() => {
    setPanel(null);
    enter();
    document.documentElement.requestFullscreen?.().catch(() => undefined);
    window.scrollTo({ top: 0 });
    if (store.getState().meta.status === "DRAFT") {
      setStatus("PRESENTED");
      void markProposalStatusAction(meta.proposalId, "PRESENTED");
    }
  }, [enter, meta.proposalId, setStatus, store]);

  const exitClientMode = useCallback(() => {
    exit();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
  }, [exit]);

  useHotkey("p", () => (presenting ? exitClientMode() : enterClientMode()), { mod: true, shift: true });

  const generate = () =>
    startGenerating(async () => {
      await flush();
      router.push(`/proposals/${meta.proposalId}/preview`);
    });

  const save = () =>
    startSaving(async () => {
      const ok = await flush();
      if (ok) toast.success("Proposta guardada.");
    });

  const duplicate = async () => {
    await flush();
    const result = await duplicateProposalAction(meta.proposalId);
    if (result.ok) {
      toast.success("Proposta duplicada", "Está agora a editar a cópia.");
      router.push(`/proposals/${result.data.id}`);
    } else toast.error("Não foi possível duplicar", result.error);
  };

  const summaryProps = { onGenerate: generate, onSave: save, generating, saving, presenting };

  return (
    <div className={cn("mx-auto w-full px-4 py-5 sm:px-6", presenting ? "max-w-[1640px] lg:px-12 lg:py-8" : "max-w-[1500px] lg:px-8 lg:py-8")}>
      {presenting ? (
        <PresentationBar onExit={exitClientMode} onSimulate={() => setPanel("simulation")} />
      ) : (
        <ConfiguratorHeader
          onRetrySave={() => void flush()}
          onNegotiate={() => setPanel("negotiation")}
          onSimulate={() => setPanel("simulation")}
          onPresent={enterClientMode}
          onDuplicate={() => void duplicate()}
          onSaveTemplate={() => setPanel("template")}
          onHistory={() => setPanel("history")}
          onPreview={generate}
          canNegotiate={showInternal}
        />
      )}

      <div
        className={cn(
          "mt-8 grid gap-8",
          presenting ? "lg:mt-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-12" : "xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_410px]",
        )}
      >
        <div className={cn("@container min-w-0 pb-36", presenting ? "lg:pb-16" : "xl:pb-16")}>
          <ConfiguratorHero presenting={presenting} editable />
          {!presenting && (
            <div className="mt-6">
              <PlanPicker />
            </div>
          )}
          <div className={cn("mt-6", presenting ? "[&_nav]:top-0" : "[&_nav]:top-14 lg:[&_nav]:top-0")}>
            <CategoryNav />
          </div>
          <div className="mt-6">
            <CategorySections wide={presenting} />
          </div>
        </div>

        <aside className={cn("hidden", presenting ? "lg:block" : "xl:block")} aria-label="Resumo do plano">
          <div className="no-scrollbar sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto pb-2">
            <PriceSummary {...summaryProps} />
          </div>
        </aside>
      </div>

      <MobileSummary className={presenting ? "lg:hidden" : "xl:hidden"} {...summaryProps} />

      {showInternal && <NegotiationDrawer open={panel === "negotiation"} onOpenChange={(open) => setPanel(open ? "negotiation" : null)} />}
      <SimulationModal open={panel === "simulation"} onOpenChange={(open) => setPanel(open ? "simulation" : null)} />
      {!presenting && (
        <>
          <HistoryDrawer proposalId={meta.proposalId} open={panel === "history"} onOpenChange={(open) => setPanel(open ? "history" : null)} />
          <TemplateModal
            proposalId={meta.proposalId}
            open={panel === "template"}
            onOpenChange={(open) => setPanel(open ? "template" : null)}
            beforeSave={flush}
            suggestion={`${meta.title} · ${meta.clientName}`}
          />
        </>
      )}
    </div>
  );
}
