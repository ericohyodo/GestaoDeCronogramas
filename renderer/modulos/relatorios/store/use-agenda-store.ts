import { create } from 'zustand';
import type { ItemAgendaDTO } from '@contratos/tarefas.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoAgenda {
  itens: ItemAgendaDTO[];
  carregando: boolean;
  erro: string | null;
  /**
   * Tarefas marcadas ou desmarcadas nesta visita: continuam na lista mesmo com
   * "Mostrar concluídas" desligado, para o item não sumir debaixo do cursor.
   */
  alteradasAgora: Set<string>;
  carregar(): Promise<void>;
  alternarConclusao(tarefaId: string): Promise<void>;
  limparErro(): void;
}

const comPercentual = (itens: ItemAgendaDTO[], tarefaId: string, percentualConcluido: number) =>
  itens.map((item) => (item.tarefaId === tarefaId ? { ...item, percentualConcluido } : item));

export const useAgendaStore = create<EstadoAgenda>()((set, get) => ({
  itens: [],
  carregando: false,
  erro: null,
  alteradasAgora: new Set(),

  async carregar() {
    set({ carregando: true, erro: null });
    try {
      set({ itens: await clienteDesktop.tarefas.listarAgenda(), alteradasAgora: new Set() });
    } catch (erro) {
      set({ erro: mensagemDeErro(erro) });
    } finally {
      set({ carregando: false });
    }
  },

  // Otimista: o check responde na hora e volta atrás se o main recusar.
  async alternarConclusao(tarefaId) {
    const item = get().itens.find((atual) => atual.tarefaId === tarefaId);
    if (!item) return;
    const anterior = item.percentualConcluido;
    const novo = anterior === 100 ? 0 : 100;
    set((estado) => ({
      itens: comPercentual(estado.itens, tarefaId, novo),
      alteradasAgora: new Set(estado.alteradasAgora).add(tarefaId),
    }));
    try {
      await clienteDesktop.tarefas.atualizar({ id: tarefaId, percentualConcluido: novo });
    } catch (erro) {
      set((estado) => ({
        itens: comPercentual(estado.itens, tarefaId, anterior),
        erro: mensagemDeErro(erro),
      }));
    }
  },

  limparErro() {
    set({ erro: null });
  },
}));
