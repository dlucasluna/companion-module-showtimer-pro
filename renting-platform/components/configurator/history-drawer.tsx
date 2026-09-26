"use client";

import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getProposalHistoryAction, type HistoryEntry } from "@/lib/actions/history";
import { formatDateTime, formatRelative } from "@/lib/formatters";

export function HistoryDrawer({ proposalId, open, onOpenChange }: { proposalId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getProposalHistoryAction(proposalId).then((result) => {
      if (!cancelled) setEntries(result);
    });
    return () => {
      cancelled = true;
    };
  }, [open, proposalId]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Histórico" description="Alterações importantes nesta proposta.">
      {entries === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon={History} title="Sem alterações registadas" compact />
      ) : (
        <ol className="relative space-y-5 border-l border-white/[0.08] pl-5">
          {entries.map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-accent-2 ring-4 ring-bg" aria-hidden="true" />
              <p className="text-[0.875rem] text-fg">{entry.summary}</p>
              <p className="mt-0.5 text-small text-fg-3" title={formatDateTime(entry.createdAt)}>
                {formatRelative(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}
