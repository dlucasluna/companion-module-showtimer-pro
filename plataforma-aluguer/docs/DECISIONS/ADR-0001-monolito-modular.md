# ADR-0001: Monólito modular em TypeScript com worker separado

- **Estado:** Proposta (aguarda aprovação do proprietário)
- **Data:** 2026-10-12

## Contexto
Uma pessoa desenvolve com apoio de agentes de IA. O domínio é rico (preços, reservas, operações), as integrações são incertas (Rentman) e é preciso transferir o projeto para outros developers. A Bíblia (§11) recomenda um monólito modular com Next.js e PostgreSQL.

## Decisão
- Uma base de código TypeScript com módulos de domínio isolados (`src/modules/*`), cada um com uma API pública explícita.
- Dois processos: **web** (Next.js) e **worker** (jobs, integrações, emails), com a mesma base PostgreSQL.
- Fila e outbox em PostgreSQL (pg-boss) no MVP. Não há Redis nem microserviços.
- Adaptadores externos atrás de ports, cada um com uma implementação fake.
- As regras de fronteira (sem imports cruzados entre módulos) são verificadas por lint (ex.: `eslint-plugin-boundaries` ou `dependency-cruiser`, a escolher na Etapa 2).

## Consequências
- (+) Um deploy, transações locais, debugging simples e baixo custo.
- (+) Os módulos podem ser extraídos mais tarde se houver necessidade real.
- (−) É preciso disciplina de fronteiras (mitigada por lint e CI).
- (−) Requer um host que suporte um processo worker de longa duração (influencia a escolha de hospedagem, TASK-004).

## Alternativas consideradas
- Microserviços: prematuro, com custo operacional alto para uma equipa de uma pessoa.
- Serverless puro: dificulta filas, retries longos e locks de reserva.
