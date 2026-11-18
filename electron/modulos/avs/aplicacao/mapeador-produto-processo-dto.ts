import type { InvestimentoDTO, OperacaoDTO, SecaoProdutoDTO, SecaoProcessoDTO } from '@contratos/avs.contrato';
import type { Investimento } from '../dominio/investimento';
import type { Operacao } from '../dominio/operacao';
import type { DadosSecaoProcesso } from '../dominio/repositorio-secao-processo';
import type { DadosSecaoProduto } from '../dominio/repositorio-secao-produto';

function paraInvestimentoDTO(item: Investimento): InvestimentoDTO {
  return { id: item.id, descricao: item.descricao, classificacao: item.classificacao, valor: item.valor };
}

function paraOperacaoDTO(item: Operacao): OperacaoDTO {
  return { id: item.id, descricao: item.descricao, maquina: item.maquina, pecasHora: item.pecasHora };
}

export function paraSecaoProdutoDTO(dados: DadosSecaoProduto | null, versao: number): SecaoProdutoDTO {
  if (!dados) {
    return {
      descritivoTecnicoExistente: null,
      descritivoTecnicoDisponivel: null,
      descritivoTecnicoNaoAplica: null,
      desenho2dExistente: null,
      desenho2dDisponivel: null,
      desenho2dNaoAplica: null,
      desenho3dExistente: null,
      desenho3dDisponivel: null,
      desenho3dNaoAplica: null,
      desenhoInterfacesExistente: null,
      desenhoInterfacesDisponivel: null,
      desenhoInterfacesNaoAplica: null,
      normasTecnicasExistente: null,
      normasTecnicasDisponivel: null,
      normasTecnicasNaoAplica: null,
      requisitosClienteExistente: null,
      requisitosClienteDisponivel: null,
      requisitosClienteNaoAplica: null,
      requisitosGarantiaExistente: null,
      requisitosGarantiaDisponivel: null,
      requisitosGarantiaNaoAplica: null,
      descritivoTecnicoLink: null,
      desenho2dLink: null,
      desenho3dLink: null,
      desenhoInterfacesLink: null,
      normasTecnicasLink: null,
      requisitosClienteLink: null,
      requisitosGarantiaLink: null,
      escopoTecnico: null,
      riscosProjeto: null,
      premissasProjeto: null,
      recursosProjeto: null,
      restricoesProjeto: null,
      infoComplementar: null,
      prazoPrototipoDias: null,
      complexidade: null,
      estrutura: [],
      investimentos: [],
      atualizadoEm: null,
      versao,
    };
  }

  const { secao } = dados;
  return {
    descritivoTecnicoExistente: secao.descritivoTecnicoExistente,
    descritivoTecnicoDisponivel: secao.descritivoTecnicoDisponivel,
    descritivoTecnicoNaoAplica: secao.descritivoTecnicoNaoAplica,
    desenho2dExistente: secao.desenho2dExistente,
    desenho2dDisponivel: secao.desenho2dDisponivel,
    desenho2dNaoAplica: secao.desenho2dNaoAplica,
    desenho3dExistente: secao.desenho3dExistente,
    desenho3dDisponivel: secao.desenho3dDisponivel,
    desenho3dNaoAplica: secao.desenho3dNaoAplica,
    desenhoInterfacesExistente: secao.desenhoInterfacesExistente,
    desenhoInterfacesDisponivel: secao.desenhoInterfacesDisponivel,
    desenhoInterfacesNaoAplica: secao.desenhoInterfacesNaoAplica,
    normasTecnicasExistente: secao.normasTecnicasExistente,
    normasTecnicasDisponivel: secao.normasTecnicasDisponivel,
    normasTecnicasNaoAplica: secao.normasTecnicasNaoAplica,
    requisitosClienteExistente: secao.requisitosClienteExistente,
    requisitosClienteDisponivel: secao.requisitosClienteDisponivel,
    requisitosClienteNaoAplica: secao.requisitosClienteNaoAplica,
    requisitosGarantiaExistente: secao.requisitosGarantiaExistente,
    requisitosGarantiaDisponivel: secao.requisitosGarantiaDisponivel,
    requisitosGarantiaNaoAplica: secao.requisitosGarantiaNaoAplica,
    descritivoTecnicoLink: secao.descritivoTecnicoLink,
    desenho2dLink: secao.desenho2dLink,
    desenho3dLink: secao.desenho3dLink,
    desenhoInterfacesLink: secao.desenhoInterfacesLink,
    normasTecnicasLink: secao.normasTecnicasLink,
    requisitosClienteLink: secao.requisitosClienteLink,
    requisitosGarantiaLink: secao.requisitosGarantiaLink,
    escopoTecnico: secao.escopoTecnico,
    riscosProjeto: secao.riscosProjeto,
    premissasProjeto: secao.premissasProjeto,
    recursosProjeto: secao.recursosProjeto,
    restricoesProjeto: secao.restricoesProjeto,
    infoComplementar: secao.infoComplementar,
    prazoPrototipoDias: secao.prazoPrototipoDias,
    complexidade: secao.complexidade,
    estrutura: dados.estrutura.map((no) => ({
      id: no.id,
      paiId: no.paiId,
      tipo: no.tipo,
      codigo: no.codigo,
      descricao: no.descricao,
      quantidade: no.quantidade,
      unidade: no.unidade,
      pecasPorEmbalagem: no.pecasPorEmbalagem,
    })),
    investimentos: dados.investimentos.map(paraInvestimentoDTO),
    atualizadoEm: secao.atualizadoEm ? secao.atualizadoEm.toISOString() : null,
    versao,
  };
}

export function paraSecaoProcessoDTO(dados: DadosSecaoProcesso | null, versao: number): SecaoProcessoDTO {
  if (!dados) return { prazoProducaoDias: null, operacoes: [], investimentos: [], atualizadoEm: null, versao };
  return {
    prazoProducaoDias: dados.secao.prazoProducaoDias,
    operacoes: dados.operacoes.map(paraOperacaoDTO),
    investimentos: dados.investimentos.map(paraInvestimentoDTO),
    atualizadoEm: dados.secao.atualizadoEm ? dados.secao.atualizadoEm.toISOString() : null,
    versao,
  };
}
