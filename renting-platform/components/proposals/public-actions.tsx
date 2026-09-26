"use client";

import { CheckCircle2, Clock, Download, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { signPublicProposalAction } from "@/lib/actions/public";
import { SignatureModal } from "./signature-modal";

interface Props {
  token: string;
  companyName: string;
  signable: boolean;
  signed: boolean;
  expired: boolean;
  defaultName: string;
}

export function PublicProposalActions({ token, companyName, signable, signed, expired, defaultName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="print-hidden glass edge sticky top-3 z-30 mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div className="flex items-center gap-3">
        <BrandMark />
        <span className="text-[0.9375rem] font-semibold tracking-tight">{companyName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {signed && (
          <span className="inline-flex items-center gap-1.5 text-small font-medium text-success">
            <CheckCircle2 className="size-4" /> Proposta aceite
          </span>
        )}
        {expired && !signed && (
          <span className="inline-flex items-center gap-1.5 text-small text-warning">
            <Clock className="size-4" /> Validade expirada
          </span>
        )}
        <Button variant="secondary" onClick={() => window.print()} leftIcon={<Download className="size-4" />}>
          Baixar PDF
        </Button>
        {signable && (
          <Button variant="primary" onClick={() => setOpen(true)} leftIcon={<PenLine className="size-4" />}>
            Aceitar e assinar
          </Button>
        )}
      </div>
      <SignatureModal
        open={open}
        onOpenChange={setOpen}
        defaultName={defaultName}
        sign={(input) => signPublicProposalAction(token, input)}
        onSigned={() => router.refresh()}
      />
    </div>
  );
}
