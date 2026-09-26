import type { ReactNode } from "react";
import { formatDateLong, formatMoney, formatPercent } from "@/lib/formatters";
import { toLocale } from "@/lib/i18n/locales";
import { getMessages } from "@/lib/i18n/messages";
import type { CommercialItem, CommercialProposalDTO } from "@/lib/security/projections";

/**
 * Client-facing proposal document (screen + print/PDF). Receives only the
 * commercial projection — it cannot render internal data because it never has it.
 */
export function ProposalDocument({ proposal }: { proposal: CommercialProposalDTO }) {
  const locale = toLocale(proposal.company.locale);
  const m = getMessages(locale).proposal;
  const money = (cents: number) => formatMoney(cents, { locale });
  const c = proposal.commercial;
  const vatNote = m.vatNote(formatPercent(c.vatRate, 0, locale), c.pricesIncludeVat);
  const groups = groupByCategory(proposal.equipment);

  return (
    <div className="print-root flex flex-col items-center gap-8" data-testid="proposal-document">
      {/* ── Sheet 1: cover ─────────────────────────────── */}
      <Sheet>
        <div className="relative overflow-hidden bg-[#0b0b0f] px-[14mm] pb-[16mm] pt-[14mm] text-white">
          <div className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(10,132,255,0.35),transparent)]" />
          <div className="pointer-events-none absolute -bottom-40 left-10 size-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(255,255,255,0.07),transparent)]" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DocMark />
              <span className="text-[15px] font-semibold tracking-tight">{proposal.company.name}</span>
            </div>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">{proposal.number}</span>
          </div>
          <div className="relative mt-[34mm]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5ab0ff]">{m.documentTitle}</p>
            <h1 className="mt-4 text-[52px] font-semibold leading-[1.02] tracking-[-0.035em]">{proposal.title}</h1>
            <p className="mt-4 text-[20px] text-white/75">{proposal.client.name}</p>
          </div>
        </div>

        <div className="doc-page flex flex-1 flex-col px-[14mm] py-[12mm]">
          <dl className="grid grid-cols-4 gap-6 border-b border-[var(--doc-line)] pb-8">
            <Meta label={m.preparedFor} value={proposal.client.name} sub={proposal.contactName ?? undefined} />
            <Meta label={m.date} value={formatDateLong(proposal.createdAt, locale)} />
            <Meta label={m.number} value={proposal.number} />
            <Meta label={m.validUntil} value={formatDateLong(proposal.validUntil, locale)} />
          </dl>

          <div className="mt-10 grid grid-cols-3 gap-4">
            <Figure label={m.implementation} value={money(c.initialPayment)} />
            <Figure label={m.monthly} value={money(c.monthlyPayment)} suffix={m.perMonth} highlight />
            <Figure label={m.duration} value={`${c.contractMonths}`} suffix={` ${m.months}`} />
          </div>
          <p className="mt-3 text-[11px] text-[var(--doc-muted)]">{vatNote}</p>

          <div className="mt-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--doc-muted)]">{m.recommendedSystem}</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2">
              {[...proposal.equipment, ...proposal.services].map((item) => (
                <li key={`${item.name}-${item.quantity}`} className="flex items-baseline gap-2 text-[13px]">
                  <span className="w-7 shrink-0 text-right font-semibold tabular-nums text-[#0a84ff]">{item.quantity}×</span>
                  <span>{item.name}</span>
                </li>
              ))}
              {proposal.support && (
                <li className="flex items-baseline gap-2 text-[13px]">
                  <span className="w-7 shrink-0" />
                  <span>
                    {m.support}: {proposal.support.name}
                  </span>
                </li>
              )}
            </ul>
          </div>

          <CompanyFooter proposal={proposal} />
        </div>
      </Sheet>

      {/* ── Sheet 2: system details ───────────────────── */}
      <Sheet>
        <div className="doc-page flex flex-1 flex-col px-[14mm] py-[14mm]">
          <SheetHeader proposal={proposal} title={m.recommendedSystem} />

          <section className="mt-8">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--doc-muted)]">{m.equipment}</h3>
            <div className="mt-4 space-y-4">
              {groups.map(([category, items]) => (
                <div key={category}>
                  <p className="text-[12px] font-semibold text-[#0a84ff]">{category}</p>
                  <ul className="mt-2 divide-y divide-[var(--doc-line)] border-y border-[var(--doc-line)]">
                    {items.map((item) => (
                      <ItemRow key={item.name} item={item} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {proposal.services.length > 0 && (
            <section className="mt-10">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--doc-muted)]">{m.services}</h3>
              <ul className="mt-3 divide-y divide-[var(--doc-line)] border-y border-[var(--doc-line)]">
                {proposal.services.map((item) => (
                  <ItemRow key={item.name} item={item} />
                ))}
              </ul>
            </section>
          )}

          {proposal.support && (
            <section className="mt-10 rounded-2xl bg-[#f4f6fa] p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[15px] font-semibold">
                  {m.support} {proposal.support.name}
                </h3>
                <span className="text-[13px] tabular-nums text-[var(--doc-muted)]">
                  {proposal.support.monthlyPrice > 0 ? `${money(proposal.support.monthlyPrice)}${m.perMonth}` : getMessages(locale).configurator.included}
                </span>
              </div>
              {proposal.support.description && <p className="mt-1 text-[13px] text-[var(--doc-muted)]">{proposal.support.description}</p>}
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                {proposal.support.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[13px]">
                    <Tick /> {feature}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--doc-muted)]">{m.whyUs}</h3>
            <ul className="mt-3 grid grid-cols-3 gap-4">
              {m.whyUsItems.map((text) => (
                <li key={text} className="rounded-xl border border-[var(--doc-line)] p-4 text-[13px] leading-relaxed">
                  {text}
                </li>
              ))}
            </ul>
          </section>

          <CompanyFooter proposal={proposal} />
        </div>
      </Sheet>

      {/* ── Sheet 3: investment, terms, signature ────── */}
      <Sheet>
        <div className="doc-page flex flex-1 flex-col px-[14mm] py-[14mm]">
          <SheetHeader proposal={proposal} title={m.investment} />

          <div className="mt-8 overflow-hidden rounded-2xl bg-[#0b0b0f] p-8 text-white">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-[12px] text-white/60">{m.implementation}</p>
                <p className="mt-1 text-[30px] font-semibold tabular-nums tracking-tight">{money(c.initialPayment)}</p>
              </div>
              <div>
                <p className="text-[12px] text-white/60">{m.monthly}</p>
                <p className="mt-1 text-[30px] font-semibold tabular-nums tracking-tight">
                  {money(c.monthlyPayment)}
                  <span className="text-[14px] font-normal text-white/60">{m.perMonth}</span>
                </p>
              </div>
              <div>
                <p className="text-[12px] text-white/60">{m.duration}</p>
                <p className="mt-1 text-[30px] font-semibold tabular-nums tracking-tight">
                  {c.contractMonths}
                  <span className="text-[14px] font-normal text-white/60"> {m.months}</span>
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[12px] text-white/60">
              <span>{vatNote}</span>
              <span className="tabular-nums">
                {m.totalContract}: <span className="font-semibold text-white">{money(c.totalContract)}</span>
              </span>
            </div>
            {c.discountAmount > 0 && (
              <p className="mt-2 text-[12px] text-[#5ab0ff]">
                {m.discount}: −{money(c.discountAmount)}
              </p>
            )}
          </div>

          <section className="mt-10">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--doc-muted)]">{m.conditions}</h3>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed">
              {proposal.terms.map((term) => (
                <li key={term} className="flex items-start gap-2">
                  <Tick /> {term}
                </li>
              ))}
            </ul>
          </section>

          {proposal.notes && (
            <section className="mt-8">
              <p className="text-[13px] leading-relaxed text-[var(--doc-muted)]">{proposal.notes}</p>
            </section>
          )}

          <section className="mt-auto pt-12">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--doc-muted)]">{m.signature}</h3>
            <div className="mt-6 grid grid-cols-2 gap-12">
              <SignatureBox
                label={m.signHere}
                name={proposal.signature?.signerName ?? proposal.contactName ?? ""}
                role={proposal.signature?.signerRole ?? proposal.client.name}
                image={proposal.signature?.imageData ?? null}
                date={proposal.signature ? formatDateLong(proposal.signature.signedAt, locale) : null}
                signedLabel={m.signedBy}
              />
              <SignatureBox label={m.companySignature} name={proposal.company.legalName ?? proposal.company.name} role={proposal.company.name} image={null} date={null} signedLabel={m.signedBy} />
            </div>
          </section>
        </div>
      </Sheet>
    </div>
  );
}

