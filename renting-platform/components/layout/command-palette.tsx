"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { FilePlus2, FileSignature, FileText, HardDrive, Search, UserPlus, Users, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { searchAction, type SearchHit } from "@/lib/actions/search";
import { useHotkey } from "@/hooks/use-hotkey";
import { useUiStore } from "@/store/ui-store";
import { Kbd } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/spinner";
import { NAV_ITEMS } from "./nav-items";
import { usePresentation } from "./presentation-context";
import { useSession } from "./session-context";

const HIT_ICONS: Record<SearchHit["type"], LucideIcon> = {
  client: Users,
  proposal: FileText,
  contract: FileSignature,
  asset: HardDrive,
};

const HIT_GROUPS: Record<SearchHit["type"], string> = {
  client: "Clientes",
  proposal: "Propostas",
  contract: "Contratos",
  asset: "Equipamentos",
};

const itemClass =
  "flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-[0.875rem] text-fg-2 data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-fg";

export function CommandPalette() {
  const router = useRouter();
  const session = useSession();
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const presenting = usePresentation((s) => s.active);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();

  // Disabled in client mode: the palette can reach internal pages.
  useHotkey("k", () => setOpen(!open), { mod: true, enabled: !presenting });

  useEffect(() => {
    const term = query.trim();
    const timer = setTimeout(() => {
      if (term.length < 2) {
        setHits([]);
        return;
      }
      startTransition(async () => setHits(await searchAction(term)));
    }, 160);
    return () => clearTimeout(timer);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const can = (p: (typeof session.permissions)[number]) => session.permissions.includes(p);
  const actions = [
    can("proposals.manage") && { label: "Nova proposta", icon: FilePlus2, href: "/proposals/new", shortcut: "N" },
    can("clients.manage") && { label: "Novo cliente", icon: UserPlus, href: "/clients?new=1" },
  ].filter(Boolean) as { label: string; icon: LucideIcon; href: string; shortcut?: string }[];
  const navigation = NAV_ITEMS.filter((item) => can(item.permission) && !item.primary);
  const groups = (Object.keys(HIT_GROUPS) as SearchHit["type"][]).filter((type) => hits.some((h) => h.type === type));

  return (
    <Dialog.Root open={open && !presenting} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && !presenting && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[4px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className="glass-strong edge fixed left-1/2 top-[14vh] z-[60] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-panel"
                initial={{ opacity: 0, scale: 0.97, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              >
                <Dialog.Title className="sr-only">Pesquisa e comandos</Dialog.Title>
                <Dialog.Description className="sr-only">Pesquise clientes, propostas, contratos e equipamentos.</Dialog.Description>
                <Command shouldFilter={false} loop label="Pesquisa global">
                  <div className="flex items-center gap-3 border-b border-white/[0.07] px-4">
                    <Search className="size-[18px] text-fg-3" aria-hidden="true" />
                    <Command.Input
                      value={query}
                      onValueChange={setQuery}
                      placeholder="Pesquisar clientes, propostas, contratos, equipamentos…"
                      className="h-14 flex-1 bg-transparent text-[0.9375rem] text-fg placeholder:text-fg-3 focus:outline-none"
                    />
                    {pending ? <Spinner className="text-fg-3" /> : <Kbd>Esc</Kbd>}
                  </div>
                  <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
                    <Command.Empty className="px-3 py-8 text-center text-small text-fg-3">
                      {query.trim().length < 2 ? "Escreva para pesquisar." : "Sem resultados."}
                    </Command.Empty>
                    {groups.map((type) => (
                      <Command.Group key={type} heading={HIT_GROUPS[type]} className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                        {hits
                          .filter((hit) => hit.type === type)
                          .map((hit) => {
                            const Icon = HIT_ICONS[hit.type];
                            return (
                              <Command.Item key={`${hit.type}-${hit.id}`} value={`${hit.type}-${hit.id}`} onSelect={() => go(hit.href)} className={itemClass}>
                                <Icon className="size-4 shrink-0 text-fg-3" />
                                <span className="truncate text-fg">{hit.title}</span>
                                <span className="ml-auto truncate text-small text-fg-3">{hit.subtitle}</span>
                              </Command.Item>
                            );
                          })}
                      </Command.Group>
                    ))}
                    {query.trim().length < 2 && (
                      <>
                        <Command.Group heading="Ações" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                          {actions.map((action) => (
                            <Command.Item key={action.href} value={action.label} onSelect={() => go(action.href)} className={itemClass}>
                              <action.icon className="size-4 text-accent-2" />
                              <span className="text-fg">{action.label}</span>
                            </Command.Item>
                          ))}
                        </Command.Group>
                        <Command.Group heading="Ir para" className="[&_[cmdk-group-heading]]:eyebrow [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2">
                          {navigation.map((item) => (
                            <Command.Item key={item.href} value={`ir ${item.label}`} onSelect={() => go(item.href)} className={itemClass}>
                              <item.icon className="size-4 text-fg-3" />
                              <span>{item.label}</span>
                            </Command.Item>
                          ))}
                        </Command.Group>
                      </>
                    )}
                  </Command.List>
                </Command>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
