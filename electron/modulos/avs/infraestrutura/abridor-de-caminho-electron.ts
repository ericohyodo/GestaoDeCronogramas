import { shell } from 'electron';
import type { AbridorDeCaminho } from '../aplicacao/portas';

export class AbridorDeCaminhoElectron implements AbridorDeCaminho {
  async abrir(caminho: string): Promise<string | null> {
    const texto = caminho.trim();
    if (!texto) return 'caminho vazio';

    if (/^https?:\/\//i.test(texto)) {
      await shell.openExternal(texto);
      return null;
    }

    const falha = await shell.openPath(texto);
    return falha || null;
  }
}
