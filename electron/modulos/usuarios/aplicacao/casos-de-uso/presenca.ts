import type { UsuarioOnlineDTO } from '@contratos/sessao.contrato';
import type { CasoDeUso } from '../../../../nucleo/aplicacao/caso-de-uso';
import type { Relogio } from '../../../../nucleo/aplicacao/portas/relogio';
import type { RepositorioPresenca } from '../../dominio/repositorio-presenca';
import type { Sessao } from '../sessao';

/** Sem batimento por este tempo, a instância deixa de contar como online (o app bate a cada 30 s). */
export const VALIDADE_DO_BATIMENTO_EM_MS = 90_000;

/** Renova a presença de quem está logado nesta instância; sem sessão, não faz nada. */
export class BaterPresenca implements CasoDeUso<void, null> {
  constructor(
    private readonly repositorio: RepositorioPresenca,
    private readonly sessao: Sessao,
    private readonly relogio: Relogio,
    private readonly sessaoId: string,
  ) {}

  async executar(): Promise<null> {
    const usuario = this.sessao.usuarioAtual;
    if (usuario) await this.repositorio.registrar(this.sessaoId, usuario.id, this.relogio.agora());
    return null;
  }
}

export class ListarUsuariosOnline implements CasoDeUso<void, UsuarioOnlineDTO[]> {
  constructor(
    private readonly repositorio: RepositorioPresenca,
    private readonly relogio: Relogio,
  ) {}

  async executar(): Promise<UsuarioOnlineDTO[]> {
    const limite = new Date(this.relogio.agora().getTime() - VALIDADE_DO_BATIMENTO_EM_MS);
    const porUsuario = new Map<string, UsuarioOnlineDTO>();
    for (const presenca of await this.repositorio.listarDesde(limite)) {
      const existente = porUsuario.get(presenca.usuarioId);
      if (existente) {
        existente.instancias += 1;
        continue;
      }
      porUsuario.set(presenca.usuarioId, {
        id: presenca.usuarioId,
        nome: presenca.nome,
        perfil: presenca.perfil as UsuarioOnlineDTO['perfil'],
        desde: presenca.iniciadoEm.toISOString(),
        instancias: 1,
      });
    }
    return [...porUsuario.values()];
  }
}
