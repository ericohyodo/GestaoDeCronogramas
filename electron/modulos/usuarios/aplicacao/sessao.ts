import type { PermissaoIpc } from '../../../nucleo/aplicacao/portas/controle-de-acesso';
import type { Permissao } from '../dominio/perfil';
import type { Usuario } from '../dominio/usuario';

/**
 * Sessão do processo principal: vive apenas em memória, então fechar o app exige login de novo.
 * É também o `ControleDeAcesso` consultado pelo registrador de canais IPC.
 */
export class Sessao {
  private usuario: Usuario | null = null;

  abrir(usuario: Usuario): void {
    this.usuario = usuario;
  }

  encerrar(): void {
    this.usuario = null;
  }

  get usuarioAtual(): Usuario | null {
    return this.usuario;
  }

  autenticado(): boolean {
    return this.usuario !== null;
  }

  possuiPermissao(permissao: PermissaoIpc): boolean {
    if (permissao === 'publico') return true;
    return this.usuario?.possuiPermissao(permissao as Permissao) ?? false;
  }
}
