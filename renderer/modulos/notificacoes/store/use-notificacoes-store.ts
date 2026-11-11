import { create } from 'zustand';
import type { CaixaDeNotificacoesDTO, NotificacaoDTO } from '@contratos/notificacoes.contrato';
import { clienteDesktop } from '@/compartilhado/api/cliente-desktop';

// =====================================================================================================
// Caixa de notificações do usuário logado. Atualizada por consulta periódica (o banco é compartilhado
// entre PCs, então não há como o servidor "empurrar"): a cada leitura, o que chegou de novo vira aviso.
// =====================================================================================================

interface EstadoNotificacoes {
  naoLidas: number;
  itens: NotificacaoDTO[];
  /** Ids já vistos nesta sessão; `null` antes da primeira leitura (nada vira aviso na abertura). */
  conhecidas: Set<string> | null;
  /** Lê a caixa e devolve as notificações que chegaram desde a última leitura. */
  atualizar(): Promise<NotificacaoDTO[]>;
  marcarLida(id: string): Promise<void>;
  marcarTodasLidas(): Promise<void>;
  /** Ao sair da conta: esquece a caixa do usuário anterior. */
  limpar(): void;
}

export const useNotificacoesStore = create<EstadoNotificacoes>()((set, get) => {
  const aplicar = (caixa: CaixaDeNotificacoesDTO) => set({ naoLidas: caixa.naoLidas, itens: caixa.itens });

  return {
    naoLidas: 0,
    itens: [],
    conhecidas: null,

    async atualizar() {
      const caixa = await clienteDesktop.notificacoes.obterCaixa();
      const conhecidas = get().conhecidas;
      const novas = conhecidas ? caixa.itens.filter((item) => !item.lida && !conhecidas.has(item.id)) : [];
      set({ conhecidas: new Set([...(conhecidas ?? []), ...caixa.itens.map((item) => item.id)]) });
      aplicar(caixa);
      return novas;
    },

    async marcarLida(id) {
      aplicar(await clienteDesktop.notificacoes.marcarLida(id));
    },

    async marcarTodasLidas() {
      aplicar(await clienteDesktop.notificacoes.marcarTodasLidas());
    },

    limpar() {
      set({ naoLidas: 0, itens: [], conhecidas: null });
    },
  };
});
