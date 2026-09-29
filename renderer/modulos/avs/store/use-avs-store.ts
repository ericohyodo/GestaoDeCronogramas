import { create } from 'zustand';
import type {
  AtualizarComercialEntrada,
  AtualizarEquipeEntrada,
  AvancarEtapaEntrada,
  AplicarAoGrupoEntrada,
  AplicarAoGrupoSaida,
  AvDetalheDTO,
  GrupoAvDTO,
  CriarGrupoAvEntrada,
  AvResumoDTO,
  CriarAvEntrada,
  DashboardAvDTO,
  DeclinarAvEntrada,
  MembroAreaDTO,
} from '@contratos/avs.contrato';
import type { SdDTO } from '@contratos/sds.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoAvs {
  itens: AvResumoDTO[];
  detalhesPorId: Record<string, AvDetalheDTO>;
  membros: MembroAreaDTO[];
  grupos: GrupoAvDTO[];
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
  /** Cria as AVs de exemplo (administrador) e recarrega a lista; devolve quantas foram criadas. */
  gerarExemplos(): Promise<{ criadas: number; jaExistiam: boolean }>;
  /** Finaliza a AV e cria a Pré-SD; a AV (etapa) é recarregada. */
  finalizarECriarPreSd(avId: string): Promise<SdDTO>;
  carregarGrupos(): Promise<GrupoAvDTO[]>;
  /** Cria o grupo com N AVs novas e recarrega a lista. */
  criarGrupo(entrada: CriarGrupoAvEntrada): Promise<GrupoAvDTO>;
  aplicarAoGrupo(entrada: AplicarAoGrupoEntrada): Promise<AplicarAoGrupoSaida>;
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

  /** Depois de mexer nos grupos, a lista e o cache de detalhes precisam refletir quem está em qual grupo. */
  const sincronizarGrupos = (grupos: GrupoAvDTO[]) => {
    const grupoDaAv = new Map<string, { id: string; nome: string }>();
    for (const grupo of grupos) for (const av of grupo.avs) grupoDaAv.set(av.id, { id: grupo.id, nome: grupo.nome });
    set((estado) => ({
      grupos,
      itens: estado.itens.map((av) => ({ ...av, grupo: grupoDaAv.get(av.id) ?? null })),
      detalhesPorId: Object.fromEntries(
        Object.entries(estado.detalhesPorId).map(([id, av]) => [id, { ...av, grupo: grupoDaAv.get(id) ?? null }]),
      ),
    }));
  };

  return {
    itens: [],
    detalhesPorId: {},
    membros: [],
    grupos: [],
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

    async gerarExemplos() {
      const saida = await clienteDesktop.avs.gerarExemplos();
      set({ itens: ordenar(await clienteDesktop.avs.listar()) });
      return saida;
    },

    async finalizarECriarPreSd(avId) {
      const sd = await clienteDesktop.avs.finalizarECriarPreSd(avId);
      aplicar(await clienteDesktop.avs.obter(avId));
      return sd;
    },

    async carregarGrupos() {
      const grupos = await clienteDesktop.avs.listarGrupos();
      sincronizarGrupos(grupos);
      return grupos;
    },

    async criarGrupo(entrada) {
      const grupo = await clienteDesktop.avs.criarGrupo(entrada);
      set({ itens: ordenar(await clienteDesktop.avs.listar()) });
      sincronizarGrupos(await clienteDesktop.avs.listarGrupos());
      return grupo;
    },

    async aplicarAoGrupo(entrada) {
      return clienteDesktop.avs.aplicarAoGrupo(entrada);
    },

    limparErro() {
      set({ erro: null });
    },
  };
});
