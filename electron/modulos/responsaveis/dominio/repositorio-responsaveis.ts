import type { Responsavel } from './responsavel';

export interface RepositorioResponsaveis {
  listar(): Promise<Responsavel[]>;
  obterPorId(id: string): Promise<Responsavel | null>;
  salvar(responsavel: Responsavel): Promise<void>;
  excluir(id: string): Promise<void>;
}
