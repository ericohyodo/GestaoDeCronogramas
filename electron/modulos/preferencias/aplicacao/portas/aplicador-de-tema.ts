import type { Tema } from '../../dominio/tema';

/** Porta de saída: aplica o tema na interface (no Electron, via `nativeTheme`). */
export interface AplicadorDeTema {
  aplicar(tema: Tema): void;
}
