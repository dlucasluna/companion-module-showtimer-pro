"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[70dvh] place-items-center px-4">
      <EmptyState
        icon={TriangleAlert}
        title="Algo correu mal"
        description="Não foi possível carregar esta página. As suas propostas continuam guardadas."
        action={
          <Button variant="primary" onClick={reset}>
            Tentar de novo
          </Button>
        }
      />
    </div>
  );
}
