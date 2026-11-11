import type { Sd, SdListada } from './sd';

export interface RepositorioSds {
  /** Insere ou atualiza a SD inteira. */
  salvar(sd: Sd): Promise<void>;
  obterPorId(id: string): Promise<SdListada | null>;
  obterPorAv(avId: string): Promise<SdListada | null>;
  listar(): Promise<SdListada[]>;
}

/** Evidência anexada à SD (PO, e-mail do cliente, documento de oficialização). */
export interface AnexoSd {
  id: string;
  sdId: string;
  nomeArquivo: string;
  nomeArmazenado: string;
  tipoMime: string | null;
  tamanhoBytes: number;
  usuarioId: string | null;
  criadoEm: Date;
}

export interface RepositorioAnexosSd {
  inserir(anexo: AnexoSd): Promise<void>;
  listar(sdId: string): Promise<AnexoSd[]>;
  obterPorId(id: string): Promise<AnexoSd | null>;
  excluir(id: string): Promise<void>;
  contar(sdId: string): Promise<number>;
}
