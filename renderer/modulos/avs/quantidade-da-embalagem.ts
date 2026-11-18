// Funções puras (sem React) da embalagem na estrutura do produto: peças por embalagem → quantidade 1/peças.

/**
 * Converte o texto de peças por embalagem em peças válidas.
 * @param texto o que foi digitado
 * @returns o inteiro ≥ 1, ou `null` se vazio/inválido
 */
export function pecasValidas(texto: string): number | null {
  const valor = Number(texto);
  return texto.trim() !== '' && Number.isInteger(valor) && valor >= 1 ? valor : null;
}

/**
 * Quantidade da embalagem na estrutura (1/peças) como texto do formulário.
 * @param pecasPorEmbalagem texto digitado (ex.: "50")
 * @returns "0.02" para 50 peças; "" se as peças forem inválidas
 */
export function quantidadeDasPecas(pecasPorEmbalagem: string): string {
  const pecas = pecasValidas(pecasPorEmbalagem);
  return pecas === null ? '' : String(1 / pecas);
}

/**
 * Quantidade para leitura, em pt-BR e com até 6 casas (1/30 → "0,033333").
 * @param quantidade texto numérico do formulário
 * @returns o número formatado, ou "" se vazio/inválido
 */
export function formatarQuantidade(quantidade: string): string {
  const valor = Number(quantidade);
  return quantidade.trim() === '' || !Number.isFinite(valor)
    ? ''
    : valor.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
}
