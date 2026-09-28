import { create } from 'zustand';
import type {
  ConfigurarIaEntrada,
  EstadoIaDTO,
  InstrucoesIaDTO,
  SalvarInstrucoesIaEntrada,
} from '@contratos/ia.contrato';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';

interface EstadoDaStoreIa {
  /** `null` até a primeira leitura. */
  estado: EstadoIaDTO | null;
  instrucoes: InstrucoesIaDTO | null;
  carregar(): Promise<void>;
  /** As mutações lançam o erro para o formulário exibir. */
  configurar(entrada: ConfigurarIaEntrada): Promise<void>;
  removerChave(): Promise<void>;
  carregarInstrucoes(): Promise<void>;
  salvarInstrucoes(entrada: SalvarInstrucoesIaEntrada): Promise<void>;
  restaurarChecklist(): Promise<void>;
}

export const useIaStore = create<EstadoDaStoreIa>()((set) => ({
  estado: null,
  instrucoes: null,

  async carregar() {
    set({ estado: await clienteDesktop.ia.estado() });
  },

  async configurar(entrada) {
    set({ estado: await clienteDesktop.ia.configurar(entrada) });
  },

  async removerChave() {
    set({ estado: await clienteDesktop.ia.removerChave() });
  },

  async carregarInstrucoes() {
    set({ instrucoes: await clienteDesktop.ia.obterInstrucoes() });
  },

  async salvarInstrucoes(entrada) {
    set({ instrucoes: await clienteDesktop.ia.salvarInstrucoes(entrada) });
  },

  async restaurarChecklist() {
    set({ instrucoes: await clienteDesktop.ia.restaurarChecklist() });
  },
}));
