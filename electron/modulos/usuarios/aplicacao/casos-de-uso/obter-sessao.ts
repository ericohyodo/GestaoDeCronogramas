import type { SessaoDTO } from '@contratos/sessao.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { RepositorioUsuarios } from '../../dominio/repositorio-usuarios';
import { paraSessaoDTO } from '../mapeador-dto';
import type { Sessao } from '../sessao';

export class ObterSessao implements CasoDeUso<void, SessaoDTO> {
  constructor(
    private readonly repositorio: RepositorioUsuarios,
    private readonly sessao: Sessao,
  ) {}

  async executar(): Promise<SessaoDTO> {
    return paraSessaoDTO(this.sessao, (await this.repositorio.contar()) === 0);
  }
}

export class Sair implements CasoDeUso<void, SessaoDTO> {
  constructor(
    private readonly repositorio: RepositorioUsuarios,
    private readonly sessao: Sessao,
    /** Ex.: sair da lista de usuários online. */
    private readonly aoSair: () => Promise<void> = async () => undefined,
  ) {}

  async executar(): Promise<SessaoDTO> {
    await this.aoSair();
    this.sessao.encerrar();
    return paraSessaoDTO(this.sessao, (await this.repositorio.contar()) === 0);
  }
}
