# Integração Rentman: matriz de validação

> **Estado atual: NADA VERIFICADO.** Não há credenciais nem conta de teste. Os domínios `rentman.io`, `support.rentman.io` e `api.rentman.net` **não estavam acessíveis** a partir do ambiente de trabalho (erro de DNS no proxy) em 12/10/2026, por isso a documentação oficial ainda não foi lida diretamente.
> Nenhum endpoint, campo ou limite abaixo pode ser usado em código de produção até mudar para `VERIFICADO`.

## Legenda de estado
- `VERIFICADO`: testado contra a conta autorizada, com pedido/resposta guardados em `fixtures/rentman/` (sem dados pessoais).
- `DOCUMENTADO`: lido na documentação oficial, ainda não testado.
- `INDÍCIO`: visto apenas em fonte secundária. Não é fiável.
- `NÃO VERIFICADO`: hipótese a testar.
- `INDISPONÍVEL`: testado e não suportado (registar o fallback).

## Indícios recolhidos (fontes secundárias, por confirmar)
| # | Indício | Fonte | Estado |
|---|---|---|---|
| I1 | O acesso à API usa um **token pessoal** gerado em *Configuration → Account → Integrations*; os tokens novos têm validade de 10 anos | Resumo de pesquisa web sobre o artigo `support.rentman.io/hc/en-us/articles/360013767839` (não aberto diretamente) | INDÍCIO |
| I2 | O artigo de suporte remete para "Rentman API Documentation" sobre autenticação, headers, queries e limitações | Idem | INDÍCIO |
| I3 | Os endpoints de listagem suportam paginação e um parâmetro `where` com expressões RSQL | Wrapper de terceiros (mindcloud.co) | INDÍCIO |
| I4 | Se a API exige plano/módulo pago, quais os limites de pedidos e a existência de webhooks | — | Desconhecido |

## Matriz de capacidades

Para cada linha, preencher: endpoint, método, escopo/permissão, limites, payload (exemplo testado), semântica observada, falhas e fallback.

| ID | Capacidade | Necessária para | Endpoint / método | Escopos | Limites | Exemplo testado | Semântica observada | Falhas | Fallback se indisponível | Estado |
|---|---|---|---|---|---|---|---|---|---|---|
| RM-01 | Autenticação (token, rotação, expiração, revogação) | Tudo | ? | ? | ? | — | — | — | Sem integração; operação manual | NÃO VERIFICADO |
| RM-02 | Plano/termos/limites de uso da API | Tudo | n/a | n/a | ? | — | — | — | — | NÃO VERIFICADO |
| RM-03 | Listar equipamento (paginação, campos, IDs estáveis) | Catálogo | ? | ? | ? | — | — | — | Catálogo gerido localmente | NÃO VERIFICADO |
| RM-04 | Kits / equipamento composto | Kits | ? | ? | ? | — | — | — | Kits definidos localmente | NÃO VERIFICADO |
| RM-05 | Preços do equipamento no Rentman | Pricing (referência) | ? | ? | ? | — | — | — | Preços só locais | NÃO VERIFICADO |
| RM-06 | Alterações incrementais (filtro por data de modificação) | Sync | ? | ? | ? | — | — | — | Sync total periódico | NÃO VERIFICADO |
| RM-07 | Disponibilidade por intervalo (física vs. reservada vs. manutenção) | Semáforo, holds | ? | ? | ? | — | — | — | Stock = "não verificado" → amarelo | NÃO VERIFICADO |
| RM-08 | Quantidade física / stock por localização | Disponibilidade | ? | ? | ? | — | — | — | Introdução manual | NÃO VERIFICADO |
| RM-09 | Criar projeto/reserva (com referência externa) | Reserva | ? | ? | ? | — | — | — | Criação manual pelo comercial | NÃO VERIFICADO |
| RM-10 | O projeto criado **bloqueia** stock? Em que estado? | Reserva segura | ? | ? | ? | — | — | — | Aprovação operacional humana | NÃO VERIFICADO |
| RM-11 | Atualizar/cancelar projeto; libertar stock | Cancelamento | ? | ? | ? | — | — | — | Manual | NÃO VERIFICADO |
| RM-12 | Procurar projeto por referência externa (deduplicação) | Idempotência | ? | ? | ? | — | — | — | Tabela local de mapeamento + reconciliação | NÃO VERIFICADO |
| RM-13 | Idempotência nativa em escritas | Retries | ? | ? | ? | — | — | — | Verificação "já existe?" antes do retry | NÃO VERIFICADO |
| RM-14 | Expedição/saída e retorno (movimentos) | Armazém | ? | ? | ? | — | — | — | Registo local | NÃO VERIFICADO |
| RM-15 | Números de série / QR / barcode | Rastreabilidade | ? | ? | ? | — | — | — | Etiquetas locais | NÃO VERIFICADO |
| RM-16 | Localização de equipamento por projeto | Rastreabilidade | ? | ? | ? | — | — | — | Estado operacional local | NÃO VERIFICADO |
| RM-17 | Contactos/clientes (criar ou associar) | Projeto | ? | ? | ? | — | — | — | Associação manual | NÃO VERIFICADO |
| RM-18 | Webhooks / notificações de alteração | Sync em tempo quase real | ? | ? | ? | — | — | — | Polling incremental | NÃO VERIFICADO |
| RM-19 | Rate limits e respostas de throttling (códigos, headers) | Resiliência | ? | ? | ? | — | — | — | Rate limiter conservador | NÃO VERIFICADO |
| RM-20 | Ambiente sandbox/teste separado da conta real | PoC segura | n/a | n/a | n/a | — | — | — | Projeto de teste marcado numa conta real (requer autorização) | NÃO VERIFICADO |

