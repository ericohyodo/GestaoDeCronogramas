import { create } from 'zustand';
import type {
  AtualizarComercialEntrada,
  AtualizarEquipeEntrada,
  AvancarEtapaEntrada,
  AvDetalheDTO,
  AvResumoDTO,
  CriarAvEntrada,
  DashboardAvDTO,
  DeclinarAvEntrada,
  MembroAreaDTO,
} from '@contratos/avs.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoAvs {
  itens: AvResumoDTO[];
  detalhesPorId: Record<string, AvDetalheDTO>;
  membros: MembroAreaDTO[];
  dashboard: DashboardAvDTO | null;
  carregando: boolean;
  erro: string | null;
  carregar(): Promise<void>;
  carregarMembros(): Promise<void>;
  carregarDashboard(): Promise<void>;
  carregarUm(id: string): Promise<AvDetalheDTO>;
  criar(entrada: CriarAvEntrada): Promise<AvDetalheDTO>;
  atualizarComercial(entrada: AtualizarComercialEntrada): Promise<AvDetalheDTO>;
  atualizarEquipe(entrada: AtualizarEquipeEntrada): Promise<AvDetalheDTO>;
  avancarEtapa(entrada: AvancarEtapaEntrada): Promise<AvDetalheDTO>;
  declinar(entrada: DeclinarAvEntrada): Promise<AvDetalheDTO>;
  limparErro(): void;
}

// Mais recentes primeiro.
const ordenar = (itens: AvResumoDTO[]) => [...itens].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
const substituir = (itens: AvResumoDTO[], av: AvResumoDTO) =>
  ordenar([...itens.filter((item) => item.id !== av.id), av]);

export const useAvsStore = create<EstadoAvs>()((set) => {
  /** Toda mutação devolve o `AvDetalheDTO` atualizado: atualiza a lista e o cache de detalhe juntos. */
  const aplicar = (av: AvDetalheDTO): AvDetalheDTO => {
    set((estado) => ({
      itens: substituir(estado.itens, av),
      detalhesPorId: { ...estado.detalhesPorId, [av.id]: av },
    }));
    return av;
  };

  return {
    itens: [],
    detalhesPorId: {},
    membros: [],
    dashboard: null,
    carregando: false,
    erro: null,

    async carregar() {
      set({ carregando: true, erro: null });
      try {
        set({ itens: ordenar(await clienteDesktop.avs.listar()) });
      } catch (erro) {
        set({ erro: mensagemDeErro(erro) });
      } finally {
        set({ carregando: false });
      }
    },

    async carregarMembros() {
      set({ membros: await clienteDesktop.avs.listarMembros() });
    },

    async carregarDashboard() {
      set({ dashboard: await clienteDesktop.avs.obterDashboard() });
    },

    async carregarUm(id) {
      return aplicar(await clienteDesktop.avs.obter(id));
    },

    async criar(entrada) {
      return aplicar(await clienteDesktop.avs.criar(entrada));
    },

    async atualizarComercial(entrada) {
      return aplicar(await clienteDesktop.avs.atualizarComercial(entrada));
    },

    async atualizarEquipe(entrada) {
      return aplicar(await clienteDesktop.avs.atualizarEquipe(entrada));
    },

    async avancarEtapa(entrada) {
      return aplicar(await clienteDesktop.avs.avancarEtapa(entrada));
    },

    async declinar(entrada) {
      return aplicar(await clienteDesktop.avs.declinar(entrada));
    },

    limparErro() {
      set({ erro: null });
    },
  };
});
