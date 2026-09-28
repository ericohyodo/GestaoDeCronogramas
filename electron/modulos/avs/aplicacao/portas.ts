import type { PerfilDTO } from '@contratos/sessao.contrato';

export interface UsuarioAtualAv {
  id: string;
  nome: string;
  perfil: PerfilDTO;
}

/** Fornecida pelo módulo `usuarios`, sem expor seu domínio interno. */
export interface ConsultaDeUsuarios {
  usuarioAtual(): UsuarioAtualAv | null;
  listarAtivos(): Promise<{ id: string; nome: string }[]>;
  obterPerfilGlobal(id: string): Promise<PerfilDTO | null>;
}
