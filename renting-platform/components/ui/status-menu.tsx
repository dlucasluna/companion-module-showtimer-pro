"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ActionResult } from "@/lib/utils";
import { Button } from "./button";
import { Menu } from "./menu";
import { toast } from "./toast";

interface StatusMenuProps<T extends string> {
  label: string;
  current: T;
  options: { value: T; label: string }[];
  update: (value: T) => Promise<ActionResult>;
  successMessage: string;
}

/** Row menu that moves an entity to another status via a server action. */
export function StatusMenu<T extends string>({ label, current, options, update, successMessage }: StatusMenuProps<T>) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="relative z-10 flex justify-end">
      <Menu
        label={label}
        items={options
          .filter((o) => o.value !== current)
          .map((o) => ({
            label: o.label,
            onSelect: () =>
              startTransition(async () => {
                const result = await update(o.value);
                if (result.ok) {
                  toast.success(successMessage);
                  router.refresh();
                } else toast.error("Não foi possível atualizar", result.error);
              }),
          }))}
        trigger={({ open, toggle }) => (
          <Button variant="ghost" size="icon-sm" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label={label} loading={pending}>
            {!pending && <MoreHorizontal className="size-4" />}
          </Button>
        )}
      />
    </div>
  );
}
