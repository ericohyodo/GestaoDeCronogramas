import type { Area } from './area';

export interface Anexo {
  id: string;
  avId: string;
  secao: Area;
  nomeArquivo: string;
  nomeArmazenado: string;
  tipoMime: string | null;
  tamanhoBytes: number;
  usuarioId: string | null;
  criadoEm: Date;
}
