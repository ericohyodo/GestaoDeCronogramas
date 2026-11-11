import type { PerfilDTO } from './sessao.contrato';

export interface CriarUsuarioEntrada {
  nome: string;
  login: string;
  /** Opcional; base do futuro status report por e-mail. */
  email?: string | null;
  departamento?: string | null;
  /** Vazia: a pessoa cria a própria senha no primeiro acesso. */
  senha: string;
  perfil: PerfilDTO;
}

export interface AtualizarUsuarioEntrada {
  id: string;
  nome?: string;
  email?: string | null;
  departamento?: string | null;
  /** true: a pessoa refaz o primeiro acesso (e-mail e senha nova). */
  exigirPrimeiroAcesso?: boolean;
  perfil?: PerfilDTO;
  ativo?: boolean;
}

export interface AlterarSenhaEntrada {
  id: string;
  /** Obrigatória ao trocar a própria senha; o administrador pode redefinir a de outros sem ela. */
  senhaAtual?: string;
  novaSenha: string;
}
