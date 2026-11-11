import type { PerfilDTO } from './sessao.contrato';

export interface CriarUsuarioEntrada {
  nome: string;
  login: string;
  /** Opcional; base do futuro status report por e-mail. */
  email?: string | null;
  senha: string;
  perfil: PerfilDTO;
}

export interface AtualizarUsuarioEntrada {
  id: string;
  nome?: string;
  email?: string | null;
  perfil?: PerfilDTO;
  ativo?: boolean;
}

export interface AlterarSenhaEntrada {
  id: string;
  /** Obrigatória ao trocar a própria senha; o administrador pode redefinir a de outros sem ela. */
  senhaAtual?: string;
  novaSenha: string;
}
