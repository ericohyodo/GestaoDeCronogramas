import type { Responsavel } from './responsavel';

export interface RepositorioResponsaveis {
  listar(): Promise<Responsavel[]>;
  obterPorId(id: string): Promise<Responsavel | null>;
  salvar(responsavel: Responsavel): Promise<void>;
  excluir(id: string): Promise<void>;
  /** Recurso vinculado a um usuário (no máximo um). */
  obterPorUsuario(usuarioId: string): Promise<Responsavel | null>;
}
