export interface ResponsavelDTO {
  id: string;
  nome: string;
  email: string | null;
  funcao: string | null;
  /** Usuário do sistema que é esta pessoa (recebe as notificações das tarefas). */
  usuarioId: string | null;
  ativo: boolean;
}

export interface CriarResponsavelEntrada {
  nome: string;
  email?: string | null;
  funcao?: string | null;
  usuarioId?: string | null;
}

export interface AtualizarResponsavelEntrada {
  id: string;
  nome?: string;
  email?: string | null;
  funcao?: string | null;
  usuarioId?: string | null;
  ativo?: boolean;
}
