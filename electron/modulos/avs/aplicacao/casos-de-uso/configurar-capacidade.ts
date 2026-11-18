import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import { ErroDeDominio } from '../../../../nucleo/dominio/erro-de-dominio';
import { type ConfigCapacidade, type RepositorioConfigCapacidade, validarConfigCapacidade } from '../../dominio/capacidade';
import type { ConsultaDeUsuarios } from '../portas';

/** Horas por turno e dias produtivos por mês do cálculo de turnos do PCP (qualquer usuário logado). */
export class ObterCapacidadeConfig {
  constructor(private readonly config: RepositorioConfigCapacidade) {}

  /** @returns os parâmetros atuais (padrão 8 h × 22 dias) */
  executar(): Promise<ConfigCapacidade> {
    return this.config.obter();
  }
}

/** Altera os parâmetros de capacidade. Só administradores; vale na hora para todas as AVs abertas. */
export class SalvarCapacidadeConfig {
  /**
   * @param config onde a configuração é gravada
   * @param usuarios usuário logado (perfil)
   * @param relogio instante da alteração
   */
  constructor(
    private readonly config: RepositorioConfigCapacidade,
    private readonly usuarios: ConsultaDeUsuarios,
    private readonly relogio: Relogio,
  ) {}

  /**
   * @param entrada horas por turno e dias produtivos por mês
   * @returns a configuração gravada
   * @throws ErroDeDominio `SEM_PERMISSAO` para quem não é administrador; ErroDeValidacao fora dos limites
   */
  async executar(entrada: ConfigCapacidade): Promise<ConfigCapacidade> {
    const usuario = this.usuarios.usuarioAtual();
    if (usuario?.perfil !== 'administrador') {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Só administradores alteram os parâmetros de capacidade.');
    }
    await this.config.salvar(validarConfigCapacidade(entrada), usuario.id, this.relogio.agora());
    return this.config.obter();
  }
}
