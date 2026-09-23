import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import { Fase } from '../dominio/fase';
import type { RepositorioFases } from '../dominio/repositorio-fases';

interface LinhaFase {
  id: string;
  cronograma_id: string;
  nome: string;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

export class RepositorioFasesSqlite implements RepositorioFases {
  private readonly sql;
  private readonly atualizarOrdensEmTransacao;

  constructor(db: BancoDeDados) {
    const atualizarOrdem = db.prepare<[number, string]>('UPDATE fases SET ordem = ? WHERE id = ?');
    this.atualizarOrdensEmTransacao = db.transaction((ordens: { id: string; ordem: number }[]) => {
      for (const item of ordens) atualizarOrdem.run(item.ordem, item.id);
    });
    this.sql = {
      listarPorCronograma: db.prepare<[string], LinhaFase>(
        'SELECT * FROM fases WHERE cronograma_id = ? ORDER BY ordem',
      ),
      obterPorId: db.prepare<[string], LinhaFase>('SELECT * FROM fases WHERE id = ?'),
      proximaOrdemDeTopo: db
        .prepare<[string, string], number>(`
          SELECT COALESCE(MAX(ordem), 0) + 1 FROM (
            SELECT ordem FROM fases WHERE cronograma_id = ?
            UNION ALL
            SELECT ordem FROM tarefas WHERE cronograma_id = ? AND fase_id IS NULL
          )
        `)
        .pluck(),
      salvar: db.prepare<[LinhaFase]>(`
        INSERT INTO fases (id, cronograma_id, nome, ordem, criado_em, atualizado_em)
        VALUES (@id, @cronograma_id, @nome, @ordem, @criado_em, @atualizado_em)
        ON CONFLICT (id) DO UPDATE SET
          nome          = excluded.nome,
          ordem         = excluded.ordem,
          atualizado_em = excluded.atualizado_em
      `),
      excluir: db.prepare<[string]>('DELETE FROM fases WHERE id = ?'),
    };
  }

  async listarPorCronograma(cronogramaId: string): Promise<Fase[]> {
    return this.sql.listarPorCronograma.all(cronogramaId).map(paraEntidade);
  }

  async obterPorId(id: string): Promise<Fase | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraEntidade(linha) : null;
  }

  async proximaOrdemDeTopo(cronogramaId: string): Promise<number> {
    return this.sql.proximaOrdemDeTopo.get(cronogramaId, cronogramaId) ?? 1;
  }

  async salvar(fase: Fase): Promise<void> {
    this.sql.salvar.run(paraLinha(fase));
  }

  async excluir(id: string): Promise<void> {
    this.sql.excluir.run(id);
  }

  async atualizarOrdens(ordens: { id: string; ordem: number }[]): Promise<void> {
    if (ordens.length === 0) return;
    this.atualizarOrdensEmTransacao(ordens);
  }
}

function paraEntidade(linha: LinhaFase): Fase {
  return Fase.reconstituir({
    id: linha.id,
    cronogramaId: linha.cronograma_id,
    nome: linha.nome,
    ordem: linha.ordem,
    criadoEm: new Date(linha.criado_em),
    atualizadoEm: new Date(linha.atualizado_em),
  });
}

function paraLinha(fase: Fase): LinhaFase {
  return {
    id: fase.id,
    cronograma_id: fase.cronogramaId,
    nome: fase.nome,
    ordem: fase.ordem,
    criado_em: fase.criadoEm.toISOString(),
    atualizado_em: fase.atualizadoEm.toISOString(),
  };
}
