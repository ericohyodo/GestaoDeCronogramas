import type { Migracao } from '../migrador';

// Mapa de Custo da AV, baseado no rascunho da planilha usada hoje pelo Financeiro da Ferkoda:
// 3 blocos de itens de material (matéria-prima / outros insumos / embalagem) e um bloco de
// custo de mão-de-obra por operação (processo + máquina + taxas). Os catálogos de operação e
// máquina são pequenos e estáveis (aba "base processo" da planilha), por isso são seedados aqui;
// o catálogo de ~213 itens de matéria-prima (aba "base MP") não entra — é texto livre, para não
// travar a digitação em um código de ERP que pode ficar desatualizado.
export const migracao0013: Migracao = {
  versao: 13,
  nome: '0013-avs-mapa-de-custo',
  sql: `
    CREATE TABLE av_catalogo_operacoes (
      nome TEXT PRIMARY KEY
    );

    INSERT INTO av_catalogo_operacoes (nome) VALUES
      ('Acabamento'), ('Corte de Fogão'), ('Direto Retrabalho (Seleção)'), ('Esmaltação Líquida'),
      ('Estamparia'), ('Extrusão'), ('Fábrica de Discos'), ('Forjamento'), ('Lavagem Cesto'),
      ('Lavagem Corrente'), ('Sede do Forno'), ('Serra CNC'), ('Solda'), ('Usinagem CNC'),
      ('Usinagem de Bases'), ('Venturi');

    CREATE TABLE av_catalogo_maquinas (
      nome TEXT PRIMARY KEY
    );

    INSERT INTO av_catalogo_maquinas (nome) VALUES
      ('BANCADA CJ SEDE 01'), ('BANCADA CJ SEDE 02'), ('BP-001'), ('BP-002'), ('CABINE-11'),
      ('CABINE-12'), ('CABINE-21'), ('CABINE-22'), ('CABINE-P001'), ('CABINE-P002'),
      ('CABINE-P003'), ('CNC-01'), ('CNC-02'), ('CONECTOR LINHA HIDRÁULICA'),
      ('CRAVAÇÃO PR-051 / PR-052'), ('EMBALAGEM'), ('EMBALAGEM-02'), ('ESMALTAÇÃO'),
      ('ESMALTAÇÃO A PÓ'), ('ESTEIRA ML-03'), ('ESTEIRA TORNO-CNC-002'), ('ESTEIRA TORNO-CNC-003'),
      ('ESTEIRA TORNO-CNC-004'), ('ESTEIRA TORNO-CNC-005'), ('ESTEIRA TORNO-CNC-006'),
      ('FORNO DE FUSÃO'), ('GI-022'), ('JAT-021'), ('JAT-022'), ('LA-018'), ('LA-019'), ('LA-020'),
      ('ME-ESC-CMIST'), ('ME-VED'), ('ML-03'), ('ML-05'), ('MS-002'), ('MS-003'), ('MU-001 (A)'),
      ('MU-001 (B)'), ('MU-002'), ('MU-003'), ('PF-001'), ('PG-002'), ('PG-003'), ('PG-004'),
      ('PG-005'), ('PG-006'), ('PG-007'), ('PR-004'), ('PR-005'), ('PR-013'), ('PR-021'),
      ('PR-032'), ('PR-033'), ('PR-042'), ('PR-044'), ('PR-046'), ('PR-047'), ('PR-053'),
      ('PR-054'), ('PR-055'), ('PR-056'), ('PR-057'), ('PR-058'), ('PR-059'), ('PR-060'),
      ('PR-061'), ('PR-062'), ('PR-063'), ('PR-064'), ('PR-065'), ('PR-066'), ('PR-067'),
      ('PR-068'), ('PR-069'), ('PR-070'), ('PR-071'), ('PR-072'), ('PR-073'), ('PR-074'),
      ('PR-075'), ('PR-076'), ('PR-077'), ('PR-078'), ('PR-079'), ('PR-080'), ('PR-081'),
      ('RO-001'), ('SE-01'), ('SE-02'), ('TC-004'), ('TC-030'), ('TC-031'), ('TC-037'), ('TC-040'),
      ('TC-041'), ('TF-001'), ('TF-040'), ('TORNO-CNC-002'), ('TORNO-CNC-003'), ('TORNO-CNC-004'),
      ('TORNO-CNC-005'), ('TORNO-CNC-006'), ('CALIBRAÇÃO SOLDA');

    CREATE TABLE av_secao_custo (
      av_id         TEXT PRIMARY KEY REFERENCES av(id) ON DELETE CASCADE,
      incoterm      TEXT CHECK (incoterm IN ('EXW','FOB','CIF','DDP','FCA','CPT','CIP','DAT','DAP','FAS','CFR')),
      observacoes   TEXT,
      atualizado_em TEXT,
      atualizado_por TEXT REFERENCES usuarios(id)
    );

    CREATE TABLE av_custo_materiais (
      id             TEXT PRIMARY KEY,
      av_id          TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      secao          TEXT NOT NULL CHECK (secao IN ('materia_prima', 'outros_insumos', 'embalagem')),
      codigo_item    TEXT,
      descricao      TEXT NOT NULL,
      qtde_bruta     REAL,
      qtde_net       REAL,
      unidade_medida TEXT,
      custo_unitario REAL,
      custo_total    REAL,
      ordem          INTEGER NOT NULL
    );

    CREATE INDEX idx_av_custo_materiais ON av_custo_materiais (av_id, secao, ordem);

    CREATE TABLE av_custo_processo (
      id                  TEXT PRIMARY KEY,
      av_id               TEXT NOT NULL REFERENCES av(id) ON DELETE CASCADE,
      ordem               INTEGER NOT NULL,
      processo            TEXT,
      maquina             TEXT,
      pecas_hora          INTEGER,
      qtde_colaboradores  INTEGER,
      taxa_mod            REAL,
      taxa_moi            REAL,
      taxa_ggf            REAL,
      custo_total         REAL
    );

    CREATE INDEX idx_av_custo_processo ON av_custo_processo (av_id, ordem);
  `,
};
