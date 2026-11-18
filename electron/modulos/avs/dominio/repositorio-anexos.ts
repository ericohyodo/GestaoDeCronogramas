import type { Anexo } from './anexo';

export interface RepositorioAnexos {
  listar(avId: string): Promise<Anexo[]>;
  obterPorId(id: string): Promise<Anexo | null>;
  inserir(anexo: Anexo): Promise<void>;
  excluir(id: string): Promise<void>;
}
