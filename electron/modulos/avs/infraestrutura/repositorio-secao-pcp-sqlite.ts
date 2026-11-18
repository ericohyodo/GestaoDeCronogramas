import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import { CAPACIDADE_PADRAO, type ConfigCapacidade, type RepositorioConfigCapacidade } from '../dominio/capacidade';
import type {
  CargaMaquina,
  CustoLogistico,
  DadosSecaoPcp,
  RepositorioSecaoPcp,
  SecaoPcp,
} from '../dominio/secao-pcp';

interface LinhaSecaoPcp {
  av_id: string;
  observacoes: string | null;
  layout_sem_alteracoes: number;
  custos_sem_alteracoes: number;
  observacoes_sem_alteracoes: number;
  atualizado_em: string | null;
  atualizado_por: string | null;
}

interface LinhaCarga {
  id: string;
  av_id: string;
  ordem: number;
  operacao: string;
  maquina: string | null;
  pecas_hora: number | null;
  conversao: number;
  carga_atual_pecas: number | null;
}

interface LinhaCusto {
  id: string;
  av_id: string;
  ordem: number;
  descricao: string;
  valor: number | null;
}

/** Horas por turno e dias produtivos por mês (`av_capacidade_config`, linha única; padrão 8 h × 22 dias). */
export class RepositorioConfigCapacidadeSqlite implements RepositorioConfigCapacidade {
  private readonly sql;

  constructor(db: BancoDeDados) {
    this.sql = {
      obter: db.prepare<[], { horas_por_turno: number; dias_produtivos_mes: number }>(
        'SELECT horas_por_turno, dias_produtivos_mes FROM av_capacidade_config WHERE id = 1',
      ),
      salvar: db.prepare<[{ horas: number; dias: number; em: string; por: string }]>(`
        INSERT INTO av_capacidade_config (id, horas_por_turno, dias_produtivos_mes, atualizado_em, atualizado_por)
        VALUES (1, @horas, @dias, @em, @por)
        ON CONFLICT (id) DO UPDATE SET
          horas_por_turno = excluded.horas_por_turno,
          dias_produtivos_mes = excluded.dias_produtivos_mes,
          atualizado_em = excluded.atualizado_em,
          atualizado_por = excluded.atualizado_por
      `),
    };
  }

  async obter(): Promise<ConfigCapacidade> {
    const linha = this.sql.obter.get();
    return linha ? { horasPorTurno: linha.horas_por_turno, diasProdutivosMes: linha.dias_produtivos_mes } : CAPACIDADE_PADRAO;
  }

  async salvar(valores: ConfigCapacidade, usuarioId: string, instante: Date): Promise<void> {
    this.sql.salvar.run({ horas: valores.horasPorTurno, dias: valores.diasProdutivosMes, em: instante.toISOString(), por: usuarioId });
  }
}

