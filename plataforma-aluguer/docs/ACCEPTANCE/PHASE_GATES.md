# Critérios de aceite por etapa

Numeração do prompt de execução. A coluna "Bíblia" mostra a etapa equivalente (ver C4).

| Etapa | Bíblia | Entregável | Gate de aceite (objetivo, com evidência) |
|---|---|---|---|
| 0 Descoberta | 0 | Brief, arquitetura, glossário, matriz Rentman, backlog, perguntas | Arquitetura aprovada pelo proprietário (Q-B1), local do repositório decidido (Q-B2) e respostas Q-I1..Q-I8 recolhidas ou calendarizadas |
| 1 PoC Rentman | 1 | Cliente de teste isolado, fixtures, matriz preenchida, relatório go/no-go | Cada RM-xx com estado ≠ `NÃO VERIFICADO` ou bloqueio documentado; testes de concorrência e duplicação executados com log; decisão go/no-go assinada |
| 2 Fundação | 2 | Repo, CI, staging, auth, RBAC, BD+migrations, auditoria, outbox/fila, observabilidade, backups | CI verde (lint, typecheck, unit, integração com Postgres real); matriz RBAC testada; migration up/down testada; restauro de backup demonstrado em staging; nenhum segredo no repositório (scan) |
| 3 Catálogo e aquisição | 3 (parte) | Páginas públicas, pesquisa/filtros, produto, portfólio, CMS mínimo, SEO técnico, métricas | Páginas SSR/SSG indexáveis; sitemap/robots/canonical válidos; structured data validado; Lighthouse mobile ≥ 90 em performance/acessibilidade/SEO (meta a confirmar); nenhum preço B2B ou PII em respostas públicas (teste automatizado) |
| 4 Motor comercial | 3 (parte) + 4 (semáforo) | Segmentos, tabelas, kits, carrinho, orçamento, snapshot, estados, semáforo, aprovações, notificações | Testes unitários de preços/IVA/descontos/kits/semáforo/transições com casos fornecidos pelo proprietário; snapshot imutável comprovado; amarelo nunca é auto-aprovado (teste); E2E B2C, agência e locadora |
| 5 Operações | 4 | Integração Rentman (só capacidades verificadas), reserva segura, armazém, entrega/recolha, pagamento manual, reconciliação, painéis | Teste de corrida pela última unidade sem dupla confirmação; falha de API sem confirmação; retry sem duplicação; operação manual completa com o Rentman desligado |
| 6 Qualidade e piloto | 5 | E2E, acessibilidade, desempenho, segurança, simulações (8 PAR LED; projeto de €50.000 com serviços), plano de rollback | Relatório de testes; revisão de segurança independente sem achados críticos abertos; pedidos reais controlados reconciliados |
| 7 Lançamento | 6 (+7 evolução) | Produção, domínio, observabilidade, suporte, SEO, campanhas graduais | Autorização expressa do proprietário; alarmes ativos; runbook de suporte; métricas de conversão e CAC a medir |
