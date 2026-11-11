/**
 * Atualização do sistema: o administrador pede que todos fechem o app antes de trocar o executável na pasta
 * de rede (o Windows não deixa substituir um .exe em uso).
 */

/** Prazos oferecidos para o fechamento, em minutos. */
export const PRAZOS_DE_FECHAMENTO_EM_MINUTOS = [2, 5, 10, 15] as const;

/** Depois do prazo, por quanto tempo o app não abre (a nova versão libera antes, ao abrir). */
export const JANELA_DA_ATUALIZACAO_EM_MINUTOS = 30;

/** Tamanho máximo da mensagem opcional do administrador. */
export const TAMANHO_DA_MENSAGEM_DE_ATUALIZACAO = 300;

/**
 * - `normal`: nada pedido;
 * - `aviso`: fechamento pedido, contagem regressiva até `fecharEm`;
 * - `bloqueado`: prazo vencido, o app fecha sozinho (e não abre) até a atualização terminar.
 */
export type FaseDaAtualizacaoDTO = 'normal' | 'aviso' | 'bloqueado';

export interface EstadoDaAtualizacaoDTO {
  fase: FaseDaAtualizacaoDTO;
  /** Instante (ISO) em que o app fecha sozinho; `null` na fase normal. */
  fecharEm: string | null;
  solicitadoPor: string | null;
  mensagem: string | null;
  /** Este app está no modo apresentação (o administrador não dispara atualização daqui). */
  emApresentacao: boolean;
}

export interface SolicitarFechamentoEntrada {
  minutos: number;
  mensagem?: string | null;
}

/** Um app aberto agora (em qualquer computador), inclusive parado na tela de login. */
export interface AppAbertoDTO {
  instanciaId: string;
  computador: string;
  usuarioDoWindows: string;
  /** Usuário logado no app; `null` na tela de login. */
  usuario: string | null;
  modo: 'normal' | 'apresentacao';
  versao: string;
  /** Desde quando (ISO) este app está aberto. */
  desde: string;
  /** É o app de quem está consultando. */
  esteApp: boolean;
}
