"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "@/components/ui/toast";
import { saveProposalAction } from "@/lib/actions/proposals";
import type { ProposalConfig } from "@/lib/pricing";
import { isDirty, snapshotForSave } from "@/store/configurator-store";
import { useConfiguratorStore } from "./configurator-context";

const DEBOUNCE_MS = 900;

interface LocalBackup {
  config: ProposalConfig;
  planId: string | null;
  title: string;
  /** Server version the snapshot corresponds to (or was edited on top of). */
  baseUpdatedAt: string;
  /** True when the snapshot has edits not yet confirmed by the server. */
  dirty: boolean;
  savedAt: number;
}

const backupKey = (id: string) => `ctr:proposal:${id}`;

function readBackup(id: string): LocalBackup | null {
  try {
    const raw = localStorage.getItem(backupKey(id));
    return raw ? (JSON.parse(raw) as LocalBackup) : null;
  } catch {
    return null;
  }
}

function writeBackup(id: string, backup: LocalBackup | null) {
  try {
    if (backup) localStorage.setItem(backupKey(id), JSON.stringify(backup));
    else localStorage.removeItem(backupKey(id));
  } catch {
    // Storage can be unavailable (private mode) — the server save still runs.
  }
}

/**
 * Autosave: every change is written to localStorage immediately and saved to
 * the server after a short pause. Unsaved local edits survive a refresh and
 * are restored on the next load.
 */
export function useAutosave(serverUpdatedAt: string) {
  const store = useConfiguratorStore();
  const proposalId = store.getState().meta.proposalId;
  const inFlight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseUpdatedAt = useRef(serverUpdatedAt);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    const state = store.getState();
    if (!isDirty(state)) return true;

    const snapshot = snapshotForSave(state);
    state.markSaving();
    const run = (async () => {
      try {
        const result = await saveProposalAction({ id: proposalId, planId: snapshot.planId, title: snapshot.title, config: snapshot.config });
        if (result.ok) {
          baseUpdatedAt.current = result.data.savedAt;
          store.getState().markSaved(snapshot.revision);
          const current = store.getState();
          // Keep the last saved snapshot: protects against stale cached pages (browser Back).
          writeBackup(proposalId, {
            config: current.config,
            planId: current.planId,
            title: current.meta.title,
            baseUpdatedAt: result.data.savedAt,
            dirty: isDirty(current),
            savedAt: Date.now(),
          });
          return true;
        }
        const wasError = store.getState().saveStatus === "error";
        store.getState().markFailed(false);
        if (!wasError) toast.error("Não foi possível guardar", result.error);
        return false;
      } catch {
        store.getState().markFailed(true);
        return false;
      }
    })();
    inFlight.current = run;
    const ok = await run;
    inFlight.current = null;
    return ok;
  }, [proposalId, store]);

  // On mount: recover unsaved edits, or a newer saved snapshot than the (possibly cached) page props.
  useEffect(() => {
    const backup = readBackup(proposalId);
    if (!backup) return;
    const newer = backup.baseUpdatedAt > serverUpdatedAt;
    const same = backup.baseUpdatedAt === serverUpdatedAt;
    if (backup.dirty && (same || newer)) {
      baseUpdatedAt.current = backup.baseUpdatedAt;
      store.getState().restore(backup);
      toast.info("Alterações recuperadas", "Recuperámos alterações que ainda não tinham sido guardadas.");
      setTimeout(() => void flush(), 0);
    } else if (!backup.dirty && newer) {
      baseUpdatedAt.current = backup.baseUpdatedAt;
      store.getState().hydrate(backup);
    } else if (!same) {
      writeBackup(proposalId, null);
    }
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = store.subscribe((state, previous) => {
      if (state.revision === previous.revision) return;
      writeBackup(proposalId, {
        config: state.config,
        planId: state.planId,
        title: state.meta.title,
        baseUpdatedAt: baseUpdatedAt.current,
        dirty: true,
        savedAt: Date.now(),
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush, proposalId, store]);

  useEffect(() => {
    const onOnline = () => void flush();
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty(store.getState())) {
        void flush();
        event.preventDefault();
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flush, store]);

  return { flush };
}
