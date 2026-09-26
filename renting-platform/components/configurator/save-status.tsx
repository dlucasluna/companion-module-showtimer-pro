"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CloudOff, TriangleAlert } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useConfigurator } from "./configurator-context";

export function SaveStatus({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const status = useConfigurator((s) => s.saveStatus);

  const content = {
    idle: { icon: <CheckCircle2 className="size-3.5 text-fg-3" />, text: "Guardado", tone: "text-fg-3" },
    saved: { icon: <CheckCircle2 className="size-3.5 text-success" />, text: "Guardado", tone: "text-fg-2" },
    dirty: { icon: <span className="size-1.5 rounded-full bg-warning" />, text: "Alterações por guardar", tone: "text-fg-2" },
    saving: { icon: <Spinner className="size-3.5 text-fg-2" />, text: "Guardando…", tone: "text-fg-2" },
    offline: { icon: <CloudOff className="size-3.5 text-warning" />, text: "Offline · guardado neste dispositivo", tone: "text-warning" },
    error: { icon: <TriangleAlert className="size-3.5 text-danger" />, text: "Erro ao guardar", tone: "text-danger" },
  }[status];

  return (
    <div className={cn("flex items-center gap-2 text-small", className)} role="status" aria-live="polite" data-testid="save-status" data-status={status}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.15 }}
          className={cn("flex items-center gap-1.5 whitespace-nowrap", content.tone)}
        >
          {content.icon}
          {content.text}
        </motion.span>
      </AnimatePresence>
      {(status === "error" || status === "offline") && (
        <button type="button" onClick={onRetry} className="text-small font-medium text-accent-2 hover:underline">
          Tentar de novo
        </button>
      )}
    </div>
  );
}
