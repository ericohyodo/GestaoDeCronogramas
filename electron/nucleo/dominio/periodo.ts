import { ErroDeValidacao } from './erro-de-dominio';

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const MS_POR_DIA = 86_400_000;

/**
 * Intervalo de datas de calendário (sem horário), no formato AAAA-MM-DD.
 * Invariante: `fim` nunca é anterior a `inicio`.
 */
export class Periodo {
  private constructor(
    readonly inicio: string,
    readonly fim: string,
  ) {}

  static criar(inicio: string, fim: string): Periodo {
    if (!ehDataValida(inicio)) throw new ErroDeValidacao('Data de início inválida (use AAAA-MM-DD).');
    if (!ehDataValida(fim)) throw new ErroDeValidacao('Data de término inválida (use AAAA-MM-DD).');
    if (fim < inicio) {
      throw new ErroDeValidacao('A data de término não pode ser anterior à data de início.');
    }
    return new Periodo(inicio, fim);
  }

  /** Quantidade de dias corridos, contando o dia inicial e o final. */
  get duracaoEmDias(): number {
    return (paraUtc(this.fim) - paraUtc(this.inicio)) / MS_POR_DIA + 1;
  }

  com(alteracoes: { inicio?: string; fim?: string }): Periodo {
    return Periodo.criar(alteracoes.inicio ?? this.inicio, alteracoes.fim ?? this.fim);
  }

  /** Move o período inteiro, mantendo a duração. */
  deslocar(dias: number): Periodo {
    return Periodo.criar(somarDiasNaData(this.inicio, dias), somarDiasNaData(this.fim, dias));
  }
}

/** Dias corridos entre duas datas AAAA-MM-DD (negativo quando `fim` é anterior a `inicio`). */
export function diasEntreDatas(inicio: string, fim: string): number {
  return (paraUtc(fim) - paraUtc(inicio)) / MS_POR_DIA;
}

export function somarDiasNaData(data: string, dias: number): string {
  return new Date(paraUtc(data) + dias * MS_POR_DIA).toISOString().slice(0, 10);
}

function paraUtc(data: string): number {
  return Date.parse(`${data}T00:00:00Z`);
}

export function ehDataValida(valor: string): boolean {
  if (!FORMATO_DATA.test(valor)) return false;
  const instante = paraUtc(valor);
  // Rejeita datas inexistentes como 2026-02-30, que o Date "corrige" para março.
  return !Number.isNaN(instante) && new Date(instante).toISOString().slice(0, 10) === valor;
}
