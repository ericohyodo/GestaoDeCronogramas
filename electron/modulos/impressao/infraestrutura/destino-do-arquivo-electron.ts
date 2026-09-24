import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { app, BrowserWindow, dialog, shell } from 'electron';
import { ErroNaImpressao } from '../aplicacao/erro-na-impressao';
import type { DestinoDoArquivo } from '../aplicacao/portas';

export class DestinoDoArquivoElectron implements DestinoDoArquivo {
  async escolher(nomeSugerido: string): Promise<string | null> {
    const opcoes: Electron.SaveDialogOptions = {
      title: 'Salvar PDF do cronograma',
      defaultPath: path.join(app.getPath('documents'), nomeSugerido),
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    };
    const janela = BrowserWindow.getFocusedWindow();
    const resposta = janela
      ? await dialog.showSaveDialog(janela, opcoes)
      : await dialog.showSaveDialog(opcoes);
    return resposta.canceled || !resposta.filePath ? null : resposta.filePath;
  }

  async gravarEAbrir(caminho: string, conteudo: Uint8Array): Promise<void> {
    try {
      await writeFile(caminho, conteudo);
    } catch (erro) {
      console.error('[impressao] falha ao gravar o PDF:', erro);
      throw new ErroNaImpressao(
        'Não foi possível salvar o PDF. Se um arquivo com esse nome estiver aberto em outro programa, feche-o e tente de novo.',
      );
    }
    // Abrir é conveniência: se não houver leitor de PDF, o arquivo continua salvo.
    const falha = await shell.openPath(caminho);
    if (falha) console.warn('[impressao] PDF salvo, mas não foi possível abri-lo:', falha);
  }
}
