import { create } from 'zustand';
import type { TemaDTO } from '@contratos/preferencias.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoPreferencias {
  tema: TemaDTO;
  carregado: boolean;
  erro: string | null;
  carregar(): Promise<void>;
  definirTema(tema: TemaDTO): Promise<void>;
}

export const usePreferenciasStore = create<EstadoPreferencias>()((set, get) => ({
  tema: 'sistema',
  carregado: false,
  erro: null,

  async carregar() {
    try {
      const preferencias = await clienteDesktop.preferencias.obter();
      set({ tema: preferencias.tema, carregado: true, erro: null });
    } catch (erro) {
      set({ carregado: true, erro: mensagemDeErro(erro) });
    }
  },

  async definirTema(tema) {
    const anterior = get().tema;
    set({ tema, erro: null }); // otimista: o main aplica o tema em seguida via nativeTheme
    try {
      await clienteDesktop.preferencias.definirTema(tema);
    } catch (erro) {
      set({ tema: anterior, erro: mensagemDeErro(erro) });
    }
  },
}));
