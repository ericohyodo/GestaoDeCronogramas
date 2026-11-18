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

// --- Meu perfil (o próprio usuário mantém) ---

/** Foto do usuário: base64 sem o prefixo `data:`. A tela reduz para 256 px antes de enviar. */
export interface FotoDoUsuarioDTO {
  base64: string;
  mime: 'image/jpeg' | 'image/png';
}

export interface MeuPerfilDTO {
  id: string;
  nome: string;
  login: string;
  /** Perfil de acesso (só o administrador altera). */
  perfil: PerfilDTO;
  email: string | null;
  departamento: string | null;
  cargo: string | null;
  ramal: string | null;
  celular: string | null;
  sobre: string | null;
  foto: FotoDoUsuarioDTO | null;
}

export interface SalvarMeuPerfilEntrada {
  email?: string | null;
  departamento?: string | null;
  cargo?: string | null;
  ramal?: string | null;
  celular?: string | null;
  sobre?: string | null;
  /** Ausente: mantém a foto atual; `null`: remove. */
  foto?: FotoDoUsuarioDTO | null;
}
