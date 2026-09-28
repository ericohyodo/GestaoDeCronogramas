import path from 'node:path';
import { BrowserWindow, dialog } from 'electron';
import type { ArquivoSelecionado, SeletorDeArquivos } from '../aplicacao/portas';

export class SeletorDeArquivosElectron implements SeletorDeArquivos {
  async escolher(): Promise<ArquivoSelecionado[] | null> {
    const opcoes: Electron.OpenDialogOptions = {
      title: 'Selecionar desenhos e evidências',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Desenhos e imagens', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'bmp'] },
        { name: 'Todos os arquivos', extensions: ['*'] },
      ],
    };
    const janela = BrowserWindow.getFocusedWindow();
    const resposta = janela
      ? await dialog.showOpenDialog(janela, opcoes)
      : await dialog.showOpenDialog(opcoes);
    if (resposta.canceled || resposta.filePaths.length === 0) return null;
    return resposta.filePaths.map((caminho) => ({
      caminhoOriginal: caminho,
      nomeArquivo: path.basename(caminho),
    }));
  }
}
