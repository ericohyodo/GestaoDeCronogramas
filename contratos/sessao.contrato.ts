export const PERFIS = ['administrador', 'gestor', 'usuario', 'visualizador'] as const;
export type PerfilDTO = (typeof PERFIS)[number];

/**
 * Permissões exigidas por cada canal IPC. O backend é quem decide quais o perfil possui
 * e as envia na sessão, para a UI esconder o que a pessoa não pode fazer.
 */
export const PERMISSOES = ['leitura', 'tarefas', 'planejamento', 'administracao'] as const;
export type PermissaoDTO = (typeof PERMISSOES)[number];

export interface UsuarioDTO {
  id: string;
  nome: string;
  login: string;
  perfil: PerfilDTO;
  ativo: boolean;
  criadoEm: string;
  ultimoAcessoEm: string | null;
}

export interface SessaoDTO {
  usuario: UsuarioDTO | null;
  permissoes: PermissaoDTO[];
  /** true quando ainda não existe nenhum usuário: a tela de login pede a criação do administrador. */
  precisaConfigurar: boolean;
}

export interface EntrarEntrada {
  login: string;
  senha: string;
}

export interface PrimeiroAcessoEntrada {
  nome: string;
  login: string;
  senha: string;
}

export interface UsuarioOnlineDTO {
  id: string;
  nome: string;
  perfil: PerfilDTO;
  /** Desde quando está com o aplicativo aberto (a instância mais antiga da pessoa). */
  desde: string;
  /** Quantas instâncias do aplicativo a pessoa tem abertas agora. */
  instancias: number;
}
