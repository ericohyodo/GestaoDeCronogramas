export interface NotificacaoDTO {
  id: string;
  /** Identificador do evento (ex.: `sd.aberta`, `av.etapa_liberada`). */
  tipo: string;
  titulo: string;
  mensagem: string;
  /** Rota do app para abrir ao clicar. */
  link: string | null;
  criadaEm: string;
  lida: boolean;
}

export interface CaixaDeNotificacoesDTO {
  naoLidas: number;
  /** Mais recentes primeiro (limite de 50). */
  itens: NotificacaoDTO[];
}
