import type { Migracao } from '../migrador';

// AV de Item de Portfólio: versão light da AV para itens já desenvolvidos (correntes de produção).
//
// - `portfolio_itens` e filhas: cadastro de itens-modelo (templates), editado por gestores e administrador:
//   identificação, revisão do desenho de referência (arquivos em `portfolio_anexos`), estrutura do produto,
//   operações com pçs/hora e custos de referência por peça, com a data da última atualização.
// - `av.tipo` separa a AV completa da de portfólio; as duas dividem a mesma numeração (AV AA-SSS).
//   `av.item_portfolio_id` aponta o item escolhido na abertura.
// - Etapa 11 "Concluída (portfólio)": a AV de portfólio termina na proposta, sem SD.
// - `av_portfolio_checagens`: a conclusão de cada área (confere, com ressalvas, não confere) e a observação.
// - `av_portfolio_custos`: foto dos custos de referência no momento da checagem e os valores atualizados.
export const migracao0050: Migracao = {
  versao: 50,
  nome: '0050-av-portfolio',
  sql: `
    CREATE TABLE portfolio_itens (
      id                    TEXT PRIMARY KEY,
      codigo                TEXT NOT NULL UNIQUE COLLATE NOCASE,
      descricao             TEXT NOT NULL,
      cliente               TEXT,
      linha                 TEXT,
      familia               TEXT,
      programa              TEXT,
      revisao_desenho       TEXT,
      custo_materia_prima   REAL CHECK (custo_materia_prima IS NULL OR custo_materia_prima >= 0),
      custo_insumos         REAL CHECK (custo_insumos IS NULL OR custo_insumos >= 0),
      custo_embalagem       REAL CHECK (custo_embalagem IS NULL OR custo_embalagem >= 0),
      custo_processo        REAL CHECK (custo_processo IS NULL OR custo_processo >= 0),
      custos_atualizados_em TEXT,
      observacoes           TEXT,
      ativo                 INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
      criado_em             TEXT NOT NULL,
      criado_por            TEXT REFERENCES usuarios(id),
      atualizado_em         TEXT NOT NULL,
      atualizado_por        TEXT REFERENCES usuarios(id)
    );

    CREATE TABLE portfolio_estrutura (
      id                  TEXT PRIMARY KEY,
      item_id             TEXT NOT NULL REFERENCES portfolio_itens(id) ON DELETE CASCADE,
      pai_id              TEXT REFERENCES portfolio_estrutura(id) ON DELETE CASCADE,
      ordem               INTEGER NOT NULL,
      tipo                TEXT NOT NULL CHECK (tipo IN ('conjunto', 'componente', 'materia_prima', 'embalagem', 'insumo')),
      codigo              TEXT,
      descricao           TEXT NOT NULL,
      quantidade          REAL,
      unidade             TEXT,
      pecas_por_embalagem INTEGER CHECK (pecas_por_embalagem IS NULL OR pecas_por_embalagem >= 1)
    );
    CREATE INDEX idx_portfolio_estrutura_item ON portfolio_estrutura (item_id, ordem);

    CREATE TABLE portfolio_operacoes (
      id         TEXT PRIMARY KEY,
      item_id    TEXT NOT NULL REFERENCES portfolio_itens(id) ON DELETE CASCADE,
      ordem      INTEGER NOT NULL,
      descricao  TEXT NOT NULL,
      maquina    TEXT,
      pecas_hora REAL CHECK (pecas_hora IS NULL OR pecas_hora >= 0)
    );
    CREATE INDEX idx_portfolio_operacoes_item ON portfolio_operacoes (item_id, ordem);

    CREATE TABLE portfolio_anexos (
      id              TEXT PRIMARY KEY,
      item_id         TEXT NOT NULL REFERENCES portfolio_itens(id) ON DELETE CASCADE,
      nome_arquivo    TEXT NOT NULL,
      nome_armazenado TEXT NOT NULL,
      tipo_mime       TEXT,
      tamanho_bytes   INTEGER NOT NULL,
      usuario_id      TEXT REFERENCES usuarios(id),
      criado_em       TEXT NOT NULL
    );
    CREATE INDEX idx_portfolio_anexos_item ON portfolio_anexos (item_id);

    ALTER TABLE av ADD COLUMN tipo TEXT NOT NULL DEFAULT 'completa' CHECK (tipo IN ('completa', 'portfolio'));
    ALTER TABLE av ADD COLUMN item_portfolio_id TEXT REFERENCES portfolio_itens(id);

    INSERT INTO etapas_av (numero, chave, nome, area, terminal) VALUES
      (11, 'portfolio_concluida', 'Concluída (portfólio)', NULL, 1);

    CREATE TABLE av_portfolio_checagens (
      av_id          TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      area           TEXT NOT NULL CHECK (area IN ('produto', 'processo', 'pcp', 'custo')),
      resultado      TEXT NOT NULL CHECK (resultado IN ('confere', 'ressalvas', 'diverge')),
      observacao     TEXT,
      atualizado_em  TEXT NOT NULL,
      atualizado_por TEXT REFERENCES usuarios(id),
      PRIMARY KEY (av_id, area)
    );

    CREATE TABLE av_portfolio_custos (
      av_id               TEXT PRIMARY KEY REFERENCES av(id) ON DELETE CASCADE,
      ref_materia_prima   REAL,
      ref_insumos         REAL,
      ref_embalagem       REAL,
      ref_processo        REAL,
      ref_atualizados_em  TEXT,
      novo_materia_prima  REAL CHECK (novo_materia_prima IS NULL OR novo_materia_prima >= 0),
      novo_insumos        REAL CHECK (novo_insumos IS NULL OR novo_insumos >= 0),
      novo_embalagem      REAL CHECK (novo_embalagem IS NULL OR novo_embalagem >= 0),
      novo_processo       REAL CHECK (novo_processo IS NULL OR novo_processo >= 0),
      atualizado_em       TEXT NOT NULL,
      atualizado_por      TEXT REFERENCES usuarios(id)
    );
  `,
};
