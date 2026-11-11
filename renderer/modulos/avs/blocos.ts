// =====================================================================================================
// Liberação fracionada dos blocos das abas da AV (modo "ênfase", sem travar):
// o primeiro bloco incompleto fica em destaque ("atual"); os já preenchidos ganham selo de completo;
// os seguintes ficam esmaecidos ("pendente") até o anterior ser preenchido — mas continuam editáveis.
// Funções puras (sem React), para serem testadas e reaproveitadas por todas as abas.
// =====================================================================================================

export type EstadoBloco = 'atual' | 'completo' | 'pendente';

/**
 * Estado visual de cada bloco, na ordem da aba.
 * @param completos `true` para cada bloco já preenchido (blocos opcionais devem vir como `true`)
 * @returns `completo` para os preenchidos antes do primeiro incompleto, `atual` para o primeiro incompleto
 *          e `pendente` para tudo o que vem depois dele (mesmo que já preenchido)
 */
export function estadosDosBlocos(completos: readonly boolean[]): EstadoBloco[] {
  const primeiroIncompleto = completos.indexOf(false);
  return completos.map((completo, indice) => {
    if (primeiroIncompleto === -1 || indice < primeiroIncompleto) return completo ? 'completo' : 'atual';
    return indice === primeiroIncompleto ? 'atual' : 'pendente';
  });
}

/** Quantos blocos estão completos na sequência (para o indicador "3 de 5"). */
export function progressoDosBlocos(estados: readonly EstadoBloco[]): { feitos: number; total: number } {
  return { feitos: estados.filter((estado) => estado === 'completo').length, total: estados.length };
}

/** Texto preenchido (ignora espaços). */
export const preenchido = (valor: string | null | undefined): boolean => !!valor && valor.trim() !== '';

/** Todos os campos informados estão preenchidos. */
export const todosPreenchidos = (...valores: (string | null | undefined)[]): boolean => valores.every(preenchido);

/**
 * Tabela opcional: completa se vazia ou se toda linha iniciada (com descrição) tem os campos exigidos.
 * @param linhas linhas da tabela
 * @param iniciada diz se a linha foi começada pelo usuário
 * @param completa diz se a linha começada está completa
 */
export function tabelaOpcionalCompleta<T>(
  linhas: readonly T[],
  iniciada: (linha: T) => boolean,
  completa: (linha: T) => boolean,
): boolean {
  return linhas.filter(iniciada).every(completa);
}

/** Tabela obrigatória: ao menos uma linha completa e nenhuma linha iniciada pela metade. */
export function tabelaObrigatoriaCompleta<T>(
  linhas: readonly T[],
  iniciada: (linha: T) => boolean,
  completa: (linha: T) => boolean,
): boolean {
  const iniciadas = linhas.filter(iniciada);
  return iniciadas.length > 0 && iniciadas.every(completa);
}

/** Investimentos: toda linha com descrição precisa de classificação e valor (0 é um valor válido). */
export function investimentosCompletos(
  linhas: readonly { descricao: string; classificacao: string; valor: string }[],
): boolean {
  return tabelaOpcionalCompleta(
    linhas,
    (linha) => preenchido(linha.descricao),
    (linha) => preenchido(linha.classificacao) && preenchido(linha.valor),
  );
}
