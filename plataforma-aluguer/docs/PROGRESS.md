# Progresso

## Estado atual (2026-10-12)
**Etapa 0 (Descoberta): documentação entregue. A aguardar a aprovação da arquitetura.** Ainda não há código de produção.

## Registo de entregas

### 2026-10-12: Etapa 0, pacote de descoberta
- **Objetivo:** analisar a Bíblia e o repositório; propor a arquitetura, o modelo de dados, os mapas de estado, a matriz Rentman e o backlog.
- **Implementação:** só documentação.
- **Ficheiros:** `AGENTS.md`, `README.md`, `docs/BIBLIA_PROJETO.pdf`, `docs/PROJECT_BRIEF.md`, `docs/ARCHITECTURE.md`, `docs/DOMAIN_GLOSSARY.md`, `docs/INTEGRATIONS/RENTMAN.md`, `docs/DECISIONS/ADR-0001..0003`, `docs/OPEN_QUESTIONS.md`, `docs/WORKFLOWS/01..02`, `docs/ACCEPTANCE/PHASE_GATES.md`, `tasks/BACKLOG.md`, `tasks/TASK-003-poc-rentman.md`.
- **Testes:** não aplicável (sem código).
- **Decisões propostas (por aprovar):** monólito modular com worker (ADR-0001); confirmação de reservas com ledger, locks, idempotência e auto-confirmação desligada até à PoC (ADR-0002); repositório dedicado (ADR-0003).
- **Riscos:** a API Rentman pode não suportar reserva atómica (mitigação: ADR-0002); o repositório atual é de outro produto (ADR-0003).
- **Bloqueios:** sem credenciais Rentman; a documentação oficial não estava acessível a partir do ambiente (DNS bloqueado para `rentman.io`, `support.rentman.io` e `api.rentman.net`).
- **Próximo passo:** o proprietário responde a Q-B1..Q-B3 (`OPEN_QUESTIONS.md`). Em paralelo, TASK-002 (regras de negócio).

## O que existe
Documentação de descoberta.

## O que falta
Tudo o que está a partir da Etapa 1 (ver `tasks/BACKLOG.md`).

## Como testar
Não aplicável nesta etapa.
