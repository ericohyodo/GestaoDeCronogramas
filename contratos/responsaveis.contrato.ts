export interface ResponsavelDTO {
  id: string;
  nome: string;
  email: string | null;
  funcao: string | null;
  ativo: boolean;
}

export interface CriarResponsavelEntrada {
  nome: string;
  email?: string | null;
  funcao?: string | null;
}

export interface AtualizarResponsavelEntrada {
  id: string;
  nome?: string;
  email?: string | null;
  funcao?: string | null;
  ativo?: boolean;
}
