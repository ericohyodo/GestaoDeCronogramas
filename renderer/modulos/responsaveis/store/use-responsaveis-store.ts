import { create } from 'zustand';
import type {
  AtualizarResponsavelEntrada,
  CriarResponsavelEntrada,
  ResponsavelDTO,
} from '@contratos/responsaveis.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoResponsaveis {
  itens: ResponsavelDTO[];
  carregando: boolean;
  carregado: boolean;
  erro: string | null;
  carregar(): Promise<void>;
  criar(entrada: CriarResponsavelEntrada): Promise<void>;
  atualizar(entrada: AtualizarResponsavelEntrada): Promise<void>;
  excluir(id: string): Promise<void>;
  limparErro(): void;
}

export const useResponsaveisStore = create<EstadoResponsaveis>()((set, get) => ({
  itens: [],
  carregando: false,
  carregado: false,
  erro: null,

  async carregar() {
    set({ carregando: true, erro: null });
    try {
      set({ itens: await clienteDesktop.responsaveis.listar(), carregado: true });
    } catch (erro) {
      set({ erro: mensagemDeErro(erro) });
    } finally {
      set({ carregando: false });
    }
  },

  async criar(entrada) {
    await clienteDesktop.responsaveis.criar(entrada);
    await get().carregar();
  },

  async atualizar(entrada) {
    await clienteDesktop.responsaveis.atualizar(entrada);
    await get().carregar();
  },

  async excluir(id) {
    await clienteDesktop.responsaveis.excluir(id);
    await get().carregar();
  },

  limparErro() {
    set({ erro: null });
  },
}));
