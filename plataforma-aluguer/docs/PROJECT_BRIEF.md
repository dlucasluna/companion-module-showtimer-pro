# Project Brief — Plataforma de Aluguer Audiovisual

> Resumo operacional da `BIBLIA_PROJETO.pdf` (v1.0, 12/10/2026). Em caso de dúvida, a Bíblia prevalece. As contradições estão em `OPEN_QUESTIONS.md`.

## Missão
Tornar a contratação de equipamento audiovisual em Portugal tão simples como encomendar comida, sem perder o controlo técnico, comercial e logístico de uma empresa com 17 anos de mercado. A mesma plataforma tem de servir uma caixa de oito PAR LED e uma produção de €50.000.

## O que é / o que não é
- **É** o canal digital de **uma única empresa**: catálogo público, orçamento imediato, pedido/reserva, backoffice comercial e operacional.
- **Não é** um marketplace. Não há outros fornecedores.
- O **Rentman** é a fonte operacional pretendida (catálogo, stock, projetos, movimentos), **sujeita a prova de conceito**. O sistema próprio trata da experiência comercial, identidade, preços/regras, aprovações, logística, marketing e observabilidade.

## Públicos e perfis
Visitante · Cliente final (B2C) · Agência (B2B) · Locadora/empresa audiovisual (B2B) · Comercial · Armazém · Técnico/operações · Motorista · Admin.
O segmento B2B **nunca é autodeclarado**: a tabela comercial só se aplica depois de aprovação administrativa auditada.

## Dois fluxos comerciais
1. **Aluguer simples:** equipamento sem serviços. Pode ser confirmado rapidamente **apenas** se o stock e a capacidade operacional forem verificados e a integração permitir reservar com segurança.
2. **Produção/serviços:** montagem, técnicos, projetos complexos. Recebe uma estimativa e exige **sempre** validação comercial/técnica humana.

## Semáforo (capacidade de atendimento, não apenas stock)
| Cor | Quando | O que o cliente vê |
|---|---|---|
| Verde | Sem serviços; stock e capacidade verificados; dentro da janela operacional; critérios de auto-confirmação satisfeitos | Estimativa firme; confirmação imediata só se a reserva segura estiver disponível (ADR-0002) |
| Amarelo | Serviços, montagem, itens de revisão, exceções de stock, condições especiais | Estimativa; revisão humana obrigatória antes de fechar |
| Vermelho | Fora do horário, armazém indisponível, capacidade suspensa | Pedido recebido, com prazo de resposta configurado; sem compromisso automático |

Horários, feriados, SLA por equipa, limites por pedido e overrides manuais são configuráveis e auditados.

## Estados independentes (nunca se implicam uns aos outros)
- **Orçamento:** rascunho → estimado → em revisão → aprovado → enviado → aceite | expirado | rejeitado
- **Reserva:** não solicitada → pendente → bloqueio provisório → confirmada → concluída | cancelada
- **Operação:** a preparar → pronto → expedido → entregue → em utilização → recolha → devolvido → conferido
- **Pagamento:** não registado → pendente → parcial → pago | reembolsado | em disputa

Um orçamento aprovado não é uma reserva confirmada. Um pagamento registado não é disponibilidade de stock.

## Âmbito do MVP
Catálogo público indexável com preço de referência · SEO/GEO técnico · portfólio com consentimentos · registo e aprovação B2B · tabelas de preço por perfil · regras de kits · carrinho com datas, local e entrega/recolha · orçamento discriminado com snapshot · semáforo · aprovações · reserva segura (automática ou manual, conforme a PoC) · painel de armazém (preparação, checklist, expedição, retorno) · atribuição manual de veículo e motorista · comprovativo de entrega · pagamento registado manualmente · notificações por email · auditoria · dashboards básicos.

**Fora do MVP (sem obrigar a reescrever o domínio depois):** pagamentos online, sinais/cauções/reembolsos automáticos, integração fiscal, GPS ao vivo, roteirização multi-paragem, app de motorista, outros canais de notificação.

## Critérios mínimos de lançamento (Bíblia §12)
- Zero reservas duplas confirmadas em cenários concorrentes; uma falha de integração nunca gera uma falsa confirmação.
- Preços corretos por perfil, período e imposto; regras de kits reproduzíveis e auditáveis.
- Pedidos amarelos nunca dispensam aprovação humana; o vermelho informa um prazo realista.
- A equipa consegue operar manualmente quando a integração está em baixo.
- Experiência mobile funcional, catálogo indexável, PII protegida e métricas instrumentadas.

## Métricas de sucesso
Visitas orgânicas relevantes · catálogo→orçamento · orçamento→contratação · tempo médio de resposta · margem por pedido · conflitos de stock · pontualidade de entrega · receita por segmento.

## Riscos principais
API Rentman insuficiente · overbooking · erro de preço/kit · exposição de dados B2B · lançamento sem procura · dependência excessiva de agentes de IA. As mitigações estão em `ARCHITECTURE.md` e nas ADRs.

## Onde ler mais
`ARCHITECTURE.md` · `DOMAIN_GLOSSARY.md` · `INTEGRATIONS/RENTMAN.md` · `DECISIONS/` · `WORKFLOWS/` · `ACCEPTANCE/` · `OPEN_QUESTIONS.md` · `PROGRESS.md` · `../tasks/BACKLOG.md`
