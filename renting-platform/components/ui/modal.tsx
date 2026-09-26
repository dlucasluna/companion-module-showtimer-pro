"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

/** Centered dialog with a spring entrance. Focus trap, Esc and ARIA come from Radix. */
export function Modal({ open, onOpenChange, title, description, children, footer, size = "md", className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[6px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  "glass-strong edge fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col rounded-panel focus:outline-none",
                  widths[size],
                  className,
                )}
                initial={{ opacity: 0, scale: 0.96, x: "-50%", y: "-46%" }}
                animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
                exit={{ opacity: 0, scale: 0.97, x: "-50%", y: "-48%" }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              >
                <div className="flex items-start justify-between gap-4 px-6 pt-6">
                  <div>
                    <Dialog.Title className="text-h3 text-fg">{title}</Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-small text-fg-2">{description}</Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-fg-2 transition hover:bg-white/10 hover:text-fg"
                    aria-label="Fechar"
                  >
                    <X className="size-4" />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">{children}</div>
                {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/[0.08] px-6 py-4">{footer}</div>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
