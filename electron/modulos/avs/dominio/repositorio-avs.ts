import type { Av } from './av';

export interface RepositorioAvs {
  listar(): Promise<Av[]>;
  obterPorId(id: string): Promise<Av | null>;
  salvar(av: Av): Promise<void>;
  /** Próximo número sequencial dentro do ano informado, para gerar `numero` (ex.: "AV 26-007"). */
  proximoSequencial(ano: number): Promise<number>;
}
