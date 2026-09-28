import { create } from 'zustand';
import type {
  AjustarDatasDaFaseEntrada,
  AtualizarTarefaEntrada,
  CriarFaseEntrada,
  CriarTarefaEntrada,
  EstruturaCronogramaDTO,
  ImpactoDeAtrasoDTO,
  ReordenarTarefasEntrada,
} from '@contratos/tarefas.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoEstrutura {
  cronogramaId: string | null;
  estrutura: EstruturaCronogramaDTO | null;
  carregando: boolean;
  erro: string | null;
  carregar(cronogramaId: string): Promise<void>;
  criarTarefa(entrada: CriarTarefaEntrada): Promise<void>;
  /** Devolve o impacto quando o término atrasou e há sucessoras a deslocar. */
  atualizarTarefa(entrada: AtualizarTarefaEntrada): Promise<ImpactoDeAtrasoDTO | null>;
  excluirTarefa(id: string): Promise<void>;
  deslocarSucessoras(tarefaId: string, dias: number): Promise<void>;
  criarFase(entrada: CriarFaseEntrada): Promise<void>;
  /** Dá o mesmo início e término a todas as tarefas da fase. */
  ajustarDatasDaFase(entrada: AjustarDatasDaFaseEntrada): Promise<void>;
  renomearFase(id: string, nome: string): Promise<void>;
  excluirFase(id: string): Promise<void>;
  reordenarTarefas(entrada: ReordenarTarefasEntrada): Promise<void>;
  duplicarTarefa(id: string): Promise<void>;
  /** Copia fases e tarefas para outro cronograma (vazio); não mexe na estrutura em tela. */
  copiarEstrutura(origemId: string, destinoId: string): Promise<void>;
  definirErro(erro: string | null): void;
}

export const useEstruturaStore = create<EstadoEstrutura>()((set, get) => ({
  cronogramaId: null,
  estrutura: null,
  carregando: false,
  erro: null,

  async carregar(cronogramaId) {
    const trocouDeCronograma = get().cronogramaId !== cronogramaId;
    set({ cronogramaId, carregando: true, ...(trocouDeCronograma && { estrutura: null }) });
    try {
      const estrutura = await clienteDesktop.tarefas.obterEstrutura(cronogramaId);
      // Ignora respostas atrasadas de um cronograma que já não está na tela.
      if (get().cronogramaId === cronogramaId) set({ estrutura, erro: null });
    } catch (erro) {
      set({ erro: mensagemDeErro(erro) });
    } finally {
      set({ carregando: false });
    }
  },

  async criarTarefa(entrada) {
    await clienteDesktop.tarefas.criar(entrada);
    await get().carregar(entrada.cronogramaId);
  },

  async atualizarTarefa(entrada) {
    const cronogramaId = get().cronogramaId;
    const { impacto } = await clienteDesktop.tarefas.atualizar(entrada);
    if (cronogramaId) await get().carregar(cronogramaId);
    return impacto;
  },

  async excluirTarefa(id) {
    const cronogramaId = get().cronogramaId;
    await clienteDesktop.tarefas.excluir(id);
    if (cronogramaId) await get().carregar(cronogramaId);
  },

  async deslocarSucessoras(tarefaId, dias) {
    const cronogramaId = get().cronogramaId;
    await clienteDesktop.tarefas.deslocarSucessoras({ tarefaId, dias });
    if (cronogramaId) await get().carregar(cronogramaId);
  },

  async criarFase(entrada) {
    await clienteDesktop.tarefas.criarFase(entrada);
    await get().carregar(entrada.cronogramaId);
  },

  async ajustarDatasDaFase(entrada) {
    const cronogramaId = get().cronogramaId;
    await clienteDesktop.tarefas.ajustarDatasDaFase(entrada);
    if (cronogramaId) await get().carregar(cronogramaId);
  },

  async renomearFase(id, nome) {
    const cronogramaId = get().cronogramaId;
    await clienteDesktop.tarefas.atualizarFase({ id, nome });
    if (cronogramaId) await get().carregar(cronogramaId);
  },

  async excluirFase(id) {
    const cronogramaId = get().cronogramaId;
    await clienteDesktop.tarefas.excluirFase(id);
    if (cronogramaId) await get().carregar(cronogramaId);
  },

  async reordenarTarefas(entrada) {
    const cronogramaId = get().cronogramaId;
    await clienteDesktop.tarefas.reordenar(entrada);
    if (cronogramaId) await get().carregar(cronogramaId);
  },

  async duplicarTarefa(id) {
    const cronogramaId = get().cronogramaId;
    await clienteDesktop.tarefas.duplicar(id);
    if (cronogramaId) await get().carregar(cronogramaId);
  },

  async copiarEstrutura(origemId, destinoId) {
    await clienteDesktop.tarefas.copiarEstrutura({ origemId, destinoId });
  },

  definirErro(erro) {
    set({ erro });
  },
}));
