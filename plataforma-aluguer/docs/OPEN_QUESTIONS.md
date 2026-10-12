# Ambiguidades, contradições e decisões pendentes

Classificação: **B** = bloqueante (impede a próxima etapa) · **I** = importante (necessária antes da etapa indicada) · **A** = adiável.

## Contradições detetadas
| ID | Contradição | Proposta | Classe |
|---|---|---|---|
| C1 | O repositório da sessão é um módulo Companion (ShowTimer Pro) e não tem relação com a plataforma | Repositório dedicado (ADR-0003) | **B** (Etapa 2) |
| C2 | O ficheiro recebido chama-se `..._v1_1.pdf`, mas o conteúdo indica "v1.0, 12/10/2026" | Confirmar qual é a versão vigente; guardado como `docs/BIBLIA_PROJETO.pdf` | A |
| C3 | O verde promete "confirmação imediata", mas só é possível se a API permitir reserva segura | Até haver GO na PoC, o verde mostra "estimativa firme, confirmação após verificação" (ADR-0002) | I (Etapa 4) |
| C4 | A numeração das etapas difere: o prompt tem 0–7 com Catálogo (3), Motor comercial (4), Operações (5), Qualidade/piloto (6), Lançamento (7); a Bíblia tem Comercial (3), Operações (4, inclui semáforo), Piloto (5), Lançamento (6), Evolução (7) | Seguir a numeração do **prompt** (contrato de execução); o semáforo fica no Motor comercial (Etapa 4). Equivalência em `ACCEPTANCE/PHASE_GATES.md` | A |
| C5 | O gate da Etapa 0 na Bíblia exige o inventário de processos, categorias, tabelas comerciais, SLA e responsabilidades **aprovados pela empresa**. O prompt exige a aprovação da arquitetura | A Etapa 0 só fecha com as duas aprovações: técnica (arquitetura) e de negócio (inventário Q-I*) | I |
| C6 | Vermelho: a Bíblia inclui "fora do horário"; o prompt fala em "armazém/atendimento indisponível" | Tratar ambos como vermelho (fora da janela operacional = atendimento indisponível) | A |

## Perguntas bloqueantes (agora)
| ID | Pergunta | Bloqueia |
|---|---|---|
| Q-B1 | Aprova a arquitetura proposta (ARCHITECTURE.md, ADR-0001, ADR-0002)? | Todo o código de produção |
| Q-B2 | Onde vive o código? Criar um repositório dedicado (recomendado) ou outro local? | Etapa 2 |
| Q-B3 | Existe conta Rentman com acesso à API? Há ambiente de teste ou autorização para projetos de teste marcados na conta real? Pode facultar a documentação oficial da API (link acessível ou PDF)? | Etapa 1 (a PoC real; os contratos e mocks podem avançar) |

## Perguntas importantes (antes da etapa indicada)
| ID | Tema | Pergunta | Antes da |
|---|---|---|---|
| Q-I1 | Preços | Unidade de tempo (dia, 24h, fim de semana, semana?); dias de transporte contam? Mínimos por pedido? | Etapa 4 |
| Q-I2 | Preços | Ordem de aplicação de descontos (duração, quantidade, segmento) e teto de desconto por papel | Etapa 4 |
| Q-I3 | IVA | Taxas aplicáveis por região (Continente/Madeira/Açores) e por tipo de linha; preços públicos com ou sem IVA? | Etapa 4 |
| Q-I4 | Comercial | Validade padrão do orçamento; política de cancelamento, danos, caução e atrasos | Etapa 4 |
| Q-I5 | B2B | Documentos exigidos para aprovação de agência/locadora; revisão periódica; revogação | Etapa 4 |
| Q-I6 | Kits | Quem aprova as regras de compatibilidade? Existe uma lista inicial de kits e acessórios? | Etapa 4 |
| Q-I7 | Operação | Horários do armazém e do atendimento, feriados considerados, SLA realista por cor | Etapa 4 |
| Q-I8 | Operação | Limites para auto-aprovação (valor, quantidade, distância, antecedência mínima) | Etapa 4 |
| Q-I9 | Logística | Raio de cobertura, janelas de entrega, custo de transporte (fórmula), política de recolha | Etapa 4/5 |
| Q-I10 | Pagamento | A expedição exige pagamento (total/parcial) registado? Para que perfis? | Etapa 5 |
| Q-I11 | Faturação | Software de faturação usado hoje; quem emite documentos fiscais | Etapa 5 |
| Q-I12 | Catálogo | Quantos produtos e categorias? Existem fotos e specs? O Rentman tem os dados certos? | Etapa 3 |
| Q-I13 | Hosting | Orçamento mensal aceitável para infraestrutura e serviços | Etapa 2 |
| Q-I14 | Marca | Nome, domínio e estratégia de marca (preservar a reputação da empresa existente) | Etapa 3 |

## Adiáveis
Prestadores de pagamento online · roteirização · app de motorista · canais de notificação adicionais · volume de tráfego pago · integração fiscal automática.
