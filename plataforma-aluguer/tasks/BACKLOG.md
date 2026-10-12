# Backlog priorizado

Prioridade: P0 = próximo, P1 = a seguir, P2 = depois. Cada item vira `tasks/TASK-XXX.md` quando entrar em execução.
"Indep." = pode avançar sem credenciais Rentman.

| ID | Etapa | P | Indep. | Tarefa | Aceite |
|---|---|---|---|---|---|
| TASK-001 | 0 | P0 | sim | Proprietário revê e aprova a arquitetura; responde a Q-B1..Q-B3 | Decisões registadas em ADR-0001/0002/0003 |
| TASK-002 | 0 | P0 | sim | Workshop de regras de negócio (Q-I1..Q-I9): preços, IVA, B2B, horários, SLA, logística | Respostas em `docs/BUSINESS_RULES.md` validadas pelo proprietário |
| TASK-003 | 1 | P0 | **não** | PoC Rentman: preencher a matriz RM-01..RM-20 com conta autorizada | Matriz + fixtures + relatório go/no-go |
| TASK-004 | 2 | P1 | sim | Comparar hospedagem na UE (custos oficiais na data, limites, backups, worker) | Proposta com 2–3 opções aprovada (ADR) |
| TASK-005 | 2 | P1 | sim | Criar repo dedicado e esqueleto: Next.js, TS strict, lint de fronteiras, Vitest, Playwright, CI | CI verde com teste de exemplo; README e `.env.example` |
| TASK-006 | 2 | P1 | sim | BD + migrations + `audit_log` + `outbox_event` + pg-boss + worker | Migration up/down testada; teste de outbox transacional |
| TASK-007 | 2 | P1 | sim | Auth (ADR da biblioteca) + RBAC + matriz de permissões testada | Testes papel × ação; sessões revogáveis |
| TASK-008 | 1/2 | P1 | sim | Port `InventoryGateway` + `FakeInventoryGateway` + contratos Zod | Testes do fake, incluindo "criado mas resposta perdida" |
| TASK-009 | 4 | P1 | sim | Motor de preços puro (`pricing/domain`) com casos do proprietário | ≥ 1 teste por regra e casos-fronteira de arredondamento |
| TASK-010 | 4 | P1 | sim | Motor do semáforo puro + calendário/feriados/overrides | Tabela de casos verde/amarelo/vermelho passa |
| TASK-011 | 4 | P1 | sim | Motor de regras de kits (5 tipos de relação, DSL condicional validada) | Testes incluindo o exemplo PAR LED/DMX da Bíblia |
| TASK-012 | 5 | P1 | sim | Ledger de stock + holds com advisory lock + teste de corrida | N concorrentes, no máximo 1 hold para a última unidade |
| TASK-013 | 3 | P1 | sim | Catálogo: modelo, admin mínimo, páginas públicas, slugs estáveis | Páginas indexáveis; teste "sem preço B2B no público" |
| TASK-014 | 3 | P2 | sim | SEO técnico: metadados, canonical, sitemap, robots, structured data | Validação automática em CI |
| TASK-015 | 4 | P2 | sim | Clientes + candidatura B2B + aprovação auditada | E2E de candidatura → aprovação → preço B2B |
| TASK-016 | 4 | P2 | sim | Carrinho → orçamento → snapshot imutável → estados → aprovações | Testes de transição; o snapshot não pode ser alterado (trigger) |
| TASK-017 | 4 | P2 | sim | Notificações por email (port + fake + templates) via outbox | Nenhum email perdido em teste de falha |
| TASK-018 | 5 | P2 | parcial | Adaptador Rentman real (só capacidades VERIFICADAS) + sync + reconciliação | Testes de integração contra fixtures gravadas |
| TASK-019 | 5 | P2 | sim | Painel de armazém + estados operacionais + incidências | E2E de preparação → retorno |
| TASK-020 | 5 | P2 | sim | Logística: veículos, motoristas, entregas, comprovativos | O motorista só vê as suas entregas (teste) |
| TASK-021 | 5 | P2 | sim | Pagamentos manuais + port para prestadores futuros | Registo com comprovativo e auditoria |
| TASK-022 | 3 | P2 | sim | Portfólio + consentimentos + FAQ/landing pages | Nenhuma imagem sem consentimento publicada |
| TASK-023 | 6 | P2 | — | QA completo, segurança, simulações (8 PAR LED; projeto de €50.000) | Gate da Etapa 6 |
