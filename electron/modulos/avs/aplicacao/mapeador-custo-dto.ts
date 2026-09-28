import type {
  ItemCustoMaterialDTO,
  ItemCustoProcessoDTO,
  SecaoCustoDTO,
} from '@contratos/avs.contrato';
import type { DadosSecaoCusto } from '../dominio/repositorio-secao-custo';
import type { ItemCustoMaterial, ItemCustoProcesso } from '../dominio/secao-custo';

function paraItemMaterialDTO(item: ItemCustoMaterial): ItemCustoMaterialDTO {
  return {
    id: item.id,
    secao: item.secao,
    codigoItem: item.codigoItem,
    descricao: item.descricao,
    qtdeBruta: item.qtdeBruta,
    qtdeNet: item.qtdeNet,
    unidadeMedida: item.unidadeMedida,
    custoUnitario: item.custoUnitario,
    custoTotal: item.custoTotal,
  };
}

function paraItemProcessoDTO(item: ItemCustoProcesso): ItemCustoProcessoDTO {
  return {
    id: item.id,
    processo: item.processo,
    maquina: item.maquina,
    pecasHora: item.pecasHora,
    qtdeColaboradores: item.qtdeColaboradores,
    taxaMod: item.taxaMod,
    taxaMoi: item.taxaMoi,
    taxaGgf: item.taxaGgf,
    custoTotal: item.custoTotal,
  };
}

export function paraSecaoCustoDTO(dados: DadosSecaoCusto | null): SecaoCustoDTO {
  if (!dados) return { incoterm: null, observacoes: null, materiais: [], processo: [], atualizadoEm: null };
  return {
    incoterm: dados.secao.incoterm,
    observacoes: dados.secao.observacoes,
    materiais: dados.materiais.map(paraItemMaterialDTO),
    processo: dados.processo.map(paraItemProcessoDTO),
    atualizadoEm: dados.secao.atualizadoEm ? dados.secao.atualizadoEm.toISOString() : null,
  };
}
