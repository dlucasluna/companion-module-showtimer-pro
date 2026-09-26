# ChurchTech Rent — Plataforma de configuração, renting e propostas

Configurador comercial para montar sistemas audiovisuais para igrejas **ao vivo, em frente ao cliente**, com preço recalculado instantaneamente, modo cliente sem dados internos e proposta profissional pronta a assinar.

> Nome da empresa temporário: edite em **Configurações → Empresa** (ou em `prisma/seed-data.ts`).

---

## Sumário

1. [Início rápido](#início-rápido)
2. [Contas demo](#contas-demo)
3. [Stack e dependências](#stack-e-dependências)
4. [Variáveis de ambiente](#variáveis-de-ambiente)
5. [Banco de dados, migrations e seed](#banco-de-dados-migrations-e-seed)
6. [Estrutura de pastas](#estrutura-de-pastas)
7. [Pricing engine](#pricing-engine)
8. [Segurança, roles e modo cliente](#segurança-roles-e-modo-cliente)
9. [Funcionalidades](#funcionalidades)
10. [Testes](#testes)
11. [Deploy](#deploy)
12. [Decisões tomadas](#decisões-tomadas)
13. [Preparado para o futuro / próximos passos](#preparado-para-o-futuro--próximos-passos)

---

## Início rápido

Requisitos: **Node.js ≥ 20.9** (testado com 22) e npm.

```bash
cd renting-platform
cp .env.example .env            # ajuste SESSION_SECRET
npm install                     # também corre `prisma generate`
npx prisma migrate deploy       # cria o SQLite em prisma/dev.db
npx prisma db seed              # dados demo (empresa, catálogo, planos, clientes, contratos…)
npm run dev                     # http://localhost:3000
```

Atalho: `npm run setup` (= migrate deploy + seed).

## Contas demo

Todas com a palavra-passe **`demo1234`** (com `DEMO_MODE=true` a página de login mostra botões de acesso rápido).

| Utilizador | Função | Vê dados internos? |
|---|---|---|
| lucas@churchtech.pt | Administrador | Sim — tudo |
| ana@churchtech.pt | Comercial | Sim (resumo interno discreto no configurador) |
| rui@churchtech.pt | Financeiro | Sim + área Financeiro |
| tiago@churchtech.pt | Técnico | Não — equipamentos/assets |
| sofia@churchtech.pt | Leitura | Não — apenas valores comerciais |

Cliente demo: **Igreja Batista Central — Pr. João Silva**.

## Stack e dependências

| Área | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Turbopack) |
| Linguagem | TypeScript `strict` |
| UI | Tailwind CSS v4 (design tokens em `app/globals.css`), componentes próprios, Radix (Dialog, Slider) para acessibilidade, `cmdk` (⌘K), Lucide |
| Animação | Framer Motion (150–350 ms; respeita `prefers-reduced-motion`) |
| Estado | Zustand (store por proposta no configurador + estado de UI) |
| Formulários | React Hook Form + Zod |
| Dados | Prisma 6 · SQLite (dev) · pronto para PostgreSQL |
| Testes | Vitest (engine + segurança) · Playwright (fluxo de aceitação) |

Não usamos shadcn/ui diretamente: os componentes seguem a mesma filosofia (Radix + Tailwind), mas com o design system glass próprio.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | `file:./dev.db` (SQLite) ou `postgresql://…` |
| `SESSION_SECRET` | Sim em produção | ≥ 32 caracteres, assina o cookie de sessão (`openssl rand -base64 32`) |
| `DEMO_MODE` | Não | `true` mostra as contas demo no login. **Desligue em produção.** |

## Banco de dados, migrations e seed

- Esquema: `prisma/schema.prisma` (dinheiro em **cêntimos inteiros**, percentagens como fração `0.3 = 30%`).
- Entidades: `User, Company, Client, Contact, Proposal, ProposalItem, ProposalSignature, Contract, ContractItem, Product, ProductVariant, ProductCategory, Service, InstallationService, Asset, Supplier, PricingRule, SupportPlan, PaymentCondition, Plan, PlanItem, AuditLog`.
- Todas as entidades de negócio têm `companyId` → **multiempresa** possível sem mudar o modelo.

```bash
npm run db:migrate      # prisma migrate dev (nova migration após alterar o schema)
npm run db:deploy       # aplica migrations existentes
npm run db:seed         # repõe os dados demo (apaga tudo e volta a semear)
npm run db:studio       # Prisma Studio
```

O seed calcula todas as propostas e contratos **com o próprio pricing engine** (os números demo são coerentes com o configurador).

### Mudar para PostgreSQL

1. Em `schema.prisma`: `provider = "postgresql"`.
2. `DATABASE_URL="postgresql://user:pass@host:5432/churchtech"`.
3. Apague `prisma/migrations` (são específicas de SQLite) e gere de novo: `npx prisma migrate dev --name init`.
4. Opcional: nas pesquisas (`contains`) acrescente `mode: "insensitive"` (o SQLite já é case-insensitive em ASCII).

## Estrutura de pastas

```
app/
  (app)/                 área autenticada (sidebar, ⌘K, modo cliente)
    dashboard/  proposals/ [id]/ (configurador) [id]/preview/ new/
    clients/ [id]/  contracts/  assets/  catalog/  plans/  finance/  settings/
  login/                 autenticação
  p/[token]/             link público da proposta (sem login, só dados comerciais)
components/
  ui/                    design system (GlassCard, Button, SegmentedControl, PriceSlider,
                         QuantitySelector, AnimatedNumber, Modal, Drawer, Toast, DataTable,
                         EmptyState, Skeleton, MetricCard, StatusBadge, Menu…)
  layout/                AppShell, Sidebar, CommandPalette, InternalOnly, contexts
  configurator/          ProductCard, VariantCompare, PriceSummary, ConditionsEditor,
                         NegotiationDrawer, SimulationModal, autosave…
  proposals/  dashboard/  clients/  catalog/  assets/  contracts/  plans/  settings/
lib/
  pricing/               ⭐ motor financeiro isolado (+ __tests__)
  database/              acesso a dados (Prisma), loaders do configurador, dashboard, auditoria
  actions/               Server Actions (validação Zod + permissões + auditoria)
  auth/                  sessão assinada, hash scrypt, matriz de permissões
  security/              projeções comerciais (allow-list) + testes de fuga de dados
  proposals/             snapshot de preços, numeração, histórico, persistência
  formatters/  i18n/  validation/  status.ts
store/                   Zustand (configurador, UI, modo cliente)
hooks/  types/  prisma/  public/products/  e2e/
```

## Pricing engine

Módulo isolado e puro em `lib/pricing/` — **nenhuma fórmula nos componentes** e **nenhum custo no código** (tudo vem da base de dados).

- `engine.ts → calculatePricing(params)` recebe exatamente os agregados da especificação: `equipmentCost, installationCost, servicesCost, contractMonths, upfront, targetMultiplier, supportCost/Price, riskReserve, maintenanceReserve, residualValue, discount, VAT` (+ `monthlyOverride`, `targetMargin` para negociação) e devolve `totalInternalCost, initialPayment, monthlyPayment, totalContractRevenue, grossProfit, grossMargin, markup, breakEvenMonth, residualAssetValue` (+ versões com IVA, avisos e estado da margem).
- `quote.ts` agrega linhas → parâmetros e calcula o **impacto mensal por linha** (o "+€X/mês" mostrado ao cliente).
- `configuration.ts` liga a configuração do vendedor (produtos, variantes, quantidades, condições) ao engine e faz a **comparação de variantes** (PTZ Standard vs NDI).
- `rules.ts` junta regras globais com sobreposições por plano.

### Modelo

```
hardCost        = equipamento + instalação + serviços
reservas        = equipamento × risco%  +  equipamento × manutenção%/ano × anos
listPrice       = hardCost × multiplicador + reservas − crédito do valor residual
                  (ou, em negociação: custo total / (1 − margem alvo) − receita de suporte)
systemPrice     = listPrice − desconto
entrada         = % do systemPrice (ou valor fixo), arredondada ao passo definido (ex.: €10)
mensalidade     = (systemPrice − entrada) / meses + preço do suporte, arredondada PARA CIMA (ex.: €1)
break-even      = 1.º mês em que entrada + mensalidades ≥ desembolso (hardCost + risco) + custos mensais
valor residual  = custo × max(residual mínimo, 1 − meses/vida útil)   (só hardware)
```

Exemplo da especificação (sem reservas): custo €4.000 × 1,8 = **€7.200**; entrada €1.200 → **24 × €250**. Está coberto por teste.

Regras editáveis em **Configurações → Pricing Settings** (multiplicador 1,8, entrada 30%, 24 meses, reservas, residual, IVA 23%, margem mínima 35%, arredondamentos, preços com/sem IVA) e por plano em **Planos → Pricing** (ex.: Broadcast Premium usa 1,75×).

## Segurança, roles e modo cliente

**Duas camadas, deliberadamente diferentes:**

1. **Fronteira de segurança (servidor).** Cada página e Server Action verifica a sessão e a permissão (`lib/auth/permissions.ts`). Dados internos (custo, margem, lucro, markup, break-even, regras de pricing) **só são carregados e serializados para roles com `internal.view`** (Admin, Comercial, Financeiro). O documento da proposta, o link público `/p/[token]` e qualquer vista de cliente recebem apenas a **projeção comercial** (`lib/security/projections.ts`), construída por *allow-list* — novos campos internos nunca "vazam" por acidente. Testes unitários e o teste E2E verificam a ausência dessas chaves.
2. **Privacidade no ecrã do vendedor (modo cliente).** "Apresentar ao cliente" (ou **⌘⇧P / Ctrl+Shift+P**) entra em fullscreen, remove sidebar, ⌘K, ferramentas de negociação e **desmonta** (não esconde com CSS) todos os componentes internos (`<InternalOnly>`). O estado é guardado num cookie lido pelo servidor, por isso um refresh em frente ao pastor continua em modo cliente sem "flash" de dados internos.

Nota honesta: para o preço mudar **instantaneamente** durante a reunião, o configurador calcula no browser; por isso a tabela de custos está na memória da página do vendedor (que tem permissão para a ver). Nunca é enviada a roles sem `internal.view`, ao link público ou ao cliente. Todos os valores são **recalculados no servidor** a cada gravação — o servidor nunca confia nos totais vindos do browser.

| Role | Permissões principais |
|---|---|
| Admin | tudo |
| Sales | clientes, propostas, configurador, templates, resumo interno |
| Finance | financeiro, contratos, valores internos |
| Technician | assets/equipamentos, contratos (leitura) |
| Viewer | leitura comercial |
| Client | preparado para o portal do cliente (`portal.view`) |

Outros: palavras-passe com `scrypt`, cookie de sessão HMAC `httpOnly`/`sameSite=lax`, cabeçalhos de segurança (`next.config.ts`), tokens públicos não adivinháveis (144 bits).

## Funcionalidades

- **Configurador** (uma só ecrã): presets Broadcast Start/Pro/Premium, templates ou "Montar do zero"; cards por categoria; variantes com troca instantânea (PTZ Standard ↔ NDI mantém a quantidade); comparação lado a lado com impacto mensal; quantidades; suporte (Basic/Remote/Premium/On-site); prazo 12/24/36/48; entrada por chips, slider ou valor; números animados; resumo "Seu sistema" sticky (bottom sheet em mobile).
- **Ajustar proposta** (drawer, só vendedor): entrada %/€, mensalidade desejada, prazo, desconto %/€, suporte, margem alvo, preços com IVA — com **aviso de margem abaixo do limite**.
- **Simular condições**: até 3 cenários lado a lado, aplicar com um clique (margem visível apenas ao vendedor).
- **Autosave**: cada alteração vai para `localStorage` imediatamente e para o servidor após ~1 s ("Guardando…/Guardado"); recupera alterações após refresh ou falha de rede; histórico agregado ("Lucas alterou Câmera PTZ Standard ×2 para Câmera PTZ NDI ×3").
- **Proposta**: pré-visualização A4 premium (capa, sistema recomendado, investimento, condições, termos, assinatura); **Baixar PDF** (impressão do navegador → PDF com layout de impressão dedicado); Email (`mailto:`), WhatsApp (`wa.me`), Copiar link; **Assinar agora** (nome + assinatura desenhada + aceitação + data, com IP/user-agent); link público com "Aceitar e assinar"; converter em contrato; duplicar; guardar como template.
- **Dashboard** (MRR, contratos ativos, receita contratada, investimento, margem média, clientes ativos, propostas abertas, conversão, equipamentos instalados, valor residual da frota; MRR 12 meses; contratos por estado; pipeline; atividade).
- **Clientes** (lista + perfil completo), **Contratos** (ciclo de vida), **Equipamentos** (assets individuais com série, fornecedor, garantia, cliente, contrato, estado), **Catálogo** (CRUD com variantes, custos, vida útil, residual, ativação), **Planos**, **Financeiro** (previsão 12 meses, rentabilidade por contrato), **Configurações** (empresa, pricing, suporte, utilizadores).
- **⌘K**: pesquisa global (clientes, propostas, contratos, equipamentos) e ações rápidas.
- **Moeda**: formato da especificação (`€1.200`, `€259/mês`). i18n preparado: `pt-PT`, `pt-BR`, `en` para o conteúdo visto pelo cliente (configurador e proposta) — mude em Configurações → Empresa → Idioma.

## Testes

```bash
npm test                 # Vitest: pricing engine (quantidade, troca de câmera, entrada, prazo,
                         # desconto, valor residual, IVA, margem mínima, validação) + projeções/roles
npm run typecheck
npm run lint

# E2E (fluxo de aceitação §81 + aviso de margem + link público sem dados internos)
npm run build && npm run test:e2e
# ou contra um servidor já a correr:
E2E_BASE_URL=http://localhost:3000 npm run test:e2e
```

Se o Playwright pedir browsers, use `npx playwright install chromium` ou aponte `PLAYWRIGHT_CHROMIUM_PATH` para um Chromium local. O fluxo E2E cria um cliente novo a cada execução.

## Deploy

- **Vercel / Node server**: `npm run build && npm start`. Configure `DATABASE_URL` (PostgreSQL gerido: Neon, Supabase, RDS…), `SESSION_SECRET`, `DEMO_MODE=false`, e corra `npx prisma migrate deploy` no pipeline.
- SQLite serve para desenvolvimento/demo num único servidor; em serverless use PostgreSQL.
- Imagens de produtos: `public/products/*.svg` (ilustrações próprias). Para fotos reais, adicione ficheiros e escolha-os no editor de produto.

## Decisões tomadas

- **Pasta própria (`renting-platform/`)**: o repositório contém um módulo Bitfocus Companion não relacionado; a plataforma foi criada ao lado, sem o alterar.
- **Prisma 6** (estável) em vez de 7: API madura e engines disponíveis no ambiente; migração futura simples.
- **Dinheiro em cêntimos** e percentagens como frações; arredondamento da mensalidade **para cima** (nunca corrói margem) e da entrada ao múltiplo mais próximo — ambos configuráveis.
- **Reservas** (risco, manutenção) somam ao custo e ao preço (sem multiplicador); o multiplicador aplica-se ao custo do sistema, como no exemplo €4.000 → €7.200.
- **Suporte** é sempre mensal (não entra na entrada).
- **Uma linha por produto** no configurador (a variante é trocada na própria linha — é o que torna a troca Standard → NDI imediata). O modelo de dados (`ProposalItem`) suporta múltiplas linhas por produto para uso futuro.
- `Service` e `InstallationService` são tabelas de detalhe 1:1 de `Product` (o catálogo é único e genérico: áudio, LED, iluminação, licenças… entram como produtos).
- **PDF** via impressão do navegador com CSS de impressão dedicado (fiel à pré-visualização, sem dependências pesadas). Pode ser trocado por geração no servidor (Playwright/Chromium) numa rota dedicada.
- **Formato monetário** segue a especificação (`€1.200`) em vez do padrão `Intl` pt-PT (`1200,00 €`).
- Ecrãs administrativos em pt-PT; i18n completo aplicado ao que o cliente vê.

## Preparado para o futuro / próximos passos

- **Portal do cliente**: role `CLIENT`, `User.clientId`, permissões `portal.view`, projeção comercial e link público já existem.
- **Upgrade/renovação de contrato**: `Proposal.kind (NEW/UPGRADE/RENEWAL)`, `Proposal.contractId`, `Contract.parentContractId/version`, `ContractItem.addedInVersion/removedInVersion`.
- **Assinatura eletrónica externa**: `ProposalSignature.provider/externalId`.
- **Integrações reais** (email transacional, WhatsApp Business API, pagamentos, ERP fiscal): hoje Email/WhatsApp abrem o cliente de email / `wa.me` com a mensagem e o link.
- Chamados, manutenções e documentos do cliente: secções preparadas no perfil (estado vazio), modelo a acrescentar.
- Edição de categorias, fornecedores e condições de pagamento na UI (hoje via seed/Prisma Studio).
- Rate limiting no link público de assinatura.
- Configurador para vendedores **sem** `internal.view` (exigiria cálculo no servidor a cada alteração).
