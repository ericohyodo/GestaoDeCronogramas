import { create } from 'zustand';
import type {
  ConfigurarIaEntrada,
  EscopoIaDTO,
  EstadoIaDTO,
  InstrucoesIaDTO,
  SalvarInstrucoesIaEntrada,
} from '@contratos/ia.contrato';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';

export interface EstadoDaStoreIa {
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

/** Cada módulo (Projetos e AVs) tem a sua IA: modelo e instruções próprios; por isso, uma store para cada. */
function criarStoreIa(escopo: EscopoIaDTO) {
  const api = clienteDesktop.ia;
  const avs = escopo === 'avs';
  return create<EstadoDaStoreIa>()((set) => ({
    estado: null,
    instrucoes: null,

    async carregar() {
      set({ estado: await (avs ? api.estadoAvs() : api.estado()) });
    },

    async configurar(entrada) {
      set({ estado: await (avs ? api.configurarAvs(entrada) : api.configurar(entrada)) });
    },

    async removerChave() {
      set({ estado: await (avs ? api.removerChaveAvs() : api.removerChave()) });
    },

    async carregarInstrucoes() {
      set({ instrucoes: await (avs ? api.obterInstrucoesAvs() : api.obterInstrucoes()) });
    },

    async salvarInstrucoes(entrada) {
      set({ instrucoes: await (avs ? api.salvarInstrucoesAvs(entrada) : api.salvarInstrucoes(entrada)) });
    },

    async restaurarChecklist() {
      set({ instrucoes: await (avs ? api.restaurarChecklistAvs() : api.restaurarChecklist()) });
    },
  }));
}

export const useIaStore = criarStoreIa('projetos');
export const useIaAvsStore = criarStoreIa('avs');

/** A store do módulo pedido (a escolha é fixa por tela, então não muda entre renderizações). */
export function usarStoreIa(escopo: EscopoIaDTO) {
  return escopo === 'avs' ? useIaAvsStore : useIaStore;
}
