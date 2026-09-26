"use client";

import {
  ArrowLeft,
  Copy,
  Download,
  FileSignature,
  Link2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Presentation,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { InternalOnly } from "@/components/layout/internal-only";
import { usePresentation } from "@/components/layout/presentation-context";
import { useCan } from "@/components/layout/session-context";
import { Button, ButtonLink } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { convertToContractAction, duplicateProposalAction, markProposalStatusAction, signProposalAction } from "@/lib/actions/proposals";
import type { ProposalStatus } from "@prisma/client";
import { SignatureModal } from "./signature-modal";

interface PreviewToolbarProps {
  proposalId: string;
  number: string;
  status: ProposalStatus;
  clientName: string;
  contactName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  publicPath: string;
  monthlyLabel: string;
  signed: boolean;
  contractId: string | null;
}

function shareText(props: PreviewToolbarProps, url: string) {
  return `Olá${props.contactName ? ` ${props.contactName}` : ""}! Segue a proposta ${props.number} do sistema audiovisual para a ${props.clientName} (${props.monthlyLabel}). Pode consultar e assinar aqui: ${url}`;
}

export function PreviewToolbar(props: PreviewToolbarProps) {
  const router = useRouter();
  const presenting = usePresentation((s) => s.active);
  const exitPresentation = usePresentation((s) => s.exit);
  const canManage = useCan("proposals.manage");
  const [signing, setSigning] = useState(false);
  const [pending, startTransition] = useTransition();

  const publicUrl = () => `${window.location.origin}${props.publicPath}`;
  const markSent = () => canManage && void markProposalStatusAction(props.proposalId, "SENT").then(() => router.refresh());

  const sendEmail = () => {
    const subject = encodeURIComponent(`Proposta ${props.number} — ${props.clientName}`);
    const body = encodeURIComponent(shareText(props, publicUrl()));
    window.location.href = `mailto:${props.clientEmail ?? ""}?subject=${subject}&body=${body}`;
    markSent();
  };

  const sendWhatsApp = () => {
    const phone = (props.clientPhone ?? "").replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(shareText(props, publicUrl()))}`, "_blank", "noopener");
    markSent();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl());
      toast.success("Link copiado", "Pode colar no email ou mensagem.");
    } catch {
      toast.error("Não foi possível copiar", publicUrl());
    }
  };

  const convert = () =>
    startTransition(async () => {
      const result = await convertToContractAction(props.proposalId);
      if (result.ok) {
        toast.success("Contrato criado", "A aguardar instalação.");
        router.push("/contracts");
      } else toast.error("Não foi possível converter", result.error);
    });

  const duplicate = () =>
    startTransition(async () => {
      const result = await duplicateProposalAction(props.proposalId);
      if (result.ok) router.push(`/proposals/${result.data.id}`);
      else toast.error("Não foi possível duplicar", result.error);
    });

  const canSign = !props.signed && !["REJECTED", "CONVERTED"].includes(props.status);

  return (
    <div className="print-hidden sticky top-0 z-30 -mx-4 mb-8 bg-bg/75 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-3 lg:mx-0 lg:rounded-2xl lg:border lg:border-white/[0.07] lg:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ButtonLink href={canManage && props.status !== "CONVERTED" ? `/proposals/${props.proposalId}` : "/proposals"} variant="ghost" size="icon" aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </ButtonLink>
          <div className="min-w-0">
            <p className="truncate text-[0.9375rem] font-semibold text-fg">{props.clientName}</p>
            <div className="flex items-center gap-2">
              <span className="num text-small text-fg-3">{props.number}</span>
              {!presenting && <StatusBadge kind="proposal" status={props.status} />}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!presenting && canManage && (
            <>
              <Button variant="ghost" size="md" onClick={sendEmail} leftIcon={<Mail className="size-4" />} className="hidden md:inline-flex">
                Email
              </Button>
              <Button variant="ghost" size="md" onClick={sendWhatsApp} leftIcon={<MessageCircle className="size-4" />} className="hidden md:inline-flex">
                WhatsApp
              </Button>
              <Button variant="ghost" size="md" onClick={copyLink} leftIcon={<Link2 className="size-4" />} className="hidden md:inline-flex">
                Copiar link
              </Button>
            </>
          )}
          <Button variant="secondary" size="md" onClick={() => window.print()} leftIcon={<Download className="size-4" />}>
            Baixar PDF
          </Button>
          {canSign && canManage && (
            <Button variant="primary" size="md" onClick={() => setSigning(true)} leftIcon={<PenLine className="size-4" />} data-testid="sign-now">
              Assinar agora
            </Button>
          )}
          {!presenting && canManage && props.status === "ACCEPTED" && !props.contractId && (
            <InternalOnly>
              <Button variant="primary" size="md" onClick={convert} loading={pending} leftIcon={<FileSignature className="size-4" />}>
                Converter em contrato
              </Button>
            </InternalOnly>
          )}
          {presenting ? (
            <Button variant="ghost" size="icon" onClick={exitPresentation} aria-label="Sair do modo cliente">
              <X className="size-4" />
            </Button>
          ) : (
            canManage && (
              <Menu
                label="Mais ações"
                items={[
                  { label: "Enviar por Email", icon: Send, onSelect: sendEmail },
                  { label: "Enviar por WhatsApp", icon: MessageCircle, onSelect: sendWhatsApp },
                  { label: "Copiar link", icon: Copy, onSelect: () => void copyLink() },
                  { label: "Duplicar proposta", icon: Copy, onSelect: duplicate },
                  { label: "Abrir em modo cliente", icon: Presentation, onSelect: () => router.push(`/proposals/${props.proposalId}`) },
                ]}
                trigger={({ open, toggle }) => (
                  <Button variant="ghost" size="icon" onClick={toggle} aria-expanded={open} aria-haspopup="menu" aria-label="Mais ações">
                    <MoreHorizontal className="size-5" />
                  </Button>
                )}
              />
            )
          )}
        </div>
      </div>

      <SignatureModal
        open={signing}
        onOpenChange={setSigning}
        defaultName={props.contactName ?? ""}
        sign={(input) => signProposalAction(props.proposalId, input)}
        onSigned={() => router.refresh()}
      />
    </div>
  );
}
