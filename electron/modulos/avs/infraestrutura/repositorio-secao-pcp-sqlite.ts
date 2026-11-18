import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
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
  carga_atual: number | null;
  carga_futura: number | null;
}

interface LinhaCusto {
  id: string;
  av_id: string;
  ordem: number;
  descricao: string;
  valor: number | null;
}

export class RepositorioSecaoPcpSqlite implements RepositorioSecaoPcp {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      obterSecao: db.prepare<[string], LinhaSecaoPcp>('SELECT * FROM av_secao_pcp WHERE av_id = ?'),
      listarCargas: db.prepare<[string], LinhaCarga>('SELECT * FROM av_pcp_cargas WHERE av_id = ? ORDER BY ordem'),
      listarCustos: db.prepare<[string], LinhaCusto>('SELECT * FROM av_pcp_custos WHERE av_id = ? ORDER BY ordem'),
      salvarSecao: db.prepare<[LinhaSecaoPcp]>(`
        INSERT INTO av_secao_pcp (av_id, observacoes, atualizado_em, atualizado_por)
        VALUES (@av_id, @observacoes, @atualizado_em, @atualizado_por)
        ON CONFLICT (av_id) DO UPDATE SET
          observacoes    = excluded.observacoes,
          atualizado_em  = excluded.atualizado_em,
          atualizado_por = excluded.atualizado_por
      `),
      excluirCargas: db.prepare<[string]>('DELETE FROM av_pcp_cargas WHERE av_id = ?'),
      inserirCarga: db.prepare<[LinhaCarga]>(`
        INSERT INTO av_pcp_cargas (id, av_id, ordem, operacao, maquina, pecas_hora, carga_atual, carga_futura)
        VALUES (@id, @av_id, @ordem, @operacao, @maquina, @pecas_hora, @carga_atual, @carga_futura)
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
          carga_atual: carga.cargaAtual,
          carga_futura: carga.cargaFutura,
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
    cargaAtual: linha.carga_atual,
    cargaFutura: linha.carga_futura,
  };
}

function paraCusto(linha: LinhaCusto): CustoLogistico {
  return { id: linha.id, avId: linha.av_id, ordem: linha.ordem, descricao: linha.descricao, valor: linha.valor };
}
