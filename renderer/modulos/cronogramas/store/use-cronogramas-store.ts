import { create } from 'zustand';
import type {
  AtualizarCronogramaEntrada,
  CriarCronogramaEntrada,
  CronogramaDTO,
} from '@contratos/cronogramas.contrato';
import { clienteDesktop, mensagemDeErro } from '@/compartilhado/api/cliente-desktop';

interface EstadoCronogramas {
  itens: CronogramaDTO[];
  carregando: boolean;
  /** Erro de carregamento da lista. Mutações lançam a exceção para o formulário exibir. */
  erro: string | null;
  carregar(): Promise<void>;
  carregarUm(id: string): Promise<CronogramaDTO>;
  criar(entrada: CriarCronogramaEntrada): Promise<CronogramaDTO>;
  atualizar(entrada: AtualizarCronogramaEntrada): Promise<CronogramaDTO>;
  excluir(id: string): Promise<void>;
  limparErro(): void;
}

// Mesma ordenação do repositório: início e, depois, nome.
const ordenar = (itens: CronogramaDTO[]) =>
  [...itens].sort(
    (a, b) =>
      a.dataInicio.localeCompare(b.dataInicio) ||
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
  );

const substituir = (itens: CronogramaDTO[], cronograma: CronogramaDTO) =>
  ordenar([...itens.filter((item) => item.id !== cronograma.id), cronograma]);

export const useCronogramasStore = create<EstadoCronogramas>()((set) => ({
  itens: [],
  carregando: false,
  erro: null,

  async carregar() {
    set({ carregando: true, erro: null });
    try {
      set({ itens: await clienteDesktop.cronogramas.listar() });
    } catch (erro) {
      set({ erro: mensagemDeErro(erro) });
    } finally {
      set({ carregando: false });
    }
  },

  async carregarUm(id) {
    const cronograma = await clienteDesktop.cronogramas.obter(id);
    set((estado) => ({ itens: substituir(estado.itens, cronograma) }));
    return cronograma;
  },

  async criar(entrada) {
    const cronograma = await clienteDesktop.cronogramas.criar(entrada);
    set((estado) => ({ itens: substituir(estado.itens, cronograma) }));
    return cronograma;
  },

  async atualizar(entrada) {
    const cronograma = await clienteDesktop.cronogramas.atualizar(entrada);
    set((estado) => ({ itens: substituir(estado.itens, cronograma) }));
    return cronograma;
  },

  async excluir(id) {
    await clienteDesktop.cronogramas.excluir(id);
    set((estado) => ({ itens: estado.itens.filter((item) => item.id !== id) }));
  },

  limparErro() {
    set({ erro: null });
  },
}));
