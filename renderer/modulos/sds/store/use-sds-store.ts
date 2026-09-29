import { create } from 'zustand';
import type { SdDTO } from '@contratos/sds.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoSds {
  itens: SdDTO[];
  carregando: boolean;
  erro: string | null;
  carregar(): Promise<void>;
  limparErro(): void;
}

export const useSdsStore = create<EstadoSds>()((set) => ({
  itens: [],
  carregando: false,
  erro: null,

  async carregar() {
    set({ carregando: true, erro: null });
    try {
      set({ itens: await clienteDesktop.sds.listar() });
    } catch (erro) {
      set({ erro: mensagemDeErro(erro) });
    } finally {
      set({ carregando: false });
    }
  },

  limparErro() {
    set({ erro: null });
  },
}));
