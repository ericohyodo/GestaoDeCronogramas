import { exigirTexto } from '../../../nucleo/dominio/texto';

export interface GrupoAv {
  id: string;
  nome: string;
  criadoPor: string | null;
  criadoEm: Date;
}

export function validarNomeDoGrupo(nome: string): string {
  return exigirTexto(nome, 'O nome do grupo', 80);
}

export interface RepositorioGruposAv {
  listar(): Promise<GrupoAv[]>;
  obterPorId(id: string): Promise<GrupoAv | null>;
  obterPorNome(nome: string): Promise<GrupoAv | null>;
  /** Cria ou renomeia o grupo e redefine seus membros: quem não estiver em `avIds` sai do grupo. */
  salvar(grupo: GrupoAv, avIds: string[]): Promise<void>;
  /** Apaga o grupo; as AVs continuam existindo, só ficam sem grupo. */
  excluir(id: string): Promise<void>;
}
