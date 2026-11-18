import type { CustosPortfolioDTO } from '@contratos/portfolio.contrato';

// =====================================================================================================
// AV de Item de Portfólio: contas puras (sem React), testadas. Os rótulos com cor ficam em `rotulos.ts`.
// =====================================================================================================

export const CATEGORIAS_DE_CUSTO: { chave: keyof CustosPortfolioDTO; rotulo: string }[] = [
  { chave: 'materiaPrima', rotulo: 'Matéria-prima' },
  { chave: 'insumos', rotulo: 'Outros insumos' },
  { chave: 'embalagem', rotulo: 'Embalagem' },
  { chave: 'processo', rotulo: 'Processo (mão de obra e máquina)' },
];

export const CUSTOS_VAZIOS: CustosPortfolioDTO = { materiaPrima: null, insumos: null, embalagem: null, processo: null };

/**
 * Custo por peça: soma das categorias informadas.
 * @param custos valores por categoria
 * @returns a soma, ou `null` se nenhuma categoria tiver valor
 */
export function custoPorPeca(custos: CustosPortfolioDTO): number | null {
  const valores = CATEGORIAS_DE_CUSTO.map(({ chave }) => custos[chave]).filter((valor): valor is number => valor !== null);
  return valores.length === 0 ? null : valores.reduce((soma, valor) => soma + valor, 0);
}

/**
 * Custos que valem para a cotação: o valor atualizado pelo Custo quando houver; senão, a referência do item.
 * @param referencia custos do item
 * @param novos valores atualizados (vazios = mantém)
 */
export function custosVigentes(referencia: CustosPortfolioDTO, novos: CustosPortfolioDTO): CustosPortfolioDTO {
  return {
    materiaPrima: novos.materiaPrima ?? referencia.materiaPrima,
    insumos: novos.insumos ?? referencia.insumos,
    embalagem: novos.embalagem ?? referencia.embalagem,
    processo: novos.processo ?? referencia.processo,
  };
}

/**
 * Dias desde a última atualização dos custos de referência (para alertar custo antigo).
 * @param data AAAA-MM-DD ou vazio
 * @param hoje data de referência
 * @returns dias inteiros, ou `null` sem data
 */
export function diasDesde(data: string | null, hoje: Date = new Date()): number | null {
  if (!data) return null;
  const [ano, mes, dia] = data.split('-').map(Number);
  const inicio = Date.UTC(ano!, mes! - 1, dia!);
  const fim = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((fim - inicio) / 86_400_000);
}

/** Custos de referência com mais de 6 meses pedem atenção do Custo. */
export const DIAS_PARA_CUSTO_ANTIGO = 180;