function groupByCategory(items: CommercialItem[]): [string, CommercialItem[]][] {
  const map = new Map<string, CommercialItem[]>();
  for (const item of items) {
    const key = item.category ?? "Outros";
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return [...map.entries()];
}

function Sheet({ children }: { children: ReactNode }) {
  return (
    <article className="doc-sheet doc-page flex w-full max-w-[210mm] flex-col overflow-hidden rounded-[6px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] sm:min-h-[297mm]">
      {children}
    </article>
  );
}

function SheetHeader({ proposal, title }: { proposal: CommercialProposalDTO; title: string }) {
  return (
    <header className="flex items-end justify-between border-b border-[var(--doc-line)] pb-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--doc-muted)]">
          {proposal.title} · {proposal.client.name}
        </p>
        <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
      </div>
      <DocMark dark />
    </header>
  );
}

function Meta({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--doc-muted)]">{label}</dt>
      <dd className="mt-1.5 text-[13px] font-medium">{value}</dd>
      {sub && <dd className="text-[12px] text-[var(--doc-muted)]">{sub}</dd>}
    </div>
  );
}

function Figure({ label, value, suffix, highlight }: { label: string; value: string; suffix?: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "rounded-2xl bg-[#0b0b0f] p-5 text-white" : "rounded-2xl bg-[#f4f6fa] p-5"}>
      <p className={highlight ? "text-[12px] text-white/60" : "text-[12px] text-[var(--doc-muted)]"}>{label}</p>
      <p className="mt-1 text-[28px] font-semibold tabular-nums tracking-[-0.02em]">
        {value}
        {suffix && <span className={highlight ? "text-[13px] font-normal text-white/60" : "text-[13px] font-normal text-[var(--doc-muted)]"}>{suffix}</span>}
      </p>
    </div>
  );
}

