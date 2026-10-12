# Fluxo 02: Operação, armazém e logística

1. **Reserva confirmada** → a operação passa a `a_preparar` e o pedido aparece no painel do armazém, ordenado pela data de saída (com margem).
2. **Preparação:** lista de picking por item/case, com leitura de QR/barcode **se** houver identificação compatível (RM-15). Checklist de carga.
3. **Pronto:** o comercial ou as operações atribuem manualmente o veículo e o motorista (MVP) e a janela de entrega.
4. **Expedição:** a saída física é registada (quem, quando, o quê). A localização operacional passa a "em trânsito". O movimento é sincronizado com o Rentman se RM-14 estiver verificado; caso contrário, fica registado localmente com uma tarefa manual.
5. **Entrega:** o motorista vê só as suas entregas e regista o comprovativo (nome, foto e/ou assinatura) → `entregue` / `em_utilizacao`. Localização: "no evento X".
6. **Recolha:** é agendada da mesma forma → `recolha`.
7. **Retorno e conferência:** contagem e verificação de cada item → `devolvido` → `conferido`. As faltas e danos abrem uma `incidência` (com fotos e responsável), que pode gerar um ajuste comercial.
8. **Encerramento:** a reserva fica `concluida`. A reconciliação com o Rentman confirma que os movimentos coincidem.

Modo degradado: todos os passos funcionam sem Rentman. As divergências entram no relatório de reconciliação.
Futuro (não no MVP, mas previsto no modelo): múltiplas paragens por `shipment_route`, capacidade volumétrica do veículo, ETA e GPS.
