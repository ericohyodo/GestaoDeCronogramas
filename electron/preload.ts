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
    criarFase: (entrada) => invocar(CANAIS.tarefas.criarFase, entrada),
    atualizarFase: (entrada) => invocar(CANAIS.tarefas.atualizarFase, entrada),
    excluirFase: (id) => invocar(CANAIS.tarefas.excluirFase, id),
    reordenar: (entrada) => invocar(CANAIS.tarefas.reordenar, entrada),
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
