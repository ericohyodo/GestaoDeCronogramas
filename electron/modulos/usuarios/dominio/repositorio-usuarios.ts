import type { Usuario } from './usuario';

export interface RepositorioUsuarios {
  listar(): Promise<Usuario[]>;
  obterPorId(id: string): Promise<Usuario | null>;
  obterPorLogin(login: string): Promise<Usuario | null>;
  contar(): Promise<number>;
  /** Quantos administradores ativos existem, sem contar `exceto`. */
  contarAdministradoresAtivos(exceto?: string): Promise<number>;
  salvar(usuario: Usuario): Promise<void>;
  excluir(id: string): Promise<void>;
}