export class RepositorioSecaoPcpSqlite implements RepositorioSecaoPcp {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      obterSecao: db.prepare<[string], LinhaSecaoPcp>('SELECT * FROM av_secao_pcp WHERE av_id = ?'),
      // As colunas antigas em % (carga_atual, carga_futura) ficam de fora: legado da 0025.
      listarCargas: db.prepare<[string], LinhaCarga>(
        'SELECT id, av_id, ordem, operacao, maquina, pecas_hora, conversao, carga_atual_pecas FROM av_pcp_cargas WHERE av_id = ? ORDER BY ordem',
      ),
      listarCustos: db.prepare<[string], LinhaCusto>('SELECT * FROM av_pcp_custos WHERE av_id = ? ORDER BY ordem'),
      salvarSecao: db.prepare<[LinhaSecaoPcp]>(`
        INSERT INTO av_secao_pcp (
          av_id, observacoes, layout_sem_alteracoes, custos_sem_alteracoes, observacoes_sem_alteracoes,
          atualizado_em, atualizado_por
        )
        VALUES (
          @av_id, @observacoes, @layout_sem_alteracoes, @custos_sem_alteracoes, @observacoes_sem_alteracoes,
          @atualizado_em, @atualizado_por
        )
        ON CONFLICT (av_id) DO UPDATE SET
          observacoes    = excluded.observacoes,
          layout_sem_alteracoes      = excluded.layout_sem_alteracoes,
          custos_sem_alteracoes      = excluded.custos_sem_alteracoes,
          observacoes_sem_alteracoes = excluded.observacoes_sem_alteracoes,
          atualizado_em  = excluded.atualizado_em,
          atualizado_por = excluded.atualizado_por
      `),
      excluirCargas: db.prepare<[string]>('DELETE FROM av_pcp_cargas WHERE av_id = ?'),
      inserirCarga: db.prepare<[LinhaCarga]>(`
        INSERT INTO av_pcp_cargas (id, av_id, ordem, operacao, maquina, pecas_hora, conversao, carga_atual_pecas)
        VALUES (@id, @av_id, @ordem, @operacao, @maquina, @pecas_hora, @conversao, @carga_atual_pecas)
      `),
      excluirCustos: db.prepare<[string]>('DELETE FROM av_pcp_custos WHERE av_id = ?'),
      inserirCusto: db.prepare<[LinhaCusto]>(`
        INSERT INTO av_pcp_custos (id, av_id, ordem, descricao, valor)
        VALUES (@id, @av_id, @ordem, @descricao, @valor)
      `),
    };
  }

  async obter(avId: string): Promise<DadosSecaoPcp | null> {
    const linha = this.sql.obterSecao.get(avId);
    if (!linha) return null;
    return {
      secao: paraSecao(linha),
      cargas: this.sql.listarCargas.all(avId).map(paraCarga),
      custos: this.sql.listarCustos.all(avId).map(paraCusto),
    };
  }

  async salvar(dados: DadosSecaoPcp): Promise<void> {
    const avId = dados.secao.avId;
    this.db.transaction(() => {
      this.sql.salvarSecao.run({
        av_id: avId,
        observacoes: dados.secao.observacoes,
        layout_sem_alteracoes: dados.secao.layoutSemAlteracoes ? 1 : 0,
        custos_sem_alteracoes: dados.secao.custosSemAlteracoes ? 1 : 0,
        observacoes_sem_alteracoes: dados.secao.observacoesSemAlteracoes ? 1 : 0,
        atualizado_em: dados.secao.atualizadoEm ? dados.secao.atualizadoEm.toISOString() : null,
        atualizado_por: dados.secao.atualizadoPor,
      });
      this.sql.excluirCargas.run(avId);
      for (const carga of dados.cargas) {
        this.sql.inserirCarga.run({
          id: carga.id,
          av_id: avId,
          ordem: carga.ordem,
          operacao: carga.operacao,
          maquina: carga.maquina,
          pecas_hora: carga.pecasHora,
          conversao: carga.conversao,
          carga_atual_pecas: carga.cargaAtualPecas,
        });
      }
      this.sql.excluirCustos.run(avId);
      for (const custo of dados.custos) {
        this.sql.inserirCusto.run({
          id: custo.id,
          av_id: avId,
          ordem: custo.ordem,
          descricao: custo.descricao,
          valor: custo.valor,
        });
      }
    })();
  }
}

function paraSecao(linha: LinhaSecaoPcp): SecaoPcp {
  return {
    avId: linha.av_id,
    observacoes: linha.observacoes,
    layoutSemAlteracoes: linha.layout_sem_alteracoes === 1,
    custosSemAlteracoes: linha.custos_sem_alteracoes === 1,
    observacoesSemAlteracoes: linha.observacoes_sem_alteracoes === 1,
    atualizadoEm: linha.atualizado_em ? new Date(linha.atualizado_em) : null,
    atualizadoPor: linha.atualizado_por,
  };
}

function paraCarga(linha: LinhaCarga): CargaMaquina {
  return {
    id: linha.id,
    avId: linha.av_id,
    ordem: linha.ordem,
    operacao: linha.operacao,
    maquina: linha.maquina,
    pecasHora: linha.pecas_hora,
    conversao: linha.conversao,
    cargaAtualPecas: linha.carga_atual_pecas,
  };
}

function paraCusto(linha: LinhaCusto): CustoLogistico {
  return { id: linha.id, avId: linha.av_id, ordem: linha.ordem, descricao: linha.descricao, valor: linha.valor };
}
