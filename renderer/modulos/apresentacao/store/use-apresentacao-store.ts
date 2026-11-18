import { create } from 'zustand';
import type { EstadoApresentacaoDTO } from '@contratos/apresentacao.contrato';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';

interface EstadoDoModo {
  estado: EstadoApresentacaoDTO | null;
  carregar(): Promise<void>;
  /** Reinicia o app no modo apresentação (dados fictícios). */
  entrar(): Promise<void>;
  /** Reinicia o app de volta aos dados reais. */
  sair(): Promise<void>;
}

export const useApresentacaoStore = create<EstadoDoModo>()((set) => ({
  estado: null,
  async carregar() {
    try {
      set({ estado: await clienteDesktop.apresentacao.obterEstado() });
    } catch {
      set({ estado: { ativo: false, roteiro: null } });
    }
  },
  async entrar() {
    await clienteDesktop.apresentacao.entrar();
  },
  async sair() {
    await clienteDesktop.apresentacao.sair();
  },
}));
