import { createStore } from "zustand/vanilla";

/** Session cookie mirrored by the server layout so a refresh never flashes admin UI. */
export const PRESENTATION_COOKIE = "ctr_presenting";

export interface PresentationState {
  /** Client mode: sidebar, admin UI and every internal figure are unmounted. */
  active: boolean;
  enter: () => void;
  exit: () => void;
  toggle: () => void;
}

function writeCookie(active: boolean) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = active
      ? `${PRESENTATION_COOKIE}=1; path=/; SameSite=Lax`
      : `${PRESENTATION_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
  } catch {
    // Sandboxed frames can refuse cookies; client mode still works for this page load.
  }
}

export function createPresentationStore(initial: boolean) {
  return createStore<PresentationState>()((set, get) => ({
    active: initial,
    enter: () => {
      writeCookie(true);
      set({ active: true });
    },
    exit: () => {
      writeCookie(false);
      set({ active: false });
    },
    toggle: () => (get().active ? get().exit() : get().enter()),
  }));
}

export type PresentationStore = ReturnType<typeof createPresentationStore>;
