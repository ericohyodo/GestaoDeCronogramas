import type { Migracao } from '../migrador';

// Numeração unificada: o código nasce na AV e acompanha a SD e o projeto, no formato AA-SSS
// (ano com 2 dígitos + sequencial do ano com 3): AV 26-001 → SD 26-001 → PRO 26-001.
// AVs e SDs já existentes são renumeradas a partir de ano/sequencial (o número antigo fica no histórico).
// O cronograma passa a guardar o código do projeto e a SD de origem.
export const migracao0031: Migracao = {
  versao: 31,
  nome: '0031-numeracao-unificada',
  sql: `
    INSERT INTO etapa_historico (id, av_id, etapa_de, etapa_para, usuario_id, comentario, data)
    SELECT 'renumeracao-' || id, id, etapa_atual, etapa_atual, NULL,
           'Numeração unificada: ' || numero || ' passou a ser AV ' || printf('%02d', ano % 100) || '-' || printf('%03d', sequencial),
           strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    FROM av;

    UPDATE av SET numero = 'AV ' || printf('%02d', ano % 100) || '-' || printf('%03d', sequencial);

    UPDATE sd SET numero = 'SD ' || (SELECT substr(av.numero, 4) FROM av WHERE av.id = sd.av_id);

    ALTER TABLE cronogramas ADD COLUMN codigo TEXT;
    ALTER TABLE cronogramas ADD COLUMN sd_id TEXT REFERENCES sd(id);
    CREATE UNIQUE INDEX idx_cronogramas_codigo ON cronogramas (codigo) WHERE codigo IS NOT NULL;
    CREATE UNIQUE INDEX idx_cronogramas_sd ON cronogramas (sd_id) WHERE sd_id IS NOT NULL;
  `,
};
