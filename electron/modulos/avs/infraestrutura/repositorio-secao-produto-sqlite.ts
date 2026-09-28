import type { BancoDeDados } from '../../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { AreaInvestimento, ClassificacaoInvestimento, Investimento } from '../dominio/investimento';
import type { DadosSecaoProduto, RepositorioSecaoProduto } from '../dominio/repositorio-secao-produto';
import type { SecaoProduto } from '../dominio/secao-produto';

interface LinhaSecaoProduto {
  av_id: string;
  descritivo_tecnico_existente: number | null;
  descritivo_tecnico_disponivel: number | null;
  desenho_2d_existente: number | null;
  desenho_2d_disponivel: number | null;
  desenho_3d_existente: number | null;
  desenho_3d_disponivel: number | null;
  desenho_interfaces_existente: number | null;
  desenho_interfaces_disponivel: number | null;
  normas_tecnicas_existente: number | null;
  normas_tecnicas_disponivel: number | null;
  requisitos_cliente_existente: number | null;
  requisitos_cliente_disponivel: number | null;
  requisitos_garantia_existente: number | null;
  requisitos_garantia_disponivel: number | null;
  descritivo_tecnico_link: string | null;
  desenho_2d_link: string | null;
  desenho_3d_link: string | null;
  desenho_interfaces_link: string | null;
  normas_tecnicas_link: string | null;
  requisitos_cliente_link: string | null;
  requisitos_garantia_link: string | null;
  escopo_tecnico: string | null;
  riscos_projeto: string | null;
  premissas_projeto: string | null;
  recursos_projeto: string | null;
  restricoes_projeto: string | null;
  info_complementar: string | null;
  prazo_prototipo_dias: number | null;
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

const AREA = 'produto' as const;

export class RepositorioSecaoProdutoSqlite implements RepositorioSecaoProduto {
  private readonly sql;

