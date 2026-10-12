# AGENTS.md — Plataforma de Aluguer Audiovisual

Regras permanentes para agentes (Codex, Claude Code) e developers. Curto de propósito.

## Antes de começar uma tarefa
1. Lê só: este ficheiro, `docs/PROJECT_BRIEF.md`, `docs/PROGRESS.md`, a tarefa em `tasks/` e os docs/ADRs do módulo em causa.
2. Não releias `docs/BIBLIA_PROJETO.pdf` salvo mudança de requisitos. A Bíblia define requisitos; o brief resume-os.
3. Se a Bíblia, o brief e uma tarefa se contradizem: para, regista em `docs/OPEN_QUESTIONS.md` e pede decisão.

## Inegociáveis
- **Rentman:** nunca inventar endpoints, campos, permissões, limites ou webhooks. Só usar o que estiver marcado `VERIFICADO` em `docs/INTEGRATIONS/RENTMAN.md`. O resto fica atrás de interface + mock, com o mock claramente identificado.
- **Reservas:** nunca marcar uma reserva como `confirmada` sem confirmação fiável do inventário (ADR-0002). Uma falha de API nunca confirma. Os retries nunca duplicam (usar chaves de idempotência).
- **Compatibilidade técnica:** usar apenas regras determinísticas aprovadas (obrigatório/opcional/incompatível/substituto/condicional). A IA nunca decide compatibilidades.
- **Segurança:** a autorização é sempre verificada no servidor. Preços B2B, PII e credenciais nunca chegam a respostas públicas nem ao browser de quem não tem permissão. O browser nunca chama o Rentman.
- **Segredos:** nunca no Git. Usar variáveis de ambiente e manter `.env.example` atualizado.
- **Honestidade:** não inventar disponibilidade, prazos, preços finais nem garantias de SEO/GEO.
- **Ações que exigem aprovação humana:** deploy público, operações em contas reais (Rentman, email, pagamentos), migrations irreversíveis, custos pagos, envio de comunicações a clientes e mudanças de escopo.

## Engenharia
- Monólito modular em TypeScript (ADR-0001). Os módulos comunicam pela API pública (`modules/<nome>/index.ts`); nada de imports para dentro de outro módulo.
- A UI nunca importa adaptadores externos; o domínio nunca importa frameworks de UI.
- Dinheiro em inteiros (cêntimos de EUR). Datas em UTC na base de dados; `Europe/Lisbon` na apresentação e nas regras de calendário.
- Cada orçamento guarda um snapshot imutável de preços e condições.
- Todas as mudanças de estado e ações administrativas geram um registo de auditoria.
- Uma tarefa = uma mudança coerente. Nada de refatorações laterais sem autorização.

## Definição de pronto
Testes, typecheck e lint passam; migrations reversíveis (ou a irreversibilidade está justificada e aprovada); segurança revista; `docs/PROGRESS.md` atualizado (objetivo, ficheiros, testes e resultados, decisões, riscos, bloqueios, próximo passo); ADR criada se houver decisão arquitetónica. Compilar não chega: apresenta evidência dos testes.

## Formato de resposta por ciclo
Objetivo · Decisões e suposições (o que ainda não foi validado) · Alterações · Como testar · Resultados de testes · Riscos/bloqueios · Próxima tarefa · Decisão pedida ao proprietário (só se necessária).
