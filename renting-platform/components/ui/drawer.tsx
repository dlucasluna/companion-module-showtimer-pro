"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left" | "bottom";
  width?: string;
  className?: string;
  /** No visible header/padding — content takes the whole sheet (title stays for screen readers). */
  bare?: boolean;
}

/** Side (or bottom) sheet sliding in with a soft spring. */
export function Drawer({ open, onOpenChange, title, description, children, footer, side = "right", width = "sm:max-w-[440px]", className, bare = false }: DrawerProps) {
  const initial = side === "right" ? { x: "100%" } : side === "left" ? { x: "-100%" } : { y: "100%" };
  const animate = side === "bottom" ? { y: 0 } : { x: 0 };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  "glass-strong fixed z-50 flex flex-col focus:outline-none",
                  side === "right" && `inset-y-0 right-0 w-full ${width} rounded-l-panel border-r-0`,
                  side === "left" && `inset-y-0 left-0 w-full ${width} rounded-r-panel border-l-0`,
                  side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-panel border-b-0",
                  className,
                )}
                initial={initial}
                animate={animate}
                exit={initial}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
              >
                {side === "bottom" && <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />}
                {bare ? (
                  <>
                    <Dialog.Title className="sr-only">{title}</Dialog.Title>
                    <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description>
                    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
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
                    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">{children}</div>
                  </>
                )}
                {footer && <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] px-6 py-4">{footer}</div>}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
