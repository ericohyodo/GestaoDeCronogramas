/** Linha da tabela "Mão de obra por processo" do Mapa de Custo e a regra do custo total automático. */
export interface LinhaProcessoEditavel {
  chave: string;
  processo: string;
  maquina: string;
  pecasHora: string;
  qtdeColaboradores: string;
  taxaMod: string;
  taxaMoi: string;
  taxaGgf: string;
  custoTotal: string;
  /** `true` quando o custo foi digitado à mão; senão ele acompanha o cálculo automático. Não é gravado. */
  custoManual: boolean;
}

/**
 * Custo automático da operação por peça: (taxa MOD + taxa MOI + taxa GGF) ÷ peças por hora. Sem peças/hora
 * (ou sem nenhuma taxa) não há como calcular e o resultado é vazio.
 */
export function custoAutomatico(
  linha: Pick<LinhaProcessoEditavel, 'taxaMod' | 'taxaMoi' | 'taxaGgf' | 'pecasHora'>,
): string {
  const taxas = [linha.taxaMod, linha.taxaMoi, linha.taxaGgf];
  const pecasPorHora = Number(linha.pecasHora);
  if (taxas.every((taxa) => taxa.trim() === '') || !(pecasPorHora > 0)) return '';
  const somaDasTaxas = taxas.reduce((total, taxa) => total + (Number(taxa) || 0), 0);
  return String(Math.round((somaDasTaxas / pecasPorHora) * 10_000) / 10_000);
}

/** Um custo salvo diferente do cálculo automático foi digitado à mão e deve ser mantido assim. */
export function custoEhManual(linha: Omit<LinhaProcessoEditavel, 'custoManual'>): boolean {
  if (linha.custoTotal.trim() === '') return false;
  return Math.abs(Number(linha.custoTotal) - Number(custoAutomatico(linha) || 0)) > 0.00005;
}

/**
 * Altera um campo da linha. O custo total segue o cálculo automático enquanto não for editado; ao digitar
 * nele passa a valer o valor digitado, e apagá-lo devolve o cálculo automático.
 */
export function alterarLinhaProcesso(
  linha: LinhaProcessoEditavel,
  campo: keyof LinhaProcessoEditavel,
  valor: string,
): LinhaProcessoEditavel {
  const proxima = { ...linha, [campo]: valor } as LinhaProcessoEditavel;
  if (campo === 'custoTotal') proxima.custoManual = valor.trim() !== '';
  const afetaOCalculo = ['custoTotal', 'taxaMod', 'taxaMoi', 'taxaGgf', 'pecasHora'].includes(campo);
  if (!proxima.custoManual && afetaOCalculo) proxima.custoTotal = custoAutomatico(proxima);
  return proxima;
}

export function novaLinhaProcesso(chave: string): LinhaProcessoEditavel {
  return {
    chave,
    processo: '',
    maquina: '',
    pecasHora: '',
    qtdeColaboradores: '',
    taxaMod: '',
    taxaMoi: '',
    taxaGgf: '',
    custoTotal: '',
    custoManual: false,
  };
}
