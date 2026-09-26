"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useConfigurator, useConfiguratorData } from "./configurator-context";

/** "Igreja Batista Central / Sistema Broadcast / Configure o sistema ideal…" */
export function ConfiguratorHero({ presenting, editable }: { presenting: boolean; editable: boolean }) {
  const { messages } = useConfiguratorData();
  const meta = useConfigurator((s) => s.meta);
  const setTitle = useConfigurator((s) => s.setTitle);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      <p className={cn("font-medium text-accent-2", presenting ? "text-[1.0625rem]" : "text-[0.9375rem]")}>
        {meta.clientName}
        {meta.contactName && <span className="font-normal text-fg-3"> · {meta.contactName}</span>}
      </p>
      {editable && !presenting ? (
        <input
          value={meta.title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Título da proposta"
          maxLength={120}
          className="-ml-1 mt-1 w-full rounded-lg bg-transparent px-1 font-[family-name:var(--font-display)] text-[1.875rem] font-semibold leading-tight tracking-[-0.03em] text-fg outline-none transition hover:bg-white/[0.03] focus:bg-white/[0.05] sm:text-[3rem]"
        />
      ) : (
        <h1
          className={cn(
            "mt-1 font-[family-name:var(--font-display)] font-semibold leading-[1.04] tracking-[-0.035em] text-fg",
            presenting ? "text-[2.5rem] sm:text-[3.5rem] xl:text-[4rem]" : "text-[1.875rem] sm:text-[3rem]",
          )}
        >
          {meta.title}
        </h1>
      )}
      <p className={cn("mt-2 text-fg-2", presenting ? "text-[1.125rem]" : "text-[1rem]")}>{messages.configurator.tagline}</p>
    </motion.div>
  );
}