function ItemRow({ item }: { item: CommercialItem }) {
  return (
    <li className="flex items-baseline gap-4 py-2">
      <span className="w-8 shrink-0 text-right text-[13px] font-semibold tabular-nums">{item.quantity}×</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{item.name}</span>
        {item.description && <span className="block text-[12px] text-[var(--doc-muted)]">{item.description}</span>}
      </span>
    </li>
  );
}

function SignatureBox({ label, name, role, image, date, signedLabel }: { label: string; name: string; role: string; image: string | null; date: string | null; signedLabel: string }) {
  return (
    <div>
      <div className="flex h-24 items-end border-b border-[var(--doc-ink)] pb-2">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={`${signedLabel} ${name}`} className="max-h-20 object-contain" />
        ) : null}
      </div>
      <p className="mt-2 text-[13px] font-medium">{name}</p>
      <p className="text-[12px] text-[var(--doc-muted)]">
        {role}
        {date ? ` · ${date}` : ""}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--doc-muted)]">{label}</p>
    </div>
  );
}

function CompanyFooter({ proposal }: { proposal: CommercialProposalDTO }) {
  const co = proposal.company;
  const parts = [co.legalName ?? co.name, co.taxId, [co.address, co.postalCode, co.city].filter(Boolean).join(", "), co.email, co.phone, co.website].filter(Boolean);
  return <footer className="mt-auto border-t border-[var(--doc-line)] pt-4 text-[10px] leading-relaxed text-[var(--doc-muted)]">{parts.join("  ·  ")}</footer>;
}

function Tick() {
  return (
    <svg viewBox="0 0 16 16" className="mt-[3px] size-3.5 shrink-0" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="8" fill="#0a84ff" fillOpacity="0.12" />
      <path d="m4.8 8.2 2.1 2.1 4.3-4.6" stroke="#0a84ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DocMark({ dark = false }: { dark?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-7" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill={dark ? "#0b0b0f" : "#1c1c22"} />
      <circle cx="12" cy="12" r="6" stroke="#fff" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="2.2" fill="#0A84FF" />
    </svg>
  );
}
