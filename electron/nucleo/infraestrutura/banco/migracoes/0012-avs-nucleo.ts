import type { Migracao } from '../migrador';

// Núcleo do módulo de Análises de Viabilidade (AV): a entidade principal e o motor de etapas
// sequenciais que substitui as 5 flags "liberado" em paralelo do app antigo (Gestão AV).
export const migracao0012: Migracao = {
  versao: 12,
  nome: '0012-avs-nucleo',
  sql: `
    CREATE TABLE etapas_av (
      numero   INTEGER PRIMARY KEY,
      chave    TEXT NOT NULL UNIQUE,
      nome     TEXT NOT NULL,
      area     TEXT CHECK (area IN ('comercial', 'produto', 'processo', 'pcp', 'custo')),
      terminal INTEGER NOT NULL DEFAULT 0
    );

    INSERT INTO etapas_av (numero, chave, nome, area, terminal) VALUES
      (1, 'comercial', 'Comercial — Abertura', 'comercial', 0),
      (2, 'eng_produto', 'Engenharia de Produto', 'produto', 0),
      (3, 'eng_processo', 'Engenharia de Processo', 'processo', 0),
      (4, 'pcp', 'PCP — Capacidade', 'pcp', 0),
      (5, 'mapa_custo', 'Mapa de Custo', 'custo', 0),
      (6, 'proposta_enviada', 'Proposta Enviada', 'comercial', 0),
      (7, 'sd_aberta', 'SD Aberta', 'comercial', 0),
      (8, 'projeto_criado', 'Projeto Criado', NULL, 1),
      (9, 'declinada_cliente', 'Declinada pelo Cliente', NULL, 1),
      (10, 'declinada_empresa', 'Declinada Internamente', NULL, 1);

    CREATE TABLE av (
      id                          TEXT PRIMARY KEY,
      numero                      TEXT NOT NULL UNIQUE,
      sequencial                  INTEGER NOT NULL,
      ano                         INTEGER NOT NULL,
      cliente                     TEXT,
      codigo                      TEXT,
      descricao                   TEXT NOT NULL,
      complexidade                TEXT,
      solicitante                 TEXT,
      prazo_cliente               TEXT,
      desenho_cliente_ref         TEXT,
      contato_comercial           TEXT,
      email_comercial             TEXT,
      fone_comercial              TEXT,
      contato_tecnico             TEXT,
      data_fechamento             TEXT,
      programa                    TEXT,
      volume_anual                INTEGER,
      ano_sop_eop                 TEXT,
      resp_abertura               TEXT,
      linha                       TEXT,
      origem_projeto              TEXT,
      local_entrega               TEXT,
      conceito_logistico          TEXT,
      resp_embalagem              TEXT,
      info_complementar_comercial TEXT,
      etapa_atual                 INTEGER NOT NULL DEFAULT 1 REFERENCES etapas_av(numero),
      membro_comercial            TEXT REFERENCES usuarios(id),
      membro_produto              TEXT REFERENCES usuarios(id),
      membro_processo             TEXT REFERENCES usuarios(id),
      membro_pcp                  TEXT REFERENCES usuarios(id),
      membro_custo                TEXT REFERENCES usuarios(id),
      proposta_enviada            INTEGER NOT NULL DEFAULT 0,
      data_proposta               TEXT,
      cronograma_id               TEXT REFERENCES cronogramas(id),
      criado_por                  TEXT REFERENCES usuarios(id),
      criado_em                   TEXT NOT NULL
    );

    CREATE INDEX idx_av_etapa_atual ON av (etapa_atual);
    CREATE UNIQUE INDEX idx_av_sequencial_por_ano ON av (ano, sequencial);

    CREATE TABLE etapa_historico (
      id         TEXT PRIMARY KEY,
      av_id      TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      etapa_de   INTEGER,
      etapa_para INTEGER NOT NULL,
      usuario_id TEXT REFERENCES usuarios(id),
      comentario TEXT,
      data       TEXT NOT NULL
    );

    CREATE INDEX idx_etapa_historico_av ON etapa_historico (av_id, data);
  `,
};
