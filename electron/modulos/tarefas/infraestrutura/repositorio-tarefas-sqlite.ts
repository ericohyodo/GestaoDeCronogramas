import { Periodo } from '../../../nucleo/dominio/periodo';
import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RepositorioTarefas } from '../dominio/repositorio-tarefas';
import type { SituacaoTarefa } from '../dominio/situacao-tarefa';
import { Tarefa } from '../dominio/tarefa';

interface LinhaTarefa {
  id: string;
  cronograma_id: string;
  fase_id: string | null;
  titulo: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  percentual_concluido: number;
  situacao: string;
  responsavel_id: string | null;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

interface LinhaDependencia {
  tarefa_id: string;
  predecessora_id: string;
}

export class RepositorioTarefasSqlite implements RepositorioTarefas {
  private readonly sql;
  private readonly salvarEmTransacao;
  private readonly salvarVariasEmTransacao;

  constructor(db: BancoDeDados) {
    this.sql = {
      listarPorCronograma: db.prepare<[string], LinhaTarefa>(
        'SELECT * FROM tarefas WHERE cronograma_id = ? ORDER BY ordem',
      ),
      dependenciasDoCronograma: db.prepare<[string], LinhaDependencia>(`
        SELECT d.tarefa_id, d.predecessora_id
        FROM dependencias_tarefas d
        JOIN tarefas t ON t.id = d.tarefa_id
        WHERE t.cronograma_id = ?
      `),
      obterPorId: db.prepare<[string], LinhaTarefa>('SELECT * FROM tarefas WHERE id = ?'),
      dependenciasDaTarefa: db
        .prepare<
          [string],
          string
        >('SELECT predecessora_id FROM dependencias_tarefas WHERE tarefa_id = ?')
        .pluck(),
      proximaOrdemNaFase: db
        .prepare<
          [string, string],
          number
        >('SELECT COALESCE(MAX(ordem), 0) + 1 FROM tarefas WHERE cronograma_id = ? AND fase_id = ?')
        .pluck(),
      // Tarefas soltas dividem a numeração de topo com as fases.
      proximaOrdemDeTopo: db
        .prepare<[string, string], number>(`
          SELECT COALESCE(MAX(ordem), 0) + 1 FROM (
            SELECT ordem FROM tarefas WHERE cronograma_id = ? AND fase_id IS NULL
            UNION ALL
            SELECT ordem FROM fases WHERE cronograma_id = ?
          )
        `)
        .pluck(),
      salvar: db.prepare<[LinhaTarefa]>(`
        INSERT INTO tarefas
          (id, cronograma_id, fase_id, titulo, descricao, data_inicio, data_fim,
           percentual_concluido, situacao, responsavel_id, ordem, criado_em, atualizado_em)
        VALUES
          (@id, @cronograma_id, @fase_id, @titulo, @descricao, @data_inicio, @data_fim,
           @percentual_concluido, @situacao, @responsavel_id, @ordem, @criado_em, @atualizado_em)
        ON CONFLICT (id) DO UPDATE SET
          fase_id              = excluded.fase_id,
          titulo               = excluded.titulo,
          descricao            = excluded.descricao,
          data_inicio          = excluded.data_inicio,
          data_fim             = excluded.data_fim,
          percentual_concluido = excluded.percentual_concluido,
          situacao             = excluded.situacao,
          responsavel_id       = excluded.responsavel_id,
          ordem                = excluded.ordem,
          atualizado_em        = excluded.atualizado_em
      `),
      limparDependencias: db.prepare<[string]>('DELETE FROM dependencias_tarefas WHERE tarefa_id = ?'),
      inserirDependencia: db.prepare<[string, string]>(
        'INSERT OR IGNORE INTO dependencias_tarefas (tarefa_id, predecessora_id) VALUES (?, ?)',
      ),
      excluir: db.prepare<[string]>('DELETE FROM tarefas WHERE id = ?'),
    };

    const gravar = (tarefa: Tarefa) => {
      this.sql.salvar.run(paraLinha(tarefa));
      this.sql.limparDependencias.run(tarefa.id);
      for (const predecessora of tarefa.dependencias) {
        this.sql.inserirDependencia.run(tarefa.id, predecessora);
      }
    };
    this.salvarEmTransacao = db.transaction(gravar);
    this.salvarVariasEmTransacao = db.transaction((tarefas: readonly Tarefa[]) => {
      for (const tarefa of tarefas) gravar(tarefa);
    });
  }

  async listarPorCronograma(cronogramaId: string): Promise<Tarefa[]> {
    const dependencias = new Map<string, string[]>();
    for (const linha of this.sql.dependenciasDoCronograma.all(cronogramaId)) {
      const lista = dependencias.get(linha.tarefa_id) ?? [];
      lista.push(linha.predecessora_id);
      dependencias.set(linha.tarefa_id, lista);
    }
    return this.sql.listarPorCronograma
      .all(cronogramaId)
      .map((linha) => paraEntidade(linha, dependencias.get(linha.id) ?? []));
  }

  async obterPorId(id: string): Promise<Tarefa | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraEntidade(linha, this.sql.dependenciasDaTarefa.all(id)) : null;
  }

  async proximaOrdem(cronogramaId: string, faseId: string | null): Promise<number> {
    return faseId
      ? (this.sql.proximaOrdemNaFase.get(cronogramaId, faseId) ?? 1)
      : (this.sql.proximaOrdemDeTopo.get(cronogramaId, cronogramaId) ?? 1);
  }

  async salvar(tarefa: Tarefa): Promise<void> {
    this.salvarEmTransacao(tarefa);
  }

  async salvarVarias(tarefas: readonly Tarefa[]): Promise<void> {
    if (tarefas.length === 0) return;
    this.salvarVariasEmTransacao(tarefas);
  }

  async excluir(id: string): Promise<void> {
    this.sql.excluir.run(id);
  }
}

function paraEntidade(linha: LinhaTarefa, dependencias: string[]): Tarefa {
  return Tarefa.reconstituir({
    id: linha.id,
    cronogramaId: linha.cronograma_id,
    faseId: linha.fase_id,
    titulo: linha.titulo,
    descricao: linha.descricao,
    periodo: Periodo.criar(linha.data_inicio, linha.data_fim),
    percentualConcluido: linha.percentual_concluido,
    situacao: linha.situacao as SituacaoTarefa,
    responsavelId: linha.responsavel_id,
    dependencias,
    ordem: linha.ordem,
    criadoEm: new Date(linha.criado_em),
    atualizadoEm: new Date(linha.atualizado_em),
  });
}

function paraLinha(tarefa: Tarefa): LinhaTarefa {
  return {
    id: tarefa.id,
    cronograma_id: tarefa.cronogramaId,
    fase_id: tarefa.faseId,
    titulo: tarefa.titulo,
    descricao: tarefa.descricao,
    data_inicio: tarefa.periodo.inicio,
    data_fim: tarefa.periodo.fim,
    percentual_concluido: tarefa.percentualConcluido,
    situacao: tarefa.situacao,
    responsavel_id: tarefa.responsavelId,
    ordem: tarefa.ordem,
    criado_em: tarefa.criadoEm.toISOString(),
    atualizado_em: tarefa.atualizadoEm.toISOString(),
  };
}
