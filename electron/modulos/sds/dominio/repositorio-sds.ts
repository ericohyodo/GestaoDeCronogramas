import type { Sd, SdListada } from './sd';

export interface RepositorioSds {
  salvar(sd: Sd): Promise<void>;
  obterPorAv(avId: string): Promise<SdListada | null>;
  listar(): Promise<SdListada[]>;
}
