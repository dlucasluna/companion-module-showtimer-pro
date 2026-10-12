# TASK-003: PoC Rentman

- **Etapa:** 1 · **Prioridade:** P0 · **Bloqueado por:** Q-B3 (credenciais/conta de teste, documentação oficial)
- **Ler:** `AGENTS.md`, `docs/INTEGRATIONS/RENTMAN.md`, `docs/DECISIONS/ADR-0002-confirmacao-de-reservas.md`

## Objetivo
Passar cada capacidade RM-01..RM-20 de `NÃO VERIFICADO` para `VERIFICADO` ou `INDISPONÍVEL`, com evidência, e produzir a decisão go/no-go sobre reserva automática.

## Escopo
- Script/cliente isolado em `poc/rentman/` (fora de `src/`), com o token lido de `RENTMAN_API_TOKEN` e nunca registado em logs.
- Gravar pedidos e respostas anonimizados em `fixtures/rentman/`.
- Escritas apenas em ambiente/projeto de teste explicitamente autorizado. Limpar tudo o que for criado e registar a limpeza.

## Fora de escopo
Integração no produto, sync em produção e qualquer escrita em projetos reais de clientes.

## Aceite
- Matriz preenchida (endpoint, método, escopos, limites, exemplo, semântica, falhas, fallback).
- Testes de concorrência, duplicação e falhas executados, com o log anexo.
- Relatório go/no-go preenchido e aprovado pelo proprietário.
