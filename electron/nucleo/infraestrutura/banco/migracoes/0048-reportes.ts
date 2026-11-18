import type { Migracao } from '../migrador';

// Reportes de erro e sugestões enviados pelos usuários (menu lateral → "Reportar erro / sugestão").
// `reportes` guarda o relato; `reporte_imagens`, os prints anexados (arquivos ao lado do banco, em
// `reportes/<id>/`); `reporte_eventos` é o log de alterações: criação, mudanças de status (dar baixa) e
// comentários do administrador, sempre com quem e quando.
export const migracao0048: Migracao = {
  versao: 48,
  nome: '0048-reportes',
  sql: `
    CREATE TABLE reportes (
      id            TEXT PRIMARY KEY,
      numero        INTEGER NOT NULL UNIQUE,
      tipo          TEXT NOT NULL CHECK (tipo IN ('erro', 'sugestao')),
      texto         TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'em_analise', 'resolvido', 'descartado')),
      usuario_id    TEXT REFERENCES usuarios(id),
      rota          TEXT,
      versao_app    TEXT,
      criado_em     TEXT NOT NULL,
      atualizado_em TEXT NOT NULL
    );
    CREATE INDEX idx_reportes_status ON reportes (status, criado_em);

    CREATE TABLE reporte_imagens (
      id              TEXT PRIMARY KEY,
      reporte_id      TEXT NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
      ordem           INTEGER NOT NULL,
      nome_arquivo    TEXT NOT NULL,
      nome_armazenado TEXT NOT NULL,
      tipo_mime       TEXT NOT NULL,
      tamanho_bytes   INTEGER NOT NULL
    );
    CREATE INDEX idx_reporte_imagens_reporte ON reporte_imagens (reporte_id, ordem);

    CREATE TABLE reporte_eventos (
      id          TEXT PRIMARY KEY,
      reporte_id  TEXT NOT NULL REFERENCES reportes(id) ON DELETE CASCADE,
      tipo        TEXT NOT NULL CHECK (tipo IN ('criado', 'status', 'comentario')),
      status_de   TEXT,
      status_para TEXT,
      comentario  TEXT,
      usuario_id  TEXT REFERENCES usuarios(id),
      criado_em   TEXT NOT NULL
    );
    CREATE INDEX idx_reporte_eventos_reporte ON reporte_eventos (reporte_id, criado_em);
  `,
};
