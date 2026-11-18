import type { Migracao } from '../migrador';

// Pasta da AV no Windows: ao criar uma AV, o app cria "<raiz>\AV 26-036 - Cliente - Descrição" para o
// Comercial guardar e-mails, desenhos e orçamentos de entrada. `av_pasta_config` (linha única) guarda a raiz,
// definida pelo administrador em Configurações; `av.pasta` guarda o caminho criado (o nome não muda depois,
// mesmo que cliente ou descrição mudem).
export const migracao0053: Migracao = {
  versao: 53,
  nome: '0053-pasta-das-avs',
  sql: `
    ALTER TABLE av ADD COLUMN pasta TEXT;

    CREATE TABLE av_pasta_config (
      id             INTEGER PRIMARY KEY CHECK (id = 1),
      pasta_raiz     TEXT,
      atualizado_em  TEXT NOT NULL,
      atualizado_por TEXT REFERENCES usuarios(id)
    );
  `,
};
