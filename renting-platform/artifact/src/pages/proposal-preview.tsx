import type { ProposalStatus } from "@prisma/client";
import { ArrowLeft, Copy, Download, FileSignature, MessageCircle, MoreHorizontal, PenLine, Presentation, Send, X } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { InternalOnly } from "@/components/layout/internal-only";
import { usePresentation } from "@/components/layout/presentation-context";
import { useCan } from "@/components/layout/session-context";
import { ProposalDocument } from "@/components/proposals/proposal-document";
import { SignatureModal } from "@/components/proposals/signature-modal";
import { Button, ButtonLink, buttonStyles } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Menu } from "@/components/ui/menu";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/formatters";
import { convertToContractAction, duplicateProposalAction, markProposalStatusAction, signProposalAction } from "../actions/proposals";
import { useDemoState } from "../data/store";
import { commercialProposal } from "../data/views";
import { exportProposalPdf } from "../pdf";
import { useRouterStore } from "../router";
import { NotFoundPage } from "./shared";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function PreviewPage({ id }: { id: string }) {
  const state = useDemoState();
  const proposal = state.proposals[id];
  const document = useMemo(() => (proposal ? commercialProposal(state, proposal) : null), [state, proposal]);
  if (!proposal || !document) return <NotFoundPage what="Proposta" />;

  const client = state.clients[proposal.clientId];
  const contact = client ? [...client.contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))[0] : undefined;
  const contract = Object.values(state.contracts).find((c) => c.proposalId === proposal.id);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-4 sm:px-6 lg:py-6">
      <PreviewToolbar
        proposalId={proposal.id}
        number={proposal.proposalNumber}
        status={proposal.status}
        clientName={client?.name ?? "—"}
        contactName={proposal.contactName}
        clientPhone={contact?.phone ?? client?.phone ?? null}
        monthlyLabel={`${formatMoney(document.commercial.monthlyPayment)}/mês`}
        signed={document.signature !== null}
        contractId={contract?.id ?? null}
        documentRoot={() => window.document.querySelector<HTMLElement>("[data-testid='proposal-document']")}
      />
      <ProposalDocument proposal={document} />
    </div>
  );
}

interface ToolbarProps {
  proposalId: string;
  number: string;
  status: ProposalStatus;
  clientName: string;
  contactName: string | null;
  clientPhone: string | null;
  monthlyLabel: string;
  signed: boolean;
  contractId: string | null;
  documentRoot: () => HTMLElement | null;
}

/**
 * Artifact version of the preview toolbar: PDF is generated in the page and
 * offered as a download; the message is sent with the PDF attached (the
 * public link needs the hosted version).
 */
function PreviewToolbar(props: ToolbarProps) {
  const router = useRouterStore();
  const presenting = usePresentation((s) => s.active);
  const exitPresentation = usePresentation((s) => s.exit);
  const canManage = useCan("proposals.manage");
  const [signing, setSigning] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pending, startTransition] = useTransition();
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const message = `Olá${props.contactName ? ` ${props.contactName}` : ""}! Segue em anexo a proposta ${props.number} do sistema audiovisual para a ${props.clientName} (${props.monthlyLabel}). Fico à disposição para qualquer dúvida.`;
  const phone = (props.clientPhone ?? "").replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const statusIs = (...values: string[]) => values.includes(props.status);

  const markSent = () => {
    if (canManage && statusIs("DRAFT", "PRESENTED")) void markProposalStatusAction(props.proposalId, "SENT");
  };

  const downloadPdf = async () => {
    const root = props.documentRoot();
    if (!root) return;
    setExporting(true);
    const result = await exportProposalPdf(root, `Proposta ${props.number}.pdf`);
    setExporting(false);
    if (result === "saved") toast.success("PDF pronto", "Guardado na pasta de transferências.");
    else if (result === "unavailable") toast.info("Download indisponível nesta vista", "Abra o link do artifact no claude.ai para guardar o PDF.");
    else if (result === "failed") toast.error("Não foi possível gerar o PDF", "Tente novamente.");
  };

  const copyMessage = async () => {
    if (await copyText(message)) {
      toast.success("Mensagem copiada", "Cole no email e anexe o PDF.");
      markSent();
    } else {
      messageRef.current?.select();
      toast.info("Selecione e copie o texto", "O navegador bloqueou a cópia automática.");
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

  const canSign = !props.signed && !statusIs("REJECTED", "CONVERTED");

  return (
    <div className="sticky top-0 z-30 -mx-4 mb-8 bg-bg/75 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:top-3 lg:mx-0 lg:rounded-2xl lg:border lg:border-white/[0.07] lg:px-4">
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
            <Button variant="ghost" size="md" onClick={() => setSharing(true)} leftIcon={<Send className="size-4" />} className="hidden md:inline-flex">
              Enviar
            </Button>
          )}
          <Button variant="secondary" size="md" onClick={() => void downloadPdf()} loading={exporting} leftIcon={<Download className="size-4" />}>
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
                  { label: "Enviar (WhatsApp / email)", icon: Send, onSelect: () => setSharing(true) },
                  { label: "Duplicar proposta", icon: Copy, onSelect: duplicate },
                  ...(props.status !== "CONVERTED"
                    ? [{ label: "Abrir no configurador", icon: Presentation, onSelect: () => router.push(`/proposals/${props.proposalId}`) }]
                    : []),
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

      <Modal
        open={sharing}
        onOpenChange={setSharing}
        title="Enviar proposta"
        description="Baixe o PDF e envie-o com esta mensagem."
        footer={
          <>
            <Button variant="ghost" onClick={() => void copyMessage()} leftIcon={<Copy className="size-4" />}>
              Copiar mensagem
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={markSent}
              className={buttonStyles("primary", "md")}
            >
              <MessageCircle className="size-4" /> Abrir WhatsApp
            </a>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="share-message">Mensagem</Label>
            <Textarea id="share-message" ref={messageRef} readOnly rows={4} value={message} />
          </div>
          <Button variant="secondary" size="md" className="w-full" onClick={() => void downloadPdf()} loading={exporting} leftIcon={<Download className="size-4" />}>
            Baixar PDF da proposta
          </Button>
          {!phone && <p className="text-small text-fg-3">O cliente não tem telefone registado: o WhatsApp abre sem destinatário.</p>}
        </div>
      </Modal>

      <SignatureModal
        open={signing}
        onOpenChange={setSigning}
        defaultName={props.contactName ?? ""}
        sign={(input) => signProposalAction(props.proposalId, input)}
        onSigned={() => undefined}
      />
    </div>
  );
}
