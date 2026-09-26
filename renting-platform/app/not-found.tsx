import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <EmptyState
        icon={Compass}
        title="Página não encontrada"
        description="O endereço pode estar errado ou o conteúdo já não existe."
        action={
          <ButtonLink href="/dashboard" variant="primary">
            Voltar ao início
          </ButtonLink>
        }
      />
    </main>
  );
}
