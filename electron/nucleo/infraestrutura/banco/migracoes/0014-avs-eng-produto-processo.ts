import type { Migracao } from '../migrador';

// Seções de Eng. Produto e Eng. Processo, baseadas no "Formulário de Entrada" real da Ferkoda
// (aba "ENGENHARIA"). A tabela de investimentos é única e compartilhada pelas duas áreas
// (discriminada por `area`), porque a planilha já organiza os mesmos ~18 itens em dois grupos
// (Capex Engenharia x Capex Prod/Manuf) — replicar isso como duas tabelas separadas só duplicaria
// a mesma forma.
export const migracao0014: Migracao = {
  versao: 14,
  nome: '0014-avs-eng-produto-processo',
  sql: `
    CREATE TABLE av_secao_produto (
      av_id                       TEXT PRIMARY KEY REFERENCES av(id) ON DELETE CASCADE,
      descritivo_tecnico_existente  INTEGER,
      descritivo_tecnico_disponivel INTEGER,
      desenho_2d_existente           INTEGER,
      desenho_2d_disponivel          INTEGER,
      desenho_3d_existente           INTEGER,
      desenho_3d_disponivel          INTEGER,
      desenho_interfaces_existente   INTEGER,
      desenho_interfaces_disponivel  INTEGER,
      normas_tecnicas_existente      INTEGER,
      normas_tecnicas_disponivel     INTEGER,
      requisitos_cliente_existente   INTEGER,
      requisitos_cliente_disponivel  INTEGER,
      requisitos_garantia_existente  INTEGER,
      requisitos_garantia_disponivel INTEGER,
      escopo_tecnico       TEXT,
      riscos_projeto       TEXT,
      premissas_projeto    TEXT,
      recursos_projeto     TEXT,
      restricoes_projeto   TEXT,
      info_complementar    TEXT,
      prazo_prototipo_dias INTEGER,
      atualizado_em        TEXT,
      atualizado_por       TEXT REFERENCES usuarios(id)
    );

    CREATE TABLE av_secao_processo (
      av_id               TEXT PRIMARY KEY REFERENCES av(id) ON DELETE CASCADE,
      prazo_producao_dias INTEGER,
      atualizado_em       TEXT,
      atualizado_por      TEXT REFERENCES usuarios(id)
    );

    CREATE TABLE av_investimentos (
      id           TEXT PRIMARY KEY,
      av_id        TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      area         TEXT NOT NULL CHECK (area IN ('produto', 'processo')),
      descricao    TEXT NOT NULL,
      classificacao TEXT CHECK (classificacao IN ('capex', 'suporte_desenvolvimento', 'sup_des_ou_cliente', 'cliente')),
      valor        REAL,
      ordem        INTEGER NOT NULL
    );

    CREATE INDEX idx_av_investimentos ON av_investimentos (av_id, area, ordem);
  `,
};
