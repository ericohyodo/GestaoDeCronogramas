// =====================================================================================================
// Calendário: aritmética de datas no formato AAAA-MM-DD. As datas são tratadas como meia-noite UTC só
// para percorrer o calendário (sem efeito de fuso). Dias úteis = segunda a sexta; feriados ainda não
// entram na conta (versão futura).
// =====================================================================================================

const DIA_EM_MS = 86_400_000;

/** Converte AAAA-MM-DD em Date à meia-noite UTC. */
const paraData = (dataIso: string) => new Date(`${dataIso.slice(0, 10)}T00:00:00Z`);

/** Converte Date (meia-noite UTC) de volta para AAAA-MM-DD. */
const paraIso = (data: Date) => data.toISOString().slice(0, 10);

/** Sábado (6) ou domingo (0). */
const ehFimDeSemana = (data: Date) => data.getUTCDay() === 0 || data.getUTCDay() === 6;

/**
 * Dia do calendário no fuso do computador (é o "hoje" que o usuário enxerga).
 * @param instante momento a converter
 * @returns data no formato AAAA-MM-DD
 */
export function diaLocal(instante: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${instante.getFullYear()}-${p(instante.getMonth() + 1)}-${p(instante.getDate())}`;
}

/**
 * Soma dias corridos a uma data.
 * @param dataIso data inicial (AAAA-MM-DD)
 * @param dias quantidade de dias (pode ser negativa)
 * @returns a data resultante (AAAA-MM-DD)
 */
export function somarDiasCorridos(dataIso: string, dias: number): string {
  return paraIso(new Date(paraData(dataIso).getTime() + dias * DIA_EM_MS));
}

/**
 * Soma dias úteis a uma data, contando a partir do dia seguinte e pulando sábado e domingo.
 * Ex.: sexta + 3 = quarta; sábado + 1 = segunda.
 * @param dataIso data inicial (AAAA-MM-DD)
 * @param dias quantidade de dias úteis (≥ 0)
 * @returns a data do último dia útil (AAAA-MM-DD)
 */
export function somarDiasUteis(dataIso: string, dias: number): string {
  const data = paraData(dataIso);
  let restantes = dias;
  while (restantes > 0) {
    data.setUTCDate(data.getUTCDate() + 1);
    if (!ehFimDeSemana(data)) restantes -= 1;
  }
  return paraIso(data);
}

/**
 * Quantos dias úteis há depois de `deIso` até `ateIso` (inclusive).
 * @param deIso data inicial, exclusiva (AAAA-MM-DD)
 * @param ateIso data final, inclusiva (AAAA-MM-DD)
 * @returns número de dias úteis; 0 se `ateIso` não for posterior a `deIso`
 */
export function diasUteisEntre(deIso: string, ateIso: string): number {
  const data = paraData(deIso);
  const fim = paraData(ateIso);
  let total = 0;
  while (data < fim) {
    data.setUTCDate(data.getUTCDate() + 1);
    if (!ehFimDeSemana(data)) total += 1;
  }
  return total;
}
