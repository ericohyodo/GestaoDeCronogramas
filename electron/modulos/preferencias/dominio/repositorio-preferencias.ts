import type { Tema } from './tema';

export interface RepositorioPreferencias {
  /** `null` quando o usuário ainda não escolheu um tema. */
  obterTema(): Promise<Tema | null>;
  salvarTema(tema: Tema): Promise<void>;
}
