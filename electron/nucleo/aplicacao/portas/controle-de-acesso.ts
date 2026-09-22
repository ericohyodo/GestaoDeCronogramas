/** Permissão exigida por um canal IPC. `publico` é o que a tela de login precisa antes de autenticar. */
export type PermissaoIpc = 'publico' | 'leitura' | 'tarefas' | 'planejamento' | 'administracao';

export interface ControleDeAcesso {
  /** Há alguém autenticado na sessão atual? */
  autenticado(): boolean;
  possuiPermissao(permissao: PermissaoIpc): boolean;
}
