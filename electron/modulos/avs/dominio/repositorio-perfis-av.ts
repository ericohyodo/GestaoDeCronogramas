import type { PerfilAvUsuario } from './papel-av';

export interface RepositorioPerfisAv {
  obterPerfil(usuarioId: string): Promise<PerfilAvUsuario | null>;
  listarPerfis(): Promise<PerfilAvUsuario[]>;
  salvarPerfil(perfil: PerfilAvUsuario): Promise<void>;
}
