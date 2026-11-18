import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';

// =====================================================================================================
// Parâmetros de capacidade usados pelo PCP para converter carga (peças/mês) em turnos
// =====================================================================================================

export interface ConfigCapacidade {
  /** Horas produtivas de um turno (padrão 8). */
  horasPorTurno: number;
  /** Dias produtivos no mês (padrão 22). */
  diasProdutivosMes: number;
}

export const CAPACIDADE_PADRAO: ConfigCapacidade = { horasPorTurno: 8, diasProdutivosMes: 22 };

export interface RepositorioConfigCapacidade {
  obter(): Promise<ConfigCapacidade>;
  salvar(valores: ConfigCapacidade, usuarioId: string, instante: Date): Promise<void>;
}

/**
 * Valida os parâmetros informados pelo administrador.
 * @param valores horas por turno (0 < h ≤ 24) e dias produtivos (inteiro de 1 a 31)
 * @returns os mesmos valores, já conferidos
 * @throws ErroDeValidacao fora dos limites
 */
export function validarConfigCapacidade(valores: ConfigCapacidade): ConfigCapacidade {
  if (!Number.isFinite(valores.horasPorTurno) || valores.horasPorTurno <= 0 || valores.horasPorTurno > 24) {
    throw new ErroDeValidacao('As horas por turno devem ser maiores que zero e no máximo 24.');
  }
  if (!Number.isInteger(valores.diasProdutivosMes) || valores.diasProdutivosMes < 1 || valores.diasProdutivosMes > 31) {
    throw new ErroDeValidacao('Os dias produtivos por mês devem ser um número inteiro de 1 a 31.');
  }
  return { horasPorTurno: valores.horasPorTurno, diasProdutivosMes: valores.diasProdutivosMes };
}
