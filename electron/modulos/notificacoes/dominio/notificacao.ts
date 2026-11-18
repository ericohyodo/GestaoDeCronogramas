export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  /** Deduplicação de avisos de rotina (ver `NovaNotificacao.chave`). */
  chave: string | null;
  criadaEm: Date;
  lidaEm: Date | null;
}

export interface RepositorioNotificacoes {
  /** Insere só para usuários que existem (um destinatário removido não quebra a operação de negócio). */
  inserir(notificacoes: Notificacao[]): Promise<void>;
  listarDoUsuario(usuarioId: string, limite: number): Promise<Notificacao[]>;
  contarNaoLidas(usuarioId: string): Promise<number>;
  marcarLida(id: string, usuarioId: string, agora: Date): Promise<void>;
  marcarTodasLidas(usuarioId: string, agora: Date): Promise<void>;
}

const TAMANHO_MAXIMO_TITULO = 120;
const TAMANHO_MAXIMO_MENSAGEM = 500;

/** Corta textos longos (ex.: descrição da AV) para caber no sino. */
export function resumir(texto: string, maximo: number): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  return limpo.length <= maximo ? limpo : `${limpo.slice(0, maximo - 1)}…`;
}

export const limitarTitulo = (texto: string) => resumir(texto, TAMANHO_MAXIMO_TITULO);
export const limitarMensagem = (texto: string) => resumir(texto, TAMANHO_MAXIMO_MENSAGEM);
