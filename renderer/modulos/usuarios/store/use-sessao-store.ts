import { create } from 'zustand';
import type {
  EntrarEntrada,
  PermissaoDTO,
  PrimeiroAcessoEntrada,
  SessaoDTO,
} from '@contratos/sessao.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoSessao {
  sessao: SessaoDTO | null;
  carregando: boolean;
  erro: string | null;
  carregar(): Promise<void>;
  entrar(entrada: EntrarEntrada): Promise<void>;
  primeiroAcesso(entrada: PrimeiroAcessoEntrada): Promise<void>;
  sair(): Promise<void>;
}

export const useSessaoStore = create<EstadoSessao>()((set) => ({
  sessao: null,
  carregando: true,
  erro: null,

  async carregar() {
    set({ carregando: true });
    try {
      set({ sessao: await clienteDesktop.sessao.obter(), erro: null });
    } catch (erro) {
      set({ erro: mensagemDeErro(erro) });
    } finally {
      set({ carregando: false });
    }
  },

  async entrar(entrada) {
    set({ sessao: await clienteDesktop.sessao.entrar(entrada), erro: null });
  },

  async primeiroAcesso(entrada) {
    set({ sessao: await clienteDesktop.sessao.primeiroAcesso(entrada), erro: null });
  },

  async sair() {
    set({ sessao: await clienteDesktop.sessao.sair() });
  },
}));

/** A UI esconde o que o perfil não pode fazer; o processo principal barra de fato. */
export function usePermissao(permissao: PermissaoDTO): boolean {
  return useSessaoStore((estado) => estado.sessao?.permissoes.includes(permissao) ?? false);
}

export function useUsuarioAtual() {
  return useSessaoStore((estado) => estado.sessao?.usuario ?? null);
}
