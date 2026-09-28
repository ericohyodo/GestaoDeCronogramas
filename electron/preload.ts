/**
 * Ponte segura entre o renderer e o processo principal (contextIsolation + sandbox).
 * Expõe apenas `window.api`, com o formato definido em contratos/api-desktop.ts.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { ApiDesktop } from '@contratos/api-desktop';
import type { AparenciaDTO } from '@contratos/aparencia.contrato';
import { CANAIS } from '@contratos/canais';

const invocar = <T>(canal: string, entrada?: unknown): Promise<T> =>
  ipcRenderer.invoke(canal, entrada) as Promise<T>;

// Leitura síncrona: a aparência precisa estar disponível antes da primeira pintura.
const aparencia = ipcRenderer.sendSync(CANAIS.aparencia.obter) as AparenciaDTO;

const api: ApiDesktop = {
  sessao: {
    obter: () => invocar(CANAIS.sessao.obter),
    entrar: (entrada) => invocar(CANAIS.sessao.entrar, entrada),
    sair: () => invocar(CANAIS.sessao.sair),
    primeiroAcesso: (entrada) => invocar(CANAIS.sessao.primeiroAcesso, entrada),
  },
  usuarios: {
    listar: () => invocar(CANAIS.usuarios.listar),
    criar: (entrada) => invocar(CANAIS.usuarios.criar, entrada),
    atualizar: (entrada) => invocar(CANAIS.usuarios.atualizar, entrada),
    alterarSenha: (entrada) => invocar(CANAIS.usuarios.alterarSenha, entrada),
    excluir: (id) => invocar(CANAIS.usuarios.excluir, id),
  },
  responsaveis: {
    listar: () => invocar(CANAIS.responsaveis.listar),
    criar: (entrada) => invocar(CANAIS.responsaveis.criar, entrada),
    atualizar: (entrada) => invocar(CANAIS.responsaveis.atualizar, entrada),
    excluir: (id) => invocar(CANAIS.responsaveis.excluir, id),
  },
  avs: {
    listar: () => invocar(CANAIS.avs.listar),
    obter: (id) => invocar(CANAIS.avs.obter, id),
    criar: (entrada) => invocar(CANAIS.avs.criar, entrada),
    atualizarComercial: (entrada) => invocar(CANAIS.avs.atualizarComercial, entrada),
    atualizarEquipe: (entrada) => invocar(CANAIS.avs.atualizarEquipe, entrada),
    listarMembros: () => invocar(CANAIS.avs.listarMembros),
    obterDashboard: () => invocar(CANAIS.avs.obterDashboard),
    avancarEtapa: (entrada) => invocar(CANAIS.avs.avancarEtapa, entrada),
    declinar: (entrada) => invocar(CANAIS.avs.declinar, entrada),
    listarHistorico: (avId) => invocar(CANAIS.avs.listarHistorico, avId),
    obterCatalogoCusto: () => invocar(CANAIS.avs.obterCatalogoCusto),
    obterSecaoCusto: (avId) => invocar(CANAIS.avs.obterSecaoCusto, avId),
    salvarSecaoCusto: (entrada) => invocar(CANAIS.avs.salvarSecaoCusto, entrada),
    obterSecaoProduto: (avId) => invocar(CANAIS.avs.obterSecaoProduto, avId),
    salvarSecaoProduto: (entrada) => invocar(CANAIS.avs.salvarSecaoProduto, entrada),
    obterSecaoProcesso: (avId) => invocar(CANAIS.avs.obterSecaoProcesso, avId),
    salvarSecaoProcesso: (entrada) => invocar(CANAIS.avs.salvarSecaoProcesso, entrada),
    abrirCaminho: (caminho) => invocar(CANAIS.avs.abrirCaminho, caminho),
    listarAnexos: (avId) => invocar(CANAIS.avs.listarAnexos, avId),
    selecionarEAnexar: (entrada) => invocar(CANAIS.avs.selecionarEAnexar, entrada),
    obterConteudoAnexo: (anexoId) => invocar(CANAIS.avs.obterConteudoAnexo, anexoId),
    excluirAnexo: (anexoId) => invocar(CANAIS.avs.excluirAnexo, anexoId),
  },
  cronogramas: {
    listar: () => invocar(CANAIS.cronogramas.listar),
    obter: (id) => invocar(CANAIS.cronogramas.obter, id),
    criar: (entrada) => invocar(CANAIS.cronogramas.criar, entrada),
    atualizar: (entrada) => invocar(CANAIS.cronogramas.atualizar, entrada),
    excluir: (id) => invocar(CANAIS.cronogramas.excluir, id),
  },
  tarefas: {
    obterEstrutura: (cronogramaId) => invocar(CANAIS.tarefas.obterEstrutura, cronogramaId),
    criar: (entrada) => invocar(CANAIS.tarefas.criar, entrada),
    atualizar: (entrada) => invocar(CANAIS.tarefas.atualizar, entrada),
    excluir: (id) => invocar(CANAIS.tarefas.excluir, id),
    deslocarSucessoras: (entrada) => invocar(CANAIS.tarefas.deslocarSucessoras, entrada),
    ajustarDatasDaFase: (entrada) => invocar(CANAIS.tarefas.ajustarDatasDaFase, entrada),
    criarFase: (entrada) => invocar(CANAIS.tarefas.criarFase, entrada),
    atualizarFase: (entrada) => invocar(CANAIS.tarefas.atualizarFase, entrada),
    excluirFase: (id) => invocar(CANAIS.tarefas.excluirFase, id),
    reordenar: (entrada) => invocar(CANAIS.tarefas.reordenar, entrada),
    duplicar: (id) => invocar(CANAIS.tarefas.duplicar, id),
    copiarEstrutura: (entrada) => invocar(CANAIS.tarefas.copiarEstrutura, entrada),
    listarAgenda: () => invocar(CANAIS.tarefas.listarAgenda),
  },
  impressao: {
    exportarPdf: (cronogramaId) => invocar(CANAIS.impressao.exportarPdf, cronogramaId),
    exportarAnalisePdf: (analiseId) => invocar(CANAIS.impressao.exportarAnalisePdf, analiseId),
  },
  ia: {
    estado: () => invocar(CANAIS.ia.estado),
    configurar: (entrada) => invocar(CANAIS.ia.configurar, entrada),
    removerChave: () => invocar(CANAIS.ia.removerChave),
    analisar: (cronogramaId) => invocar(CANAIS.ia.analisar, cronogramaId),
    analisarPortfolio: () => invocar(CANAIS.ia.analisarPortfolio),
    conversar: (entrada) => invocar(CANAIS.ia.conversar, entrada),
    listarAnalises: () => invocar(CANAIS.ia.listarAnalises),
    obterAnalise: (id) => invocar(CANAIS.ia.obterAnalise, id),
    ultimaAnalise: (entrada) => invocar(CANAIS.ia.ultimaAnalise, entrada),
    excluirAnalise: (id) => invocar(CANAIS.ia.excluirAnalise, id),
    obterInstrucoes: () => invocar(CANAIS.ia.obterInstrucoes),
    salvarInstrucoes: (entrada) => invocar(CANAIS.ia.salvarInstrucoes, entrada),
    restaurarChecklist: () => invocar(CANAIS.ia.restaurarChecklist),
  },
  preferencias: {
    obter: () => invocar(CANAIS.preferencias.obter),
    definirTema: (tema) => invocar(CANAIS.preferencias.definirTema, tema),
  },
  aparencia,
};

contextBridge.exposeInMainWorld('api', api);

// Marca <html data-vidro-nativo> assim que o elemento existir, antes do CSS ser aplicado,
// para o fundo transparente (Acrylic) valer já na primeira pintura.
if (aparencia.vidroNativo) {
  quandoHouverHtml((html) => html.setAttribute('data-vidro-nativo', ''));
}

function quandoHouverHtml(acao: (html: HTMLElement) => void): void {
  if (document.documentElement) {
    acao(document.documentElement);
    return;
  }
  const observador = new MutationObserver(() => {
    if (!document.documentElement) return;
    observador.disconnect();
    acao(document.documentElement);
  });
  observador.observe(document, { childList: true });
}
