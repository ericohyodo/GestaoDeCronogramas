import { BrowserWindow, type WebContents } from 'electron';
import { ErroNaImpressao } from '../aplicacao/erro-na-impressao';
import type { GeradorDePdf } from '../aplicacao/portas';

const TEMPO_MAXIMO_MS = 20_000;
const INTERVALO_MS = 150;

export interface OpcoesGeradorDePdf {
  /** Origem do renderer sem a barra final: `app://-` ou a URL do servidor de desenvolvimento. */
  urlBase: string;
  caminhoDoPreload: string;
}

/**
 * Abre a rota de impressão numa janela invisível e usa o motor de impressão do Chromium.
 * A sessão de login vive no processo principal, então a janela já nasce autenticada e as
 * permissões dos canais IPC valem para ela também.
 */
export class GeradorDePdfElectron implements GeradorDePdf {
  constructor(private readonly opcoes: OpcoesGeradorDePdf) {}

  async gerar(rota: string, titulo: string): Promise<Uint8Array> {
    const janela = new BrowserWindow({
      show: false,
      width: 1000,
      height: 1400,
      webPreferences: {
        preload: this.opcoes.caminhoDoPreload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false,
        // Janela nunca exibida: sem isto o Chromium poderia congelar os timers dela.
        backgroundThrottling: false,
      },
    });
    try {
      await janela.loadURL(`${this.opcoes.urlBase}${rota}`);
      await esperarPaginaPronta(janela.webContents);
      return await janela.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { top: 0.4, bottom: 0.55, left: 0.4, right: 0.4 },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: rodape(titulo),
      });
    } finally {
      janela.destroy();
    }
  }
}

/** A página marca `data-impressao` no <html> quando os dados e as fontes carregaram. */
async function esperarPaginaPronta(pagina: WebContents): Promise<void> {
  const limite = Date.now() + TEMPO_MAXIMO_MS;
  while (Date.now() < limite) {
    const estado = (await pagina.executeJavaScript(
      'document.documentElement.dataset.impressao ?? ""',
    )) as string;
    if (estado === 'pronta') return;
    if (estado === 'erro') {
      const motivo = (await pagina.executeJavaScript(
        'document.documentElement.dataset.impressaoErro ?? ""',
      )) as string;
      throw new ErroNaImpressao(motivo || 'Não foi possível montar a página de impressão.');
    }
    await new Promise((resolver) => setTimeout(resolver, INTERVALO_MS));
  }
  throw new ErroNaImpressao('A página de impressão demorou demais para carregar. Tente de novo.');
}

/** O rodapé é um HTML à parte do Chromium: estilos inline e o nome escapado. */
function rodape(titulo: string): string {
  const nome = titulo.replace(/[&<>"']/g, (caractere) => `&#${caractere.charCodeAt(0)};`);
  return `
    <div style="width:100%;margin:0 0.4in;display:flex;justify-content:space-between;
                font-family:Arial,sans-serif;font-size:8px;color:#7a8699;">
      <span>${nome}</span>
      <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>`;
}
