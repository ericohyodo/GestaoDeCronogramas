import { create } from 'zustand';
import type { UsuarioDTO } from '@contratos/sessao.contrato';
import type {
  AlterarSenhaEntrada,
  AtualizarUsuarioEntrada,
  CriarUsuarioEntrada,
} from '@contratos/usuarios.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoUsuarios {
  itens: UsuarioDTO[];
  carregando: boolean;
  erro: string | null;
  carregar(): Promise<void>;
  criar(entrada: CriarUsuarioEntrada): Promise<void>;
  atualizar(entrada: AtualizarUsuarioEntrada): Promise<void>;
  alterarSenha(entrada: AlterarSenhaEntrada): Promise<void>;
  excluir(id: string): Promise<void>;
  limparErro(): void;
}

export const useUsuariosStore = create<EstadoUsuarios>()((set, get) => ({
  itens: [],
  carregando: false,
  erro: null,

  async carregar() {
    set({ carregando: true, erro: null });
    try {
      set({ itens: await clienteDesktop.usuarios.listar() });
    } catch (erro) {
      set({ erro: mensagemDeErro(erro) });
    } finally {
      set({ carregando: false });
    }
  },

  async criar(entrada) {
    await clienteDesktop.usuarios.criar(entrada);
    await get().carregar();
  },

  async atualizar(entrada) {
    await clienteDesktop.usuarios.atualizar(entrada);
    await get().carregar();
  },

  async alterarSenha(entrada) {
    await clienteDesktop.usuarios.alterarSenha(entrada);
  },

  async excluir(id) {
    await clienteDesktop.usuarios.excluir(id);
    await get().carregar();
  },

  limparErro() {
    set({ erro: null });
  },
}));
