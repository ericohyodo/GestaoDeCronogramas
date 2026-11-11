import type { Migracao } from '../migrador';

// Ponto de corte do uso multiusuário (publicação em produção, 11/11/2026 às 14h de Brasília): AVs, SDs e
// projetos criados antes disso viram "histórico". Continuam editáveis, mas ficam à parte (aba própria) e fora
// dos contadores, dos avisos de prazo e da IA. O número ganha o prefixo "H-" (H-AV 26-028) e a numeração do
// uso real recomeça em AV 26-001, porque o índice único de (ano, sequencial) passa a valer só fora do
// histórico.
export const migracao0042: Migracao = {
  versao: 42,
  nome: '0042-historico-antes-do-multiusuario',
  sql: `
    ALTER TABLE av ADD COLUMN historico INTEGER NOT NULL DEFAULT 0 CHECK (historico IN (0, 1));
    ALTER TABLE sd ADD COLUMN historico INTEGER NOT NULL DEFAULT 0 CHECK (historico IN (0, 1));
    ALTER TABLE cronogramas ADD COLUMN historico INTEGER NOT NULL DEFAULT 0 CHECK (historico IN (0, 1));

    UPDATE av
       SET historico = 1,
           numero = CASE WHEN numero LIKE 'H-%' THEN numero ELSE 'H-' || numero END
     WHERE criado_em < '2026-11-11T17:00:00.000Z';

    UPDATE sd
       SET historico = 1,
           numero = CASE WHEN numero LIKE 'H-%' THEN numero ELSE 'H-' || numero END
     WHERE criado_em < '2026-11-11T17:00:00.000Z'
        OR av_id IN (SELECT id FROM av WHERE historico = 1);

    UPDATE cronogramas
       SET historico = 1,
           codigo = CASE WHEN codigo IS NULL OR codigo LIKE 'H-%' THEN codigo ELSE 'H-' || codigo END
     WHERE criado_em < '2026-11-11T17:00:00.000Z'
        OR sd_id IN (SELECT id FROM sd WHERE historico = 1);

    DROP INDEX idx_av_sequencial_por_ano;
    CREATE UNIQUE INDEX idx_av_sequencial_por_ano ON av (ano, sequencial) WHERE historico = 0;
  `,
};
