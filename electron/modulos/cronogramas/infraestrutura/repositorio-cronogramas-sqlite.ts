import { Periodo } from '../../../nucleo/dominio/periodo';
import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import { Cronograma } from '../dominio/cronograma';
import type { RepositorioCronogramas } from '../dominio/repositorio-cronogramas';
import type { SituacaoCronograma } from '../dominio/situacao-cronograma';

interface LinhaCronograma {
  id: string;
  nome: string;
  descricao: string | null;
  data_inicio: string;
  data_fim: string;
  situacao: string;
  criado_em: string;
  atualizado_em: string;
}

export class RepositorioCronogramasSqlite implements RepositorioCronogramas {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      listar: db.prepare<[], LinhaCronograma>(
        'SELECT * FROM cronogramas ORDER BY data_inicio, nome COLLATE NOCASE',
      ),
      obterPorId: db.prepare<[string], LinhaCronograma>('SELECT * FROM cronogramas WHERE id = ?'),
      existe: db.prepare<[string], number>('SELECT 1 FROM cronogramas WHERE id = ?').pluck(),
      salvar: db.prepare<[LinhaCronograma]>(`
        INSERT INTO cronogramas
          (id, nome, descricao, data_inicio, data_fim, situacao, criado_em, atualizado_em)
        VALUES
          (@id, @nome, @descricao, @data_inicio, @data_fim, @situacao, @criado_em, @atualizado_em)
        ON CONFLICT (id) DO UPDATE SET
          nome          = excluded.nome,
          descricao     = excluded.descricao,
          data_inicio   = excluded.data_inicio,
          data_fim      = excluded.data_fim,
          situacao      = excluded.situacao,
          atualizado_em = excluded.atualizado_em
      `),
      excluir: db.prepare<[string]>('DELETE FROM cronogramas WHERE id = ?'),
    };
  }

  async listar(): Promise<Cronograma[]> {
    return this.sql.listar.all().map(paraEntidade);
  }

  async obterPorId(id: string): Promise<Cronograma | null> {
    const linha = this.sql.obterPorId.get(id);
    return linha ? paraEntidade(linha) : null;
  }

  async existe(id: string): Promise<boolean> {
    return this.sql.existe.get(id) !== undefined;
  }

  async salvar(cronograma: Cronograma): Promise<void> {
    this.sql.salvar.run(paraLinha(cronograma));
  }

  async excluir(id: string): Promise<void> {
    this.sql.excluir.run(id);
  }
}

function paraEntidade(linha: LinhaCronograma): Cronograma {
  return Cronograma.reconstituir({
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao,
    periodo: Periodo.criar(linha.data_inicio, linha.data_fim),
    situacao: linha.situacao as SituacaoCronograma,
    criadoEm: new Date(linha.criado_em),
    atualizadoEm: new Date(linha.atualizado_em),
  });
}

function paraLinha(cronograma: Cronograma): LinhaCronograma {
  return {
    id: cronograma.id,
    nome: cronograma.nome,
    descricao: cronograma.descricao,
    data_inicio: cronograma.periodo.inicio,
    data_fim: cronograma.periodo.fim,
    situacao: cronograma.situacao,
    criado_em: cronograma.criadoEm.toISOString(),
    atualizado_em: cronograma.atualizadoEm.toISOString(),
  };
}
