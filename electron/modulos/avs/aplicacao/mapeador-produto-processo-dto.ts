import type { InvestimentoDTO, SecaoProdutoDTO, SecaoProcessoDTO } from '@contratos/avs.contrato';
import type { Investimento } from '../dominio/investimento';
import type { DadosSecaoProcesso } from '../dominio/repositorio-secao-processo';
import type { DadosSecaoProduto } from '../dominio/repositorio-secao-produto';

function paraInvestimentoDTO(item: Investimento): InvestimentoDTO {
  return { id: item.id, descricao: item.descricao, classificacao: item.classificacao, valor: item.valor };
}

export function paraSecaoProdutoDTO(dados: DadosSecaoProduto | null): SecaoProdutoDTO {
  if (!dados) {
    return {
      descritivoTecnicoExistente: null,
      descritivoTecnicoDisponivel: null,
      desenho2dExistente: null,
      desenho2dDisponivel: null,
      desenho3dExistente: null,
      desenho3dDisponivel: null,
      desenhoInterfacesExistente: null,
      desenhoInterfacesDisponivel: null,
      normasTecnicasExistente: null,
      normasTecnicasDisponivel: null,
      requisitosClienteExistente: null,
      requisitosClienteDisponivel: null,
      requisitosGarantiaExistente: null,
      requisitosGarantiaDisponivel: null,
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
      investimentos: [],
      atualizadoEm: null,
    };
  }

  const { secao } = dados;
  return {
    descritivoTecnicoExistente: secao.descritivoTecnicoExistente,
    descritivoTecnicoDisponivel: secao.descritivoTecnicoDisponivel,
    desenho2dExistente: secao.desenho2dExistente,
    desenho2dDisponivel: secao.desenho2dDisponivel,
    desenho3dExistente: secao.desenho3dExistente,
    desenho3dDisponivel: secao.desenho3dDisponivel,
    desenhoInterfacesExistente: secao.desenhoInterfacesExistente,
    desenhoInterfacesDisponivel: secao.desenhoInterfacesDisponivel,
    normasTecnicasExistente: secao.normasTecnicasExistente,
    normasTecnicasDisponivel: secao.normasTecnicasDisponivel,
    requisitosClienteExistente: secao.requisitosClienteExistente,
    requisitosClienteDisponivel: secao.requisitosClienteDisponivel,
    requisitosGarantiaExistente: secao.requisitosGarantiaExistente,
    requisitosGarantiaDisponivel: secao.requisitosGarantiaDisponivel,
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
    investimentos: dados.investimentos.map(paraInvestimentoDTO),
    atualizadoEm: secao.atualizadoEm ? secao.atualizadoEm.toISOString() : null,
  };
}

export function paraSecaoProcessoDTO(dados: DadosSecaoProcesso | null): SecaoProcessoDTO {
  if (!dados) return { prazoProducaoDias: null, investimentos: [], atualizadoEm: null };
  return {
    prazoProducaoDias: dados.secao.prazoProducaoDias,
    investimentos: dados.investimentos.map(paraInvestimentoDTO),
    atualizadoEm: dados.secao.atualizadoEm ? dados.secao.atualizadoEm.toISOString() : null,
  };
}
