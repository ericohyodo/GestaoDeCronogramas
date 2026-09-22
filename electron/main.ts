import path from 'node:path';
import { app, type BrowserWindow, dialog, Menu } from 'electron';
import { criarJanelaPrincipal } from './janela/criar-janela-principal';
import { ORIGEM_APP, registrarEsquemaApp, registrarProtocoloApp } from './protocolo-app';
import { type Aplicacao, montarAplicacao } from './raiz-de-composicao';

/** Definida pelo script `npm run dev`: carrega o servidor do Next.js em vez do export estático. */
const URL_DESENVOLVIMENTO = process.env.ELECTRON_RENDERER_URL;
const URL_INICIAL = URL_DESENVOLVIMENTO ?? `${ORIGEM_APP}/`;

function ehUrlConfiavel(url: string): boolean {
  if (URL_DESENVOLVIMENTO && url.startsWith(URL_DESENVOLVIMENTO)) return true;
  return url.startsWith(`${ORIGEM_APP}/`);
}

let aplicacao: Aplicacao | null = null;
let janela: BrowserWindow | null = null;

// O User-Agent padrão inclui o productName ("GestãodeCronogramas/0.1.0"). Cabeçalhos HTTP só
// aceitam Latin-1, e o "ã" faz o protocol.handle rejeitar todo fetch() do renderer.
// Remove os acentos (NFD + descarte dos diacríticos) e qualquer outro caractere não ASCII.
app.userAgentFallback = app.userAgentFallback.normalize('NFD').replace(/[^\x20-\x7e]/g, '');

registrarEsquemaApp();

// Uma instância por vez: duas escrevendo no mesmo arquivo .db causariam conflitos.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!janela) return;
    if (janela.isMinimized()) janela.restore();
    janela.focus();
  });
  app.whenReady().then(iniciar, falharAoIniciar);
}

async function iniciar(): Promise<void> {
  try {
    aplicacao = await montarAplicacao({ ehUrlConfiavel });
  } catch (erro) {
    falharAoIniciar(erro);
    return;
  }

  if (!URL_DESENVOLVIMENTO) registrarProtocoloApp(path.join(app.getAppPath(), 'renderer', 'out'));
  if (app.isPackaged) Menu.setApplicationMenu(null);

  janela = criarJanelaPrincipal({
    url: URL_INICIAL,
    caminhoDoPreload: path.join(__dirname, 'preload.js'),
    vidroNativo: aplicacao.aparencia.vidroNativo,
    ehUrlConfiavel,
  });
  janela.on('closed', () => {
    janela = null;
  });
}

function falharAoIniciar(erro: unknown): void {
  console.error('[inicializacao]', erro);
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  dialog.showErrorBox('Gestão de Cronogramas — não foi possível iniciar', mensagem);
  app.quit();
}

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => aplicacao?.encerrar());
