import { BrowserWindow, nativeTheme, shell } from 'electron';

/** Precisa coincidir com a altura da BarraDeTitulo do renderer (h-10). */
const ALTURA_BARRA_DE_TITULO = 40;
const TRANSPARENTE = '#00000000';

// Mesmos valores dos tokens `--fundo-inicio` e `--texto` do renderer (globals.css).
const CORES = {
  claro: { fundo: '#F4F6FA', simbolos: '#0F1B2D' },
  escuro: { fundo: '#0B1220', simbolos: '#E6EDF7' },
} as const;

export interface OpcoesJanelaPrincipal {
  url: string;
  caminhoDoPreload: string;
  vidroNativo: boolean;
  ehUrlConfiavel(url: string): boolean;
}

export function criarJanelaPrincipal(opcoes: OpcoesJanelaPrincipal): BrowserWindow {
  const cores = () => (nativeTheme.shouldUseDarkColors ? CORES.escuro : CORES.claro);
  // Com Acrylic o fundo precisa ser transparente; sem ele, a cor do tema evita um flash branco.
  const corDeFundo = () => (opcoes.vidroNativo ? TRANSPARENTE : cores().fundo);

  const janela = new BrowserWindow({
    title: 'Gestão de Cronogramas',
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: corDeFundo(),
    backgroundMaterial: opcoes.vidroNativo ? 'acrylic' : 'none',
    // Barra de título desenhada pelo renderer; os botões nativos ficam sobrepostos à direita.
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: TRANSPARENTE,
      symbolColor: cores().simbolos,
      height: ALTURA_BARRA_DE_TITULO,
    },
    webPreferences: {
      preload: opcoes.caminhoDoPreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  // Sempre abre maximizada (ocupa a tela toda, mantendo a barra de título e os botões da janela).
  janela.once('ready-to-show', () => {
    janela.maximize();
    janela.show();
  });

  // Links externos abrem no navegador padrão; o app nunca abre novas janelas.
  janela.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  janela.webContents.on('will-navigate', (evento, url) => {
    if (!opcoes.ehUrlConfiavel(url)) evento.preventDefault();
  });

  const acompanharTema = () => {
    janela.setTitleBarOverlay({ color: TRANSPARENTE, symbolColor: cores().simbolos });
    if (!opcoes.vidroNativo) janela.setBackgroundColor(corDeFundo());
  };
  nativeTheme.on('updated', acompanharTema);
  janela.on('closed', () => nativeTheme.off('updated', acompanharTema));

  void janela.loadURL(opcoes.url);
  return janela;
}
