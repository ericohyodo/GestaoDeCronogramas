/**
 * Notificação a ser entregue (sino do app). Os módulos de negócio só descrevem o evento; quem grava e
 * entrega é o módulo `notificacoes`.
 */
export interface NovaNotificacao {
  /** Destinatários; nulos, repetidos e usuários inexistentes são ignorados. */
  usuarioIds: readonly (string | null | undefined)[];
  /** Quem causou o evento não recebe a própria notificação. */
  excetoUsuarioId?: string | null;
  /** Identificador estável do evento (ex.: `sd.aberta`), para filtros e para o futuro resumo por e-mail. */
  tipo: string;
  titulo: string;
  mensagem: string;
  /** Rota do app aberta ao clicar (ex.: `/sds/detalhe/?id=…`). */
  link?: string | null;
  /** Evita repetir: quem já recebeu este `tipo` com esta `chave` não recebe de novo (avisos de rotina). */
  chave?: string | null;
}

export interface Notificador {
  notificar(notificacao: NovaNotificacao): Promise<void>;
}

/** Sem entrega (testes e montagens que não precisam). */
export const semNotificacao: Notificador = { notificar: async () => undefined };
