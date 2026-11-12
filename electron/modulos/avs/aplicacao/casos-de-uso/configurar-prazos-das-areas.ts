import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio, ErroDeValidacao } from '../../../../nucleo/dominio/erro-de-dominio';
import {
  AREAS_COM_PRAZO,
  type ConfigPrazos,
  DIAS_UTEIS_MAXIMO,
  DIAS_UTEIS_MINIMO,
  type RepositorioConfigPrazos,
} from '../../dominio/prazo-area';
import type { ConsultaDeUsuarios } from '../portas';

/** Dias úteis de cada área da AV (qualquer usuário logado pode consultar). */
export class ObterPrazosConfig {
  constructor(private readonly config: RepositorioConfigPrazos) {}

  /** @returns dias úteis por área */
  executar(): Promise<ConfigPrazos> {
    return this.config.obter();
  }
}

/**
 * Altera os dias úteis de cada área. Só administradores. Vale para as próximas etapas liberadas: os prazos
 * em curso guardam os dias da época em que começaram.
 */
export class SalvarPrazosConfig {
  /**
   * @param config onde a configuração é gravada
   * @param usuarios usuário logado (perfil)
   * @param relogio instante da alteração
   */
  constructor(
    private readonly config: RepositorioConfigPrazos,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly relogio: Relogio,
  ) {}

  /**
   * @param entrada dias úteis por área (inteiros de 1 a 30)
   * @returns a configuração gravada
   */
  async executar(entrada: ConfigPrazos): Promise<ConfigPrazos> {
    const usuario = this.usuarios.usuarioAtual();
    if (usuario?.perfil !== 'administrador') {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Só administradores alteram os prazos das áreas.');
    }
    for (const area of AREAS_COM_PRAZO) {
      const dias = entrada[area];
      if (!Number.isInteger(dias) || dias < DIAS_UTEIS_MINIMO || dias > DIAS_UTEIS_MAXIMO) {
        throw new ErroDeValidacao(
          `O prazo de cada área deve ser um número inteiro de ${DIAS_UTEIS_MINIMO} a ${DIAS_UTEIS_MAXIMO} dias úteis.`,
        );
      }
    }
    const valores = Object.fromEntries(AREAS_COM_PRAZO.map((area) => [area, entrada[area]])) as ConfigPrazos;
    await this.config.salvar(valores, usuario.id, this.relogio.agora());
    return this.config.obter();
  }
}
