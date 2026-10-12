# ADR-0002: Política de confirmação de reservas e prevenção de overbooking

- **Estado:** Proposta (aguarda aprovação; a parte de auto-confirmação depende do go/no-go da PoC Rentman)
- **Data:** 2026-10-12

## Contexto
A Bíblia proíbe confirmar uma reserva sem confirmação fiável do inventário e exige zero reservas duplas em cenários concorrentes. Ainda não se sabe se a API Rentman permite reservar de forma atómica, nem se é possível deduplicar criações. Os funcionários podem também reservar diretamente no Rentman.

## Decisão
1. **Ledger local** de compromissos (`stock_commitment`) com margens de preparação/transporte.
2. Os holds são criados numa transação com `pg_advisory_xact_lock` por produto (adquiridos por ordem de id). A soma dos compromissos sobrepostos é comparada com a disponibilidade conhecida, e o hold tem `expires_at`.
3. Estados: `pendente → bloqueio_provisorio → confirmada`. A passagem a `confirmada` exige **uma** destas condições:
   - (a) **Auto:** feature flag `AUTO_CONFIRM_ENABLED` ligada (só após GO da PoC), o Rentman aceitou a reserva e uma releitura confirmou o compromisso; ou
   - (b) **Manual:** um utilizador com papel `operations` ou `sales` confirma depois de verificar o inventário (com auditoria).
4. Escritas no Rentman só pela fila, com idempotency key local e uma verificação de existência antes de qualquer retry de criação. Não há retry cego de POST.
5. Falha, timeout ou resposta ambígua → o pedido fica `pendente` e é marcado para revisão. **Nunca** confirma.
6. Reconciliação periódica entre o ledger e o Rentman, com alertas. Não há correção automática de reservas confirmadas.
7. Por defeito (até à PoC), `AUTO_CONFIRM_ENABLED=false` e o verde mostra "estimativa firme, confirmação após verificação".

## Consequências
- (+) É seguro mesmo que a API seja limitada; a equipa pode operar em modo degradado.
- (−) Sem GO na PoC, nenhum pedido é confirmado instantaneamente (ver a contradição C3 em `OPEN_QUESTIONS.md`).
- (−) O lock local não protege contra reservas feitas fora da plataforma. A releitura e a reconciliação mitigam o risco, mas não o eliminam.

## Testes obrigatórios
- Corrida: N clientes concorrentes disputam a última unidade e no máximo um hold é concedido.
- Uma falha da API em qualquer passo não deixa nenhuma reserva `confirmada`.
- Retry após timeout não cria um segundo projeto (com o fake a simular "criado mas resposta perdida").