  constructor(private readonly db: BancoDeDados) {
    this.sql = {
      obterSecao: db.prepare<[string], LinhaSecaoProduto>(
        'SELECT * FROM av_secao_produto WHERE av_id = ?',
      ),
      listarInvestimentos: db.prepare<[string, AreaInvestimento], LinhaInvestimento>(
        'SELECT * FROM av_investimentos WHERE av_id = ? AND area = ? ORDER BY ordem',
      ),
      salvarSecao: db.prepare<[LinhaSecaoProduto]>(`
        INSERT INTO av_secao_produto (
          av_id, descritivo_tecnico_existente, descritivo_tecnico_disponivel, desenho_2d_existente,
          desenho_2d_disponivel, desenho_3d_existente, desenho_3d_disponivel,
          desenho_interfaces_existente, desenho_interfaces_disponivel, normas_tecnicas_existente,
          normas_tecnicas_disponivel, requisitos_cliente_existente, requisitos_cliente_disponivel,
          requisitos_garantia_existente, requisitos_garantia_disponivel,
          descritivo_tecnico_link, desenho_2d_link, desenho_3d_link, desenho_interfaces_link,
          normas_tecnicas_link, requisitos_cliente_link, requisitos_garantia_link, escopo_tecnico,
          riscos_projeto, premissas_projeto, recursos_projeto, restricoes_projeto,
          info_complementar, prazo_prototipo_dias, atualizado_em, atualizado_por
        ) VALUES (
          @av_id, @descritivo_tecnico_existente, @descritivo_tecnico_disponivel, @desenho_2d_existente,
          @desenho_2d_disponivel, @desenho_3d_existente, @desenho_3d_disponivel,
          @desenho_interfaces_existente, @desenho_interfaces_disponivel, @normas_tecnicas_existente,
          @normas_tecnicas_disponivel, @requisitos_cliente_existente, @requisitos_cliente_disponivel,
          @requisitos_garantia_existente, @requisitos_garantia_disponivel,
          @descritivo_tecnico_link, @desenho_2d_link, @desenho_3d_link, @desenho_interfaces_link,
          @normas_tecnicas_link, @requisitos_cliente_link, @requisitos_garantia_link, @escopo_tecnico,
          @riscos_projeto, @premissas_projeto, @recursos_projeto, @restricoes_projeto,
          @info_complementar, @prazo_prototipo_dias, @atualizado_em, @atualizado_por
        )
        ON CONFLICT (av_id) DO UPDATE SET
          descritivo_tecnico_existente  = excluded.descritivo_tecnico_existente,
          descritivo_tecnico_disponivel = excluded.descritivo_tecnico_disponivel,
          desenho_2d_existente          = excluded.desenho_2d_existente,
          desenho_2d_disponivel         = excluded.desenho_2d_disponivel,
          desenho_3d_existente          = excluded.desenho_3d_existente,
          desenho_3d_disponivel         = excluded.desenho_3d_disponivel,
          desenho_interfaces_existente  = excluded.desenho_interfaces_existente,
          desenho_interfaces_disponivel = excluded.desenho_interfaces_disponivel,
          normas_tecnicas_existente     = excluded.normas_tecnicas_existente,
          normas_tecnicas_disponivel    = excluded.normas_tecnicas_disponivel,
          requisitos_cliente_existente  = excluded.requisitos_cliente_existente,
          requisitos_cliente_disponivel = excluded.requisitos_cliente_disponivel,
          requisitos_garantia_existente = excluded.requisitos_garantia_existente,
          requisitos_garantia_disponivel = excluded.requisitos_garantia_disponivel,
          descritivo_tecnico_link  = excluded.descritivo_tecnico_link,
          desenho_2d_link          = excluded.desenho_2d_link,
          desenho_3d_link          = excluded.desenho_3d_link,
          desenho_interfaces_link  = excluded.desenho_interfaces_link,
          normas_tecnicas_link     = excluded.normas_tecnicas_link,
          requisitos_cliente_link  = excluded.requisitos_cliente_link,
          requisitos_garantia_link = excluded.requisitos_garantia_link,
          escopo_tecnico       = excluded.escopo_tecnico,
          riscos_projeto       = excluded.riscos_projeto,
          premissas_projeto    = excluded.premissas_projeto,
          recursos_projeto     = excluded.recursos_projeto,
          restricoes_projeto   = excluded.restricoes_projeto,
          info_complementar    = excluded.info_complementar,
          prazo_prototipo_dias = excluded.prazo_prototipo_dias,
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

  async obter(avId: string): Promise<DadosSecaoProduto | null> {
    const linhaSecao = this.sql.obterSecao.get(avId);
    if (!linhaSecao) return null;

    return {
      secao: paraSecaoEntidade(linhaSecao),
      investimentos: this.sql.listarInvestimentos.all(avId, AREA).map(paraInvestimentoEntidade),
    };
  }

  async salvar(dados: DadosSecaoProduto): Promise<void> {
    const avId = dados.secao.avId;
    this.db.transaction(() => {
      this.sql.salvarSecao.run(paraSecaoLinha(dados.secao));
      this.sql.excluirInvestimentos.run(avId, AREA);
      for (const item of dados.investimentos) {
        this.sql.inserirInvestimento.run(paraInvestimentoLinha(avId, item));
      }
    })();
  }
}

function paraBool(valor: number | null): boolean | null {
  return valor == null ? null : valor === 1;
}

function paraBoolLinha(valor: boolean | null | undefined): number | null {
  return valor == null ? null : valor ? 1 : 0;
}

function paraSecaoEntidade(linha: LinhaSecaoProduto): SecaoProduto {
  return {
    avId: linha.av_id,
    descritivoTecnicoExistente: paraBool(linha.descritivo_tecnico_existente),
    descritivoTecnicoDisponivel: paraBool(linha.descritivo_tecnico_disponivel),
    desenho2dExistente: paraBool(linha.desenho_2d_existente),
    desenho2dDisponivel: paraBool(linha.desenho_2d_disponivel),
    desenho3dExistente: paraBool(linha.desenho_3d_existente),
    desenho3dDisponivel: paraBool(linha.desenho_3d_disponivel),
    desenhoInterfacesExistente: paraBool(linha.desenho_interfaces_existente),
    desenhoInterfacesDisponivel: paraBool(linha.desenho_interfaces_disponivel),
    normasTecnicasExistente: paraBool(linha.normas_tecnicas_existente),
    normasTecnicasDisponivel: paraBool(linha.normas_tecnicas_disponivel),
    requisitosClienteExistente: paraBool(linha.requisitos_cliente_existente),
    requisitosClienteDisponivel: paraBool(linha.requisitos_cliente_disponivel),
    requisitosGarantiaExistente: paraBool(linha.requisitos_garantia_existente),
    requisitosGarantiaDisponivel: paraBool(linha.requisitos_garantia_disponivel),
    descritivoTecnicoLink: linha.descritivo_tecnico_link,
    desenho2dLink: linha.desenho_2d_link,
    desenho3dLink: linha.desenho_3d_link,
    desenhoInterfacesLink: linha.desenho_interfaces_link,
    normasTecnicasLink: linha.normas_tecnicas_link,
    requisitosClienteLink: linha.requisitos_cliente_link,
    requisitosGarantiaLink: linha.requisitos_garantia_link,
    escopoTecnico: linha.escopo_tecnico,
    riscosProjeto: linha.riscos_projeto,
    premissasProjeto: linha.premissas_projeto,
    recursosProjeto: linha.recursos_projeto,
    restricoesProjeto: linha.restricoes_projeto,
    infoComplementar: linha.info_complementar,
    prazoPrototipoDias: linha.prazo_prototipo_dias,
    atualizadoEm: linha.atualizado_em ? new Date(linha.atualizado_em) : null,
    atualizadoPor: linha.atualizado_por,
  };
}

function paraSecaoLinha(secao: SecaoProduto): LinhaSecaoProduto {
  return {
    av_id: secao.avId,
    descritivo_tecnico_existente: paraBoolLinha(secao.descritivoTecnicoExistente),
    descritivo_tecnico_disponivel: paraBoolLinha(secao.descritivoTecnicoDisponivel),
    desenho_2d_existente: paraBoolLinha(secao.desenho2dExistente),
    desenho_2d_disponivel: paraBoolLinha(secao.desenho2dDisponivel),
    desenho_3d_existente: paraBoolLinha(secao.desenho3dExistente),
    desenho_3d_disponivel: paraBoolLinha(secao.desenho3dDisponivel),
    desenho_interfaces_existente: paraBoolLinha(secao.desenhoInterfacesExistente),
    desenho_interfaces_disponivel: paraBoolLinha(secao.desenhoInterfacesDisponivel),
    normas_tecnicas_existente: paraBoolLinha(secao.normasTecnicasExistente),
    normas_tecnicas_disponivel: paraBoolLinha(secao.normasTecnicasDisponivel),
    requisitos_cliente_existente: paraBoolLinha(secao.requisitosClienteExistente),
    requisitos_cliente_disponivel: paraBoolLinha(secao.requisitosClienteDisponivel),
    requisitos_garantia_existente: paraBoolLinha(secao.requisitosGarantiaExistente),
    requisitos_garantia_disponivel: paraBoolLinha(secao.requisitosGarantiaDisponivel),
    descritivo_tecnico_link: secao.descritivoTecnicoLink,
    desenho_2d_link: secao.desenho2dLink,
    desenho_3d_link: secao.desenho3dLink,
    desenho_interfaces_link: secao.desenhoInterfacesLink,
    normas_tecnicas_link: secao.normasTecnicasLink,
    requisitos_cliente_link: secao.requisitosClienteLink,
    requisitos_garantia_link: secao.requisitosGarantiaLink,
    escopo_tecnico: secao.escopoTecnico,
    riscos_projeto: secao.riscosProjeto,
    premissas_projeto: secao.premissasProjeto,
    recursos_projeto: secao.recursosProjeto,
    restricoes_projeto: secao.restricoesProjeto,
    info_complementar: secao.infoComplementar,
    prazo_prototipo_dias: secao.prazoPrototipoDias,
    atualizado_em: secao.atualizadoEm ? secao.atualizadoEm.toISOString() : null,
    atualizado_por: secao.atualizadoPor,
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
