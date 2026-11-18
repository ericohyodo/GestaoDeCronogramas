import type { Migracao } from '../migrador';

// Formulário da SD — passagem de bastão do Comercial para a Engenharia:
// o Comercial informa a data de envio da cotação e anexa a evidência de oficialização do cliente (PO:
// e-mail .msg/.eml ou documento) e abre a SD; o Gerente de Engenharia ou um Gestor de Programa dá o
// aceite (cria o projeto PRO) ou devolve ao Comercial com motivo.
export const migracao0033: Migracao = {
  versao: 33,
  nome: '0033-sd-formulario',
  sql: `
    ALTER TABLE sd ADD COLUMN data_envio_cotacao TEXT;
    ALTER TABLE sd ADD COLUMN numero_po TEXT;
    ALTER TABLE sd ADD COLUMN observacoes TEXT;
    ALTER TABLE sd ADD COLUMN aberta_por TEXT REFERENCES usuarios(id);
    ALTER TABLE sd ADD COLUMN aberta_em TEXT;
    ALTER TABLE sd ADD COLUMN aceite_por TEXT REFERENCES usuarios(id);
    ALTER TABLE sd ADD COLUMN aceite_em TEXT;
    ALTER TABLE sd ADD COLUMN devolucao_motivo TEXT;
    ALTER TABLE sd ADD COLUMN devolucao_por TEXT REFERENCES usuarios(id);
    ALTER TABLE sd ADD COLUMN devolucao_em TEXT;
    ALTER TABLE sd ADD COLUMN cronograma_id TEXT REFERENCES cronogramas(id);

    CREATE TABLE sd_anexos (
      id              TEXT PRIMARY KEY,
      sd_id           TEXT NOT NULL REFERENCES sd(id) ON DELETE CASCADE,
      nome_arquivo    TEXT NOT NULL,
      nome_armazenado TEXT NOT NULL,
      tipo_mime       TEXT,
      tamanho_bytes   INTEGER NOT NULL,
      usuario_id      TEXT REFERENCES usuarios(id),
      criado_em       TEXT NOT NULL
    );
    CREATE INDEX idx_sd_anexos_sd ON sd_anexos (sd_id, criado_em);
  `,
};
