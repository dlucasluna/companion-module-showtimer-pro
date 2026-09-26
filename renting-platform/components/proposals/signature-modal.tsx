"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { formatDateLong } from "@/lib/formatters";
import type { ActionResult } from "@/lib/utils";
import type { SignProposalInput } from "@/lib/validation/proposal";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  sign: (input: SignProposalInput) => Promise<ActionResult>;
  onSigned: () => void;
}

/**
 * Simple electronic acceptance: name + drawn signature + terms checkbox + date.
 * The data model (ProposalSignature.provider/externalId) is ready for an
 * external e-signature provider later.
 */
export function SignatureModal({ open, onOpenChange, defaultName, sign, onSigned }: SignatureModalProps) {
  const padRef = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await sign({
        signerName: name,
        signerRole: role,
        signerEmail: email,
        imageData: padRef.current?.toDataURL() ?? null,
        acceptedTerms: accepted as true,
      });
      if (result.ok) {
        toast.success("Proposta assinada", "Obrigado! A proposta foi aceite.");
        onOpenChange(false);
        onSigned();
      } else toast.error("Não foi possível assinar", result.error);
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Assinar proposta"
      description={`Assinatura eletrónica simples · ${formatDateLong(new Date())}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} loading={pending} disabled={!accepted || name.trim().length < 2 || !drawn} data-testid="confirm-signature">
            Assinar e aceitar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="signer-name">Nome completo</Label>
            <Input id="signer-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="signer-role">Função</Label>
            <Input id="signer-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Pastor titular" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="signer-email">Email (para receber a cópia)</Label>
            <Input id="signer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-small font-medium text-fg-2">Assinatura</p>
          <SignaturePad ref={padRef} onChange={(empty) => setDrawn(!empty)} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[#0a84ff]"
            data-testid="accept-terms"
          />
          <span className="text-small text-fg-2">
            Li e aceito a proposta, as condições comerciais e os termos apresentados. Confirmo que tenho poderes para assinar em nome da igreja.
          </span>
        </label>
      </div>
    </Modal>
  );
}