## Testes da PoC (Etapa 1)
Executar apenas com autorização expressa e numa conta ou ambiente de teste:
1. **Leitura:** RM-01, RM-03, RM-04, RM-05, RM-06, RM-08, com paginação completa e medição de latência.
2. **Disponibilidade:** RM-07 com casos de stock total, parcial, manutenção e projeto existente sobreposto.
3. **Escrita:** criar projeto de teste → verificar bloqueio (RM-10) → cancelar → verificar libertação (RM-11).
4. **Concorrência:** dois pedidos simultâneos para a última unidade, via plataforma e via UI do Rentman. Esperado: no máximo um confirmado.
5. **Duplicação:** repetir a mesma criação com timeout simulado. Esperado: um único projeto (RM-12/13).
6. **Falhas:** 401, 403, 404, 429, 5xx, timeout, payload inválido. O comportamento do adaptador fica registado.
7. **Sync:** paginação, incremental, reconciliação com divergência provocada.

## Relatório go/no-go para reserva automática
A auto-confirmação (verde com confirmação imediata) só pode ser ativada se **todos** estes pontos forem `VERIFICADO`: RM-07, RM-09, RM-10, RM-11, e RM-12 ou RM-13. O teste de concorrência e o de duplicação também têm de passar. Caso contrário: **NO-GO**, e todos os pedidos ficam `pendente` até haver aprovação operacional humana (ADR-0002).

| Data | Decisão | Evidência | Aprovado por |
|---|---|---|---|
| — | Por decidir | — | — |

## O que depende de credenciais / ação do proprietário
- Conta Rentman com acesso à API (plano/módulo) e um token **de teste**. Nunca partilhar no chat ou no Git: deve ser configurado como variável de ambiente.
- Indicação de um ambiente de teste, ou autorização para criar projetos de teste claramente marcados numa conta real.
- Acesso à documentação oficial da API (ou exportação/PDF dela), já que não foi possível abri-la a partir deste ambiente.

## Design do adaptador (independente da PoC)
- Port `InventoryGateway` no domínio: `listProducts`, `getAvailability(productIds, period)`, `createReservation(cmd, idemKey)`, `cancelReservation`, `findReservationByExternalRef`, `listChangesSince(cursor)`.
- Implementações: `RentmanInventoryGateway` (só métodos verificados; os restantes lançam `CapabilityNotVerifiedError`) e `FakeInventoryGateway` (testes/dev, marcado como fake).
- Cliente HTTP com timeout, retry com backoff exponencial e jitter **apenas** em operações idempotentes, um rate limiter configurável, logs estruturados sem segredos e métricas.
