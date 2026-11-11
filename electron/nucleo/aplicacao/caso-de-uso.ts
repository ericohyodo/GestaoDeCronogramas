export interface CasoDeUso<Entrada, Saida> {
  executar(entrada: Entrada): Promise<Saida>;
}

/**
 * Embrulha um caso de uso para que todas as suas gravações aconteçam numa única transação.
 * @param casoDeUso caso de uso a proteger
 * @param unidade unidade de trabalho (transação do banco)
 * @returns o mesmo contrato `CasoDeUso`, agora atômico
 */
export function transacional<Entrada, Saida>(
  casoDeUso: CasoDeUso<Entrada, Saida>,
  unidade: { executar<T>(trabalho: () => Promise<T>): Promise<T> },
): CasoDeUso<Entrada, Saida> {
  return { executar: (entrada) => unidade.executar(() => casoDeUso.executar(entrada)) };
}
