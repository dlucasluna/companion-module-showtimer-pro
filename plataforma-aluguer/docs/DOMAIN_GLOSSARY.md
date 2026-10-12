# Glossário de domínio

| Termo (PT) | Código (EN) | Definição |
|---|---|---|
| Visitante | visitor | Utilizador não autenticado. Vê o catálogo e o preço público e pode iniciar um carrinho. |
| Cliente final | customer (b2c) | Pessoa ou entidade com conta, sem tabela comercial B2B. |
| Agência | customer (agency) | Cliente B2B com tabela "agência" **após aprovação**. |
| Locadora / empresa audiovisual | customer (rental_company) | Cliente B2B com tabela "locadora" **após aprovação**. |
| Segmento | segment | b2c, agency ou rental_company. Só produz efeitos em preço com `segment_status = approved`. |
| Comercial | sales | Revê estimativas, descontos e condições, e aprova ou rejeita. |
| Armazém | warehouse | Separação, checklist, saída, retorno e incidências. |
| Técnico/operações | operations | Valida montagem, equipa e requisitos técnicos. |
| Motorista | driver | Vê as entregas atribuídas e regista estados e comprovativos. |
| Admin | admin | Configura regras, preços, horários, integrações, permissões e auditoria. |
| Produto | product | Equipamento ou serviço do catálogo. Pode ter `rentman_id`. |
| Kit | kit | Produto composto por componentes fixos ou configuráveis. |
| Regra de kit / relação | product_relation | Relação aprovada entre produtos: **obrigatório**, **opcional**, **incompatível**, **substituto**, **condicional**. Tem sempre um motivo e quem aprovou. |
| Preço público de referência | public_reference_price | Preço B2C indicativo mostrado no site. Não é o preço final. |
| Tabela de preços | price_list | Conjunto versionado de regras de preço por segmento. |
| Estimativa | estimate | Orçamento calculado automaticamente, ainda sem validação humana quando esta é exigida. |
| Orçamento | quote | Proposta versionada com linhas, validade e snapshot. |
| Snapshot de preços | pricing_snapshot | Cópia imutável das regras, taxas e preços usados num orçamento. |
| Pedido | order | Agregador comercial: cliente, período, local, orçamento(s), reserva, operação e pagamento. |
| Reserva | reservation | Compromisso de stock para um período. **Confirmada** só com confirmação fiável do inventário. |
| Bloqueio provisório (hold) | provisional_hold | Compromisso temporário com expiração, ainda não confirmado. |
| Compromisso de stock | stock_commitment | Linha do ledger: produto × quantidade × período (com margens). |
| Margem de preparação/transporte | buffer | Tempo antes e depois do período do cliente em que o equipamento também está ocupado. |
| Saída física | checkout / dispatch | O equipamento deixa o armazém. Diferente de reserva. |
| Retorno / conferência | return / check-in | O equipamento volta e é verificado (danos, faltas). |
| "Dar baixa" | — | Termo ambíguo no negócio. Usar sempre reserva, saída física ou retorno (Bíblia §7). |
| Semáforo | traffic_light | Cor que indica a **capacidade de atendimento/aprovação**: verde, amarelo ou vermelho. |
| Janela operacional | operating_window | Horários em que a equipa consegue responder ou confirmar. Inclui feriados e exceções. |
| Override de capacidade | capacity_override | Alteração manual e auditada do estado de capacidade (ex.: suspender verde). |
| SLA | sla_policy | Prazo de resposta comprometido por cor/equipa, só se a escala operacional o suportar. |
| Localização operacional | operational_location | no armazém, em trânsito, no evento X, em manutenção, em retorno. Tem timestamp e origem. |
| Expedição / entrega / recolha | shipment (delivery/collection) | Movimentos logísticos com janela, veículo, motorista e comprovativo. |
| Registo de pagamento | payment_record | Pagamento recebido fora da plataforma, registado manualmente com comprovativo. |
| Reconciliação | reconciliation | Comparação periódica entre dados locais e o Rentman, que gera um relatório de divergências. |
| Idempotency key | idempotency_key | Identificador que garante que repetir uma operação não a duplica. |
| Dead-letter | dead_letter | Job que esgotou as tentativas e aguarda análise ou reprocessamento manual. |
| Modo degradado | degraded_mode | A integração está indisponível e a equipa opera manualmente. Nada é auto-confirmado. |
| PoC | proof of concept | Prova de conceito da API Rentman (Etapa 1). |
| Fake / mock | fake adapter | Implementação simulada de um adaptador, sempre marcada como não produtiva. |
