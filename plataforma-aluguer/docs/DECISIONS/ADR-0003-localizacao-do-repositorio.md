# ADR-0003: Localização do repositório da plataforma

- **Estado:** Proposta (decisão do proprietário, **bloqueante para a Etapa 2**)
- **Data:** 2026-10-12

## Contexto
A sessão de trabalho foi aberta no repositório `dlucasluna/companion-module-showtimer-pro`, que contém um módulo Bitfocus Companion para o ShowTimer Pro (um produto diferente, com a sua própria toolchain e lint, e o pacote `showtimer-pro`). Misturar uma aplicação Next.js com esse módulo poluiria ambos os projetos, a CI e o histórico.

## Decisão proposta
- A documentação de descoberta (Etapa 0) fica provisoriamente em `plataforma-aluguer/`, numa pasta autocontida e fácil de mover.
- Antes da Etapa 2, criar um **repositório dedicado** (ex.: `plataforma-aluguer-audiovisual`) e mover `plataforma-aluguer/` para a raiz desse repositório, preservando o histórico se desejado (`git subtree split`).

## Alternativas
- Manter tudo neste repositório: não recomendado, porque mistura dois produtos.
- Monorepo com workspaces: só faria sentido se os produtos partilhassem código, o que não é o caso.
