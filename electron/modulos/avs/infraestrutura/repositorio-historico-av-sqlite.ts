import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { ItemHistoricoAv, RepositorioHistoricoAv } from '../dominio/historico-av';

interface LinhaHistorico {
  id: string;
  av_id: string;
  etapa_de: number | null;
  etapa_para: number;
  usuario_id: string | null;
  comentario: string | null;
  data: string;
}

export class RepositorioHistoricoAvSqlite implements RepositorioHistoricoAv {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      registrar: db.prepare<[LinhaHistorico]>(`
        INSERT INTO etapa_historico (id, av_id, etapa_de, etapa_para, usuario_id, comentario, data)
        VALUES (@id, @av_id, @etapa_de, @etapa_para, @usuario_id, @comentario, @data)
      `),
      listarPorAv: db.prepare<[string], LinhaHistorico>(
        'SELECT * FROM etapa_historico WHERE av_id = ? ORDER BY data DESC',
      ),
    };
  }

  async registrar(item: ItemHistoricoAv): Promise<void> {
    this.sql.registrar.run({
      id: item.id,
      av_id: item.avId,
      etapa_de: item.etapaDe,
      etapa_para: item.etapaPara,
      usuario_id: item.usuarioId,
      comentario: item.comentario,
      data: item.data.toISOString(),
    });
  }

  async listarPorAv(avId: string): Promise<ItemHistoricoAv[]> {
    return this.sql.listarPorAv.all(avId).map((linha) => ({
      id: linha.id,
      avId: linha.av_id,
      etapaDe: linha.etapa_de,
      etapaPara: linha.etapa_para,
      usuarioId: linha.usuario_id,
      comentario: linha.comentario,
      data: new Date(linha.data),
    }));
  }
}
