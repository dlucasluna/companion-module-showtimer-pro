"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "error";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: ToastItem[];
  push: (toast: Omit<ToastItem, "id">) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++counter;
    set({ toasts: [...get().toasts.slice(-3), { ...toast, id }] });
    setTimeout(() => get().dismiss(id), toast.tone === "error" ? 6000 : 3200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Imperative API: toast.success("Proposta guardada.") */
export const toast = {
  success: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: "success" }),
  info: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: "info" }),
  error: (title: string, description?: string) => useToastStore.getState().push({ title, description, tone: "error" }),
};

const icons = { success: CheckCircle2, info: Info, error: TriangleAlert };
const iconTone = { success: "text-success", info: "text-accent-2", error: "text-danger" };

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      role="region"
      aria-label="Notificações"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const Icon = icons[item.tone];
          return (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 480, damping: 36 }}
              role={item.tone === "error" ? "alert" : "status"}
              className="glass-strong edge pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3"
            >
              <Icon className={cn("mt-0.5 size-[18px] shrink-0", iconTone[item.tone])} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.875rem] font-medium text-fg">{item.title}</p>
                {item.description && <p className="mt-0.5 text-small text-fg-2">{item.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="-mr-1 grid size-6 place-items-center rounded-full text-fg-3 hover:bg-white/10 hover:text-fg"
                aria-label="Fechar notificação"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
