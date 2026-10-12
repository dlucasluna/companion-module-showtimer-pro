# Fluxo 01: Do catálogo ao pedido (cliente)

```mermaid
sequenceDiagram
  actor C as Cliente
  participant W as Plataforma (servidor)
  participant Q as Fila/worker
  participant R as Rentman (se verificado)
  actor S as Comercial/Operações
  C->>W: Pesquisa catálogo, escolhe produtos, datas, local, entrega/levantamento
  W->>W: kit-rules sugere obrigatórios/opcionais (com motivo)
  W->>W: pricing calcula estimativa (preço do segmento aprovado ou público)
  W->>W: availability: ledger local + cache Rentman (com timestamp)
  W->>W: capacity avalia semáforo (cor + motivos + prazo)
  C->>W: Identifica-se/regista-se e submete (idempotency key)
  W->>W: Cria pedido + orçamento v1 + snapshot imutável (transação + outbox)
  alt Verde e AUTO_CONFIRM_ENABLED
    W->>W: hold provisório (lock por produto)
    W->>Q: job criar reserva
    Q->>R: criar projeto/reserva (idem key, verificação de existência)
    Q->>R: releitura de confirmação
    Q->>W: confirmada ou volta a pendente
  else Amarelo / Vermelho / Verde sem auto-confirmação
    W->>S: entra na fila de aprovação (SLA da cor)
    S->>W: revê, ajusta (nova versão do orçamento), aprova ou rejeita
    W->>C: proposta enviada
    C->>W: aceita dentro da validade
    S->>W: confirma reserva após verificação do inventário
  end
  W->>C: Notificação de cada mudança de estado
```

Pontos de controlo:
- Um B2B não aprovado vê o preço público e recebe a indicação de que a validação do perfil está pendente.
- A submissão é idempotente: um duplo clique ou um retry de rede não cria dois pedidos.
- Se a disponibilidade não puder ser verificada, o pedido fica amarelo com o motivo "stock não verificado".
