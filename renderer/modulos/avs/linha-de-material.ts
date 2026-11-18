/** Linha editável das tabelas de materiais do Mapa de Custo e a regra do custo total. */
export interface LinhaMaterialEditavel {
  chave: string;
  codigoItem: string;
  descricao: string;
  qtdeBruta: string;
  qtdeNet: string;
  unidadeMedida: string;
  custoUnitario: string;
  custoTotal: string;
}

export function novaLinhaMaterial(chave: string): LinhaMaterialEditavel {
  return {
    chave,
    codigoItem: '',
    descricao: '',
    qtdeBruta: '',
    qtdeNet: '',
    unidadeMedida: '',
    custoUnitario: '',
    custoTotal: '',
  };
}

/**
 * Custo total do item por peça: quantidade bruta × custo unitário. Sem uma das duas não há o que calcular e o
 * custo digitado é mantido.
 */
export function calcularCustoTotal(linha: LinhaMaterialEditavel): LinhaMaterialEditavel {
  if (linha.qtdeBruta.trim() === '' || linha.custoUnitario.trim() === '') return linha;
  const total = Number(linha.qtdeBruta) * Number(linha.custoUnitario);
  if (!Number.isFinite(total)) return linha;
  return { ...linha, custoTotal: String(Math.round(total * 10_000) / 10_000) };
}
