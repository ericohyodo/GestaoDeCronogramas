import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import type { ArquivoSelecionado, OpcoesSeletorDeArquivos, SeletorDeArquivos } from '../aplicacao/portas';

export class SeletorDeArquivosElectron implements SeletorDeArquivos {
  async escolher(opcoes: OpcoesSeletorDeArquivos = {}): Promise<ArquivoSelecionado[] | null> {
    const anexos = (opcoes.modo ?? 'anexos') === 'anexos';
    const configuracao: Electron.OpenDialogOptions = anexos
      ? {
          title: 'Selecionar desenhos e evidências',
          properties: ['openFile', 'multiSelections'],
          filters: [
            { name: 'Desenhos e imagens', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'bmp'] },
            { name: 'Todos os arquivos', extensions: ['*'] },
          ],
        }
      : {
          title: 'Selecionar arquivo de evidência',
          properties: ['openFile'],
          filters: [{ name: 'Todos os arquivos', extensions: ['*'] }],
        };
    const janela = BrowserWindow.getFocusedWindow();
    const resposta = janela
      ? await dialog.showOpenDialog(janela, configuracao)
      : await dialog.showOpenDialog(configuracao);
    if (resposta.canceled || resposta.filePaths.length === 0) return null;
    return resposta.filePaths.map((caminho) => ({
      caminhoOriginal: caminho,
      nomeArquivo: path.basename(caminho),
    }));
  }
}
