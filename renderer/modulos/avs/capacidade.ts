// =====================================================================================================
// Capacidade do PCP: carga futura (peças/mês) e turnos necessários. Funções puras (sem React), testadas.
//
// Unidades: peças/hora e carga atual estão na unidade da OPERAÇÃO (ex.: placas na fundição). A conversão diz
// quantas peças do produto final saem de uma unidade da operação; por isso a demanda do item novo (volume
// anual ÷ 12, em peças do produto) é dividida pela conversão.
// =====================================================================================================

export interface ParametrosCapacidade {
  horasPorTurno: number;
  diasProdutivosMes: number;
}

/** Acima disso a operação não cabe num dia (3 turnos). */
export const TURNOS_MAXIMOS_POR_DIA = 3;

const numero = (texto: string): number | null => {
  if (texto.trim() === '') return null;
  const valor = Number(texto);
  return Number.isFinite(valor) ? valor : null;
};

/**
 * Demanda mensal do item novo na unidade da operação.
 * @param volumeAnual peças do produto final por ano (aba Comercial)
 * @param conversao peças do produto por unidade da operação (texto; vazio = 1)
 * @returns unidades da operação por mês, ou `null` sem volume ou com conversão inválida
 */
export function cargaFuturaMensal(volumeAnual: number | null | undefined, conversao: string): number | null {
  if (volumeAnual == null || volumeAnual <= 0) return null;
  const fator = conversao.trim() === '' ? 1 : numero(conversao);
  if (fator === null || fator <= 0) return null;
  return volumeAnual / 12 / fator;
}

/**
 * Turnos por dia necessários para produzir a carga mensal.
 * @param cargaMensal unidades da operação por mês
 * @param pecasHora texto de peças/hora da operação
 * @param parametros horas por turno e dias produtivos por mês
 * @returns turnos (decimal), ou `null` sem peças/hora válidas
 */
export function turnosNecessarios(cargaMensal: number, pecasHora: string, parametros: ParametrosCapacidade): number | null {
  const porHora = numero(pecasHora);
  if (porHora === null || porHora <= 0) return null;
  return cargaMensal / (porHora * parametros.horasPorTurno * parametros.diasProdutivosMes);
}

/**
 * Turnos de hoje e com o item novo, para a coluna "Turnos" da carga de máquina.
 * @param linha textos da linha (peças/hora, conversão, carga atual)
 * @param volumeAnual volume anual da AV
 * @param parametros horas por turno e dias produtivos por mês
 * @returns carga futura (unidades/mês) e turnos antes/depois; campos `null` quando faltam dados
 */
export function capacidadeDaLinha(
  linha: { pecasHora: string; conversao: string; cargaAtual: string },
  volumeAnual: number | null | undefined,
  parametros: ParametrosCapacidade,
): { cargaFutura: number | null; turnosAtuais: number | null; turnosComItem: number | null } {
  const cargaFutura = cargaFuturaMensal(volumeAnual, linha.conversao);
  const atual = numero(linha.cargaAtual);
  const turnosAtuais = atual === null ? null : turnosNecessarios(atual, linha.pecasHora, parametros);
  const turnosComItem =
    atual === null || cargaFutura === null ? null : turnosNecessarios(atual + cargaFutura, linha.pecasHora, parametros);
  return { cargaFutura, turnosAtuais, turnosComItem };
}

/**
 * Linha da carga completa: operação com peças/hora > 0, conversão > 0 e carga atual informada.
 * @param linha textos da linha
 */
export function linhaDeCargaCompleta(linha: { pecasHora: string; conversao: string; cargaAtual: string }): boolean {
  const porHora = numero(linha.pecasHora);
  const conversao = linha.conversao.trim() === '' ? 1 : numero(linha.conversao);
  const atual = numero(linha.cargaAtual);
  return porHora !== null && porHora > 0 && conversao !== null && conversao > 0 && atual !== null && atual >= 0;
}

/**
 * Número para leitura em pt-BR.
 * @param valor número ou `null`
 * @param casas casas decimais máximas
 */
export function formatarNumero(valor: number | null, casas = 0): string {
  return valor === null ? '—' : valor.toLocaleString('pt-BR', { maximumFractionDigits: casas });
}
