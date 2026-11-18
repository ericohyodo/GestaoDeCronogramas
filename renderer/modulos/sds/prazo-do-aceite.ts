// =====================================================================================================
// Prazo do aceite da SD: o PRO termina em início + lead time acordado com o cliente (dias corridos).
// Se a Engenharia mudar o término, precisa justificar (o servidor confere a mesma regra).
// Funções puras (sem React), para serem testadas.
// =====================================================================================================

import { diasEntreDatas, somarDias } from '../../compartilhado/formatacao';

/** Duração usada quando a SD não tem lead time (aberta antes da versão 0.4.0). */
export const LEAD_TIME_PADRAO = 180;

/**
 * Término do PRO pela regra do lead time.
 * @param inicio início previsto (AAAA-MM-DD)
 * @param leadTimeDias lead time da SD; `null` usa o padrão de 180 dias
 * @returns término calculado (AAAA-MM-DD)
 */
export function terminoCalculado(inicio: string, leadTimeDias: number | null): string {
  return somarDias(inicio, leadTimeDias ?? LEAD_TIME_PADRAO);
}

/**
 * Compara o término escolhido com o calculado.
 * @param inicio início previsto (AAAA-MM-DD)
 * @param fim término escolhido (AAAA-MM-DD)
 * @param leadTimeDias lead time da SD (`null` = SD antiga, sem exigência de justificativa)
 * @returns término calculado, diferença em dias (positiva = depois do acordado) e se a justificativa é exigida
 */
export function estadoDoTermino(
  inicio: string,
  fim: string,
  leadTimeDias: number | null,
): { calculado: string; diferencaDias: number; exigeJustificativa: boolean } {
  const calculado = terminoCalculado(inicio, leadTimeDias);
  return {
    calculado,
    diferencaDias: diasEntreDatas(calculado, fim),
    exigeJustificativa: leadTimeDias !== null && fim !== calculado,
  };
}

/** Maior lead time aceito (5 anos), igual ao do servidor. */
export const LEAD_TIME_MAXIMO = 1825;

/**
 * Confere o lead time digitado pelo Comercial antes de enviar.
 * @param texto conteúdo do campo
 * @returns `true` só para inteiros de 1 a 1825 escritos só com dígitos
 */
export function leadTimeValido(texto: string): boolean {
  return /^\d+$/.test(texto) && Number(texto) >= 1 && Number(texto) <= LEAD_TIME_MAXIMO;
}
