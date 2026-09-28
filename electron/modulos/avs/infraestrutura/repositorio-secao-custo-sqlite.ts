import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { DadosSecaoCusto, RepositorioSecaoCusto } from '../dominio/repositorio-secao-custo';
import type {
  Incoterm,
  ItemCustoMaterial,
  ItemCustoProcesso,
  SecaoCusto,
  SecaoCustoMaterial,
} from '../dominio/secao-custo';

interface LinhaSecaoCusto {
  av_id: string;
  incoterm: Incoterm | null;
  observacoes: string | null;
  atualizado_em: string | null;
  atualizado_por: string | null;
}

interface LinhaItemMaterial {
  id: string;
  av_id: string;
  secao: SecaoCustoMaterial;
  codigo_item: string | null;
  descricao: string;
  qtde_bruta: number | null;
  qtde_net: number | null;
  unidade_medida: string | null;
  custo_unitario: number | null;
  custo_total: number | null;
  ordem: number;
}

interface LinhaItemProcesso {
  id: string;
  av_id: string;
  ordem: number;
  processo: string | null;
  maquina: string | null;
  pecas_hora: number | null;
  qtde_colaboradores: number | null;
  taxa_mod: number | null;
  taxa_moi: number | null;
  taxa_ggf: number | null;
  custo_total: number | null;
}

export class RepositorioSecaoCustoSqlite implements RepositorioSecaoCusto {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      obterSecao: db.prepare<[string], LinhaSecaoCusto>('SELECT * FROM av_secao_custo WHERE av_id = ?'),
      listarMateriais: db.prepare<[string], LinhaItemMaterial>(
        'SELECT * FROM av_custo_materiais WHERE av_id = ? ORDER BY secao, ordem',
      ),
      listarProcesso: db.prepare<[string], LinhaItemProcesso>(
        'SELECT * FROM av_custo_processo WHERE av_id = ? ORDER BY ordem',
      ),
      salvarSecao: db.prepare<[LinhaSecaoCusto]>(`
        INSERT INTO av_secao_custo (av_id, incoterm, observacoes, atualizado_em, atualizado_por)
        VALUES (@av_id, @incoterm, @observacoes, @atualizado_em, @atualizado_por)
        ON CONFLICT (av_id) DO UPDATE SET
          incoterm       = excluded.incoterm,
          observacoes    = excluded.observacoes,
          atualizado_em  = excluded.atualizado_em,
          atualizado_por = excluded.atualizado_por
      `),
      excluirMateriais: db.prepare<[string]>('DELETE FROM av_custo_materiais WHERE av_id = ?'),
      excluirProcesso: db.prepare<[string]>('DELETE FROM av_custo_processo WHERE av_id = ?'),
      inserirMaterial: db.prepare<[LinhaItemMaterial]>(`
        INSERT INTO av_custo_materiais (
          id, av_id, secao, codigo_item, descricao, qtde_bruta, qtde_net, unidade_medida,
          custo_unitario, custo_total, ordem
        ) VALUES (
          @id, @av_id, @secao, @codigo_item, @descricao, @qtde_bruta, @qtde_net, @unidade_medida,
          @custo_unitario, @custo_total, @ordem
        )
      `),
      inserirProcesso: db.prepare<[LinhaItemProcesso]>(`
        INSERT INTO av_custo_processo (
          id, av_id, ordem, processo, maquina, pecas_hora, qtde_colaboradores, taxa_mod, taxa_moi,
          taxa_ggf, custo_total
        ) VALUES (
          @id, @av_id, @ordem, @processo, @maquina, @pecas_hora, @qtde_colaboradores, @taxa_mod,
          @taxa_moi, @taxa_ggf, @custo_total
        )
      `),
    };
  }

  async obter(avId: string): Promise<DadosSecaoCusto | null> {
    const linhaSecao = this.sql.obterSecao.get(avId);
    if (!linhaSecao) return null;

    return {
      secao: paraSecaoEntidade(linhaSecao),
      materiais: this.sql.listarMateriais.all(avId).map(paraMaterialEntidade),
      processo: this.sql.listarProcesso.all(avId).map(paraProcessoEntidade),
    };
  }

  async salvar(dados: DadosSecaoCusto): Promise<void> {
    const avId = dados.secao.avId;
    this.db.transaction(() => {
      this.sql.salvarSecao.run(paraSecaoLinha(dados.secao));
      this.sql.excluirMateriais.run(avId);
      for (const item of dados.materiais) this.sql.inserirMaterial.run(paraMaterialLinha(avId, item));
      this.sql.excluirProcesso.run(avId);
      for (const item of dados.processo) this.sql.inserirProcesso.run(paraProcessoLinha(avId, item));
    })();
  }
}

function paraSecaoEntidade(linha: LinhaSecaoCusto): SecaoCusto {
  return {
    avId: linha.av_id,
    incoterm: linha.incoterm,
    observacoes: linha.observacoes,
    atualizadoEm: linha.atualizado_em ? new Date(linha.atualizado_em) : null,
    atualizadoPor: linha.atualizado_por,
  };
}

function paraSecaoLinha(secao: SecaoCusto): LinhaSecaoCusto {
  return {
    av_id: secao.avId,
    incoterm: secao.incoterm,
    observacoes: secao.observacoes,
    atualizado_em: secao.atualizadoEm ? secao.atualizadoEm.toISOString() : null,
    atualizado_por: secao.atualizadoPor,
  };
}

function paraMaterialEntidade(linha: LinhaItemMaterial): ItemCustoMaterial {
  return {
    id: linha.id,
    secao: linha.secao,
    codigoItem: linha.codigo_item,
    descricao: linha.descricao,
    qtdeBruta: linha.qtde_bruta,
    qtdeNet: linha.qtde_net,
    unidadeMedida: linha.unidade_medida,
    custoUnitario: linha.custo_unitario,
    custoTotal: linha.custo_total,
    ordem: linha.ordem,
  };
}

function paraMaterialLinha(avId: string, item: ItemCustoMaterial): LinhaItemMaterial {
  return {
    id: item.id,
    av_id: avId,
    secao: item.secao,
    codigo_item: item.codigoItem,
    descricao: item.descricao,
    qtde_bruta: item.qtdeBruta,
    qtde_net: item.qtdeNet,
    unidade_medida: item.unidadeMedida,
    custo_unitario: item.custoUnitario,
    custo_total: item.custoTotal,
    ordem: item.ordem,
  };
}

function paraProcessoEntidade(linha: LinhaItemProcesso): ItemCustoProcesso {
  return {
    id: linha.id,
    ordem: linha.ordem,
    processo: linha.processo,
    maquina: linha.maquina,
    pecasHora: linha.pecas_hora,
    qtdeColaboradores: linha.qtde_colaboradores,
    taxaMod: linha.taxa_mod,
    taxaMoi: linha.taxa_moi,
    taxaGgf: linha.taxa_ggf,
    custoTotal: linha.custo_total,
  };
}

function paraProcessoLinha(avId: string, item: ItemCustoProcesso): LinhaItemProcesso {
  return {
    id: item.id,
    av_id: avId,
    ordem: item.ordem,
    processo: item.processo,
    maquina: item.maquina,
    pecas_hora: item.pecasHora,
    qtde_colaboradores: item.qtdeColaboradores,
    taxa_mod: item.taxaMod,
    taxa_moi: item.taxaMoi,
    taxa_ggf: item.taxaGgf,
    custo_total: item.custoTotal,
  };
}
