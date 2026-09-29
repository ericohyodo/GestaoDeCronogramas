import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { AreaInvestimento, ClassificacaoInvestimento, Investimento } from '../dominio/investimento';
import type { Operacao } from '../dominio/operacao';
import type { DadosSecaoProcesso, RepositorioSecaoProcesso } from '../dominio/repositorio-secao-processo';
import type { SecaoProcesso } from '../dominio/secao-processo';

interface LinhaSecaoProcesso {
  av_id: string;
  prazo_producao_dias: number | null;
  atualizado_em: string | null;
  atualizado_por: string | null;
}

interface LinhaInvestimento {
  id: string;
  av_id: string;
  area: AreaInvestimento;
  descricao: string;
  classificacao: ClassificacaoInvestimento | null;
  valor: number | null;
  ordem: number;
}

interface LinhaOperacao {
  id: string;
  av_id: string;
  ordem: number;
  descricao: string;
  maquina: string | null;
  pecas_hora: number | null;
}

const AREA = 'processo' as const;

export class RepositorioSecaoProcessoSqlite implements RepositorioSecaoProcesso {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      obterSecao: db.prepare<[string], LinhaSecaoProcesso>(
        'SELECT * FROM av_secao_processo WHERE av_id = ?',
      ),
      listarInvestimentos: db.prepare<[string, AreaInvestimento], LinhaInvestimento>(
        'SELECT * FROM av_investimentos WHERE av_id = ? AND area = ? ORDER BY ordem',
      ),
      listarOperacoes: db.prepare<[string], LinhaOperacao>(
        'SELECT * FROM av_operacoes WHERE av_id = ? ORDER BY ordem',
      ),
      excluirOperacoes: db.prepare<[string]>('DELETE FROM av_operacoes WHERE av_id = ?'),
      inserirOperacao: db.prepare<[LinhaOperacao]>(`
        INSERT INTO av_operacoes (id, av_id, ordem, descricao, maquina, pecas_hora)
        VALUES (@id, @av_id, @ordem, @descricao, @maquina, @pecas_hora)
      `),
      salvarSecao: db.prepare<[LinhaSecaoProcesso]>(`
        INSERT INTO av_secao_processo (av_id, prazo_producao_dias, atualizado_em, atualizado_por)
        VALUES (@av_id, @prazo_producao_dias, @atualizado_em, @atualizado_por)
        ON CONFLICT (av_id) DO UPDATE SET
          prazo_producao_dias = excluded.prazo_producao_dias,
          atualizado_em        = excluded.atualizado_em,
          atualizado_por       = excluded.atualizado_por
      `),
      excluirInvestimentos: db.prepare<[string, AreaInvestimento]>(
        'DELETE FROM av_investimentos WHERE av_id = ? AND area = ?',
      ),
      inserirInvestimento: db.prepare<[LinhaInvestimento]>(`
        INSERT INTO av_investimentos (id, av_id, area, descricao, classificacao, valor, ordem)
        VALUES (@id, @av_id, @area, @descricao, @classificacao, @valor, @ordem)
      `),
    };
  }

  async obter(avId: string): Promise<DadosSecaoProcesso | null> {
    const linhaSecao = this.sql.obterSecao.get(avId);
    if (!linhaSecao) return null;

    return {
      secao: paraSecaoEntidade(linhaSecao),
      operacoes: this.sql.listarOperacoes.all(avId).map(paraOperacaoEntidade),
      investimentos: this.sql.listarInvestimentos.all(avId, AREA).map(paraInvestimentoEntidade),
    };
  }

  async salvar(dados: DadosSecaoProcesso): Promise<void> {
    const avId = dados.secao.avId;
    this.db.transaction(() => {
      this.sql.salvarSecao.run(paraSecaoLinha(dados.secao));
      this.sql.excluirOperacoes.run(avId);
      for (const item of dados.operacoes) {
        this.sql.inserirOperacao.run({
          id: item.id,
          av_id: avId,
          ordem: item.ordem,
          descricao: item.descricao,
          maquina: item.maquina,
          pecas_hora: item.pecasHora,
        });
      }
      this.sql.excluirInvestimentos.run(avId, AREA);
      for (const item of dados.investimentos) {
        this.sql.inserirInvestimento.run(paraInvestimentoLinha(avId, item));
      }
    })();
  }
}

function paraSecaoEntidade(linha: LinhaSecaoProcesso): SecaoProcesso {
  return {
    avId: linha.av_id,
    prazoProducaoDias: linha.prazo_producao_dias,
    atualizadoEm: linha.atualizado_em ? new Date(linha.atualizado_em) : null,
    atualizadoPor: linha.atualizado_por,
  };
}

function paraSecaoLinha(secao: SecaoProcesso): LinhaSecaoProcesso {
  return {
    av_id: secao.avId,
    prazo_producao_dias: secao.prazoProducaoDias,
    atualizado_em: secao.atualizadoEm ? secao.atualizadoEm.toISOString() : null,
    atualizado_por: secao.atualizadoPor,
  };
}

function paraOperacaoEntidade(linha: LinhaOperacao): Operacao {
  return {
    id: linha.id,
    avId: linha.av_id,
    ordem: linha.ordem,
    descricao: linha.descricao,
    maquina: linha.maquina,
    pecasHora: linha.pecas_hora,
  };
}

function paraInvestimentoEntidade(linha: LinhaInvestimento): Investimento {
  return {
    id: linha.id,
    avId: linha.av_id,
    area: linha.area,
    descricao: linha.descricao,
    classificacao: linha.classificacao,
    valor: linha.valor,
    ordem: linha.ordem,
  };
}

function paraInvestimentoLinha(avId: string, item: Investimento): LinhaInvestimento {
  return {
    id: item.id,
    av_id: avId,
    area: AREA,
    descricao: item.descricao,
    classificacao: item.classificacao,
    valor: item.valor,
    ordem: item.ordem,
  };
}
