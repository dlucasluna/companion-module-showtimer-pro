"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createPresentationStore, type PresentationState, type PresentationStore } from "@/store/presentation-store";

const PresentationContext = createContext<PresentationStore | null>(null);

export function PresentationProvider({ initial, children }: { initial: boolean; children: ReactNode }) {
  const [store] = useState(() => createPresentationStore(initial));
  return <PresentationContext.Provider value={store}>{children}</PresentationContext.Provider>;
}

export function usePresentation<T>(selector: (state: PresentationState) => T): T {
  const store = useContext(PresentationContext);
  if (!store) throw new Error("usePresentation must be used inside PresentationProvider");
  return useStore(store, selector);
}
