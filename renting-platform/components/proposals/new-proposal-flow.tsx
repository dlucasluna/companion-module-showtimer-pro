"use client";

import { motion } from "framer-motion";
import { ArrowRight, Building2, Check, LayoutTemplate, Search, Sparkles, Star, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { createProposalAction } from "@/lib/actions/proposals";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ClientOption {
  id: string;
  name: string;
  city: string | null;
  contactName: string | null;
}

export interface PlanTile {
  id: string;
  name: string;
  kind: "PRESET" | "TEMPLATE";
  tagline: string | null;
  description: string | null;
  highlight: string | null;
  itemCount: number;
  monthlyPayment: number;
  initialPayment: number;
  contractMonths: number;
}

interface Props {
  clients: ClientOption[];
  plans: PlanTile[];
  preselectedClientId: string | null;
  canCreateClient: boolean;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function NewProposalFlow({ clients: initialClients, plans, preselectedClientId, canCreateClient }: Props) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [clientId, setClientId] = useState<string | null>(preselectedClientId);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("Sistema Broadcast");
  const [creatingClient, setCreatingClient] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = clients.find((c) => c.id === clientId) ?? null;
  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    const list = term ? clients.filter((c) => normalize(`${c.name} ${c.city ?? ""} ${c.contactName ?? ""}`).includes(term)) : clients;
    return list.slice(0, 6);
  }, [clients, query]);

  function start(planId: string | null) {
    if (!clientId) {
      toast.info("Escolha primeiro a igreja.");
      return;
    }
    setPendingPlan(planId ?? "scratch");
    startTransition(async () => {
      const result = await createProposalAction({ clientId, planId, title: title.trim() || "Sistema Broadcast" });
      if (result.ok) router.push(`/proposals/${result.data.id}`);
      else {
        toast.error("Não foi possível criar a proposta", result.error);
        setPendingPlan(null);
      }
    });
  }

  const presets = plans.filter((p) => p.kind === "PRESET");
  const templates = plans.filter((p) => p.kind === "TEMPLATE");

  return (
    <div className="space-y-10">
      {/* Step 1 — client */}
      <section aria-labelledby="step-client">
        <div className="mb-4 flex items-center gap-3">
          <span className="num grid size-7 place-items-center rounded-full bg-accent text-small font-semibold text-white">1</span>
          <h2 id="step-client" className="text-h3 text-fg">
            Igreja
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="edge surface rounded-panel p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Procurar igreja, cidade ou responsável…"
                className="pl-10"
                aria-label="Procurar cliente"
                data-testid="client-search"
              />
            </div>
            <ul className="mt-3 space-y-1" role="listbox" aria-label="Clientes">
              {filtered.map((client) => {
                const active = client.id === clientId;
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setClientId(client.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                        active ? "border-accent/40 bg-accent/10" : "border-transparent hover:bg-white/[0.04]",
                      )}
                    >
                      <Avatar name={client.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.875rem] font-medium text-fg">{client.name}</span>
                        <span className="block truncate text-small text-fg-3">
                          {[client.contactName, client.city].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {active && <Check className="size-4 text-accent-2" strokeWidth={3} />}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && <li className="px-3 py-6 text-center text-small text-fg-3">Nenhuma igreja encontrada.</li>}
            </ul>
            {canCreateClient && (
              <Button variant="ghost" size="sm" className="mt-2 w-full" leftIcon={<UserPlus className="size-4" />} onClick={() => setCreatingClient(true)} data-testid="new-client">
                Criar cliente
              </Button>
            )}
          </div>

          <div className="edge surface flex flex-col rounded-panel p-6">
            {selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col">
                <p className="eyebrow">Proposta para</p>
                <p className="mt-2 text-h2 text-fg">{selected.name}</p>
                <p className="mt-1 text-fg-2">
                  {selected.contactName ?? "Sem responsável"}
                  {selected.city && <span className="text-fg-3"> · {selected.city}</span>}
                </p>
                <label htmlFor="proposal-title" className="mt-auto block pt-6 text-small font-medium text-fg-2">
                  Título da proposta
                </label>
                <Input id="proposal-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" maxLength={120} />
              </motion.div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <Building2 className="size-8 text-fg-3" strokeWidth={1.5} />
                <p className="mt-3 text-[0.9375rem] text-fg-2">Selecione a igreja ou crie um novo cliente.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Step 2 — starting point */}
      <section aria-labelledby="step-plan" className={cn("transition-opacity", !selected && "pointer-events-none opacity-45")}>
        <div className="mb-4 flex items-center gap-3">
          <span className="num grid size-7 place-items-center rounded-full bg-white/10 text-small font-semibold text-fg">2</span>
          <h2 id="step-plan" className="text-h3 text-fg">
            Escolha uma configuração inicial
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {presets.map((plan, index) => (
            <motion.button
              key={plan.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              onClick={() => start(plan.id)}
              disabled={pending}
              data-testid={`preset-${plan.name.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "edge surface interactive group relative flex flex-col rounded-panel p-6 text-left hover:-translate-y-0.5",
                plan.highlight && "border-accent/30 bg-[linear-gradient(180deg,rgb(10_132_255/0.12),rgb(255_255_255/0.02))]",
              )}
            >
              {plan.highlight && (
                <span className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-micro font-semibold text-accent-2">
                  <Star className="size-3" fill="currentColor" /> {plan.highlight}
                </span>
              )}
              <p className="text-h3 text-fg">{plan.name}</p>
              <p className="mt-1 text-small text-fg-2">{plan.tagline}</p>
              <p className="mt-3 text-small text-fg-3">{plan.description}</p>
              <div className="mt-auto pt-6">
                <p className="text-micro text-fg-3">A partir de</p>
                <p className="num text-[1.75rem] font-semibold tracking-tight text-fg">
                  {formatMoney(plan.monthlyPayment, { decimals: 0 })}
                  <span className="text-[0.875rem] font-normal text-fg-3">/mês</span>
                </p>
                <p className="num text-small text-fg-3">
                  {formatMoney(plan.initialPayment, { decimals: 0 })} entrada · {plan.contractMonths} meses · {plan.itemCount} itens
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 text-small font-medium text-accent-2">
                {pendingPlan === plan.id ? <Spinner className="size-3.5" /> : <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />}
                Começar com {plan.name}
              </span>
            </motion.button>
          ))}
          <button
            type="button"
            onClick={() => start(null)}
            disabled={pending}
            className="group grid min-h-60 place-items-center rounded-panel border border-dashed border-white/12 p-6 text-center transition hover:border-white/25 hover:bg-white/[0.02]"
          >
            <span>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/[0.05]">
                {pendingPlan === "scratch" ? <Spinner /> : <Sparkles className="size-5 text-fg-2" />}
              </span>
              <span className="mt-4 block text-[1rem] font-semibold text-fg">Montar do zero</span>
              <span className="mt-1 block text-small text-fg-3">Comece com o sistema vazio.</span>
            </span>
          </button>
        </div>

        {templates.length > 0 && (
          <div className="mt-8">
            <p className="eyebrow mb-3">Templates guardados</p>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {templates.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => start(plan.id)}
                  disabled={pending}
                  className="edge surface interactive flex items-center gap-3 rounded-2xl p-4 text-left"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.05]">
                    {pendingPlan === plan.id ? <Spinner /> : <LayoutTemplate className="size-4 text-fg-2" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-medium text-fg">{plan.name}</span>
                    <span className="block truncate text-small text-fg-3">{plan.description}</span>
                  </span>
                  <span className="num text-small font-medium text-fg">{formatMoney(plan.monthlyPayment, { decimals: 0 })}/mês</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <ClientFormModal
        open={creatingClient}
        onOpenChange={setCreatingClient}
        onSaved={(client) => {
          setClients((list) => [{ id: client.id, name: client.name, city: null, contactName: client.contactName }, ...list]);
          setClientId(client.id);
          setQuery("");
        }}
      />
    </div>
  );
}
