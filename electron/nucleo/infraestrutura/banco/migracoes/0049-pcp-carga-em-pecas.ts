import type { Migracao } from '../migrador';

// Carga de máquina do PCP passa de percentual de ocupação para peças por mês:
// - `carga_atual_pecas`: o que a operação produz hoje por mês, na unidade da operação (ex.: placas na fundição);
// - `conversao`: quantas peças do produto final saem de uma unidade da operação (1 = mesma unidade).
// A carga futura não é gravada: sai do volume anual da AV (÷ 12 ÷ conversão) na hora de exibir. As colunas
// antigas em % (`carga_atual`, `carga_futura`) ficam como legado e deixam de ser lidas.
// `av_capacidade_config` (linha única) guarda as horas por turno e os dias produtivos por mês usados no
// cálculo de turnos; o administrador ajusta em Configurações.
export const migracao0049: Migracao = {
  versao: 49,
  nome: '0049-pcp-carga-em-pecas',
  sql: `
    ALTER TABLE av_pcp_cargas ADD COLUMN carga_atual_pecas REAL CHECK (carga_atual_pecas IS NULL OR carga_atual_pecas >= 0);
    ALTER TABLE av_pcp_cargas ADD COLUMN conversao REAL NOT NULL DEFAULT 1 CHECK (conversao > 0);

    CREATE TABLE av_capacidade_config (
      id                  INTEGER PRIMARY KEY CHECK (id = 1),
      horas_por_turno     REAL NOT NULL CHECK (horas_por_turno > 0 AND horas_por_turno <= 24),
      dias_produtivos_mes INTEGER NOT NULL CHECK (dias_produtivos_mes BETWEEN 1 AND 31),
      atualizado_em       TEXT NOT NULL,
      atualizado_por      TEXT REFERENCES usuarios(id)
    );
    INSERT INTO av_capacidade_config (id, horas_por_turno, dias_produtivos_mes, atualizado_em)
    VALUES (1, 8, 22, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  `,
};
