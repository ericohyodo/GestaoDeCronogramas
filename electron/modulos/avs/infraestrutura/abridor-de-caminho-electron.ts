import { shell } from 'electron';
import type { AbridorDeCaminho } from '../aplicacao/portas';
import { avaliarCaminhoDeEvidencia } from '../dominio/caminho-de-evidencia';

export class AbridorDeCaminhoElectron implements AbridorDeCaminho {
  /**
   * Abre uma pasta/arquivo (rede ou local) no programa padrão, ou uma URL http(s) no navegador.
   * @returns `null` quando abriu; senão, o motivo da recusa/falha
   */
  async abrir(caminho: string): Promise<string | null> {
    const avaliacao = avaliarCaminhoDeEvidencia(caminho);
    if ('recusa' in avaliacao) return avaliacao.recusa;
    if (avaliacao.tipo === 'web') {
      await shell.openExternal(caminho.trim());
      return null;
    }
    const falha = await shell.openPath(caminho.trim());
    return falha || null;
  }
}
