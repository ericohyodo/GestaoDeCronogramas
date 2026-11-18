// =====================================================================================================
// Regras do aviso de atualização: em que fase cada app está, dado o aviso gravado na pasta compartilhada.
// =====================================================================================================

/** Pedido de fechamento gravado pelo administrador. */
export interface AvisoDeAtualizacao {
  id: string;
  fecharEm: Date;
  solicitadoEm: Date;
  solicitadoPor: string;
  mensagem: string | null;
  /** Versão do app de quem pediu: uma versão mais nova, ao abrir, encerra o aviso. */
  versaoNoPedido: string;
}

/** Um app aberto, como registrado na pasta compartilhada. */
export interface AppAberto {
  instanciaId: string;
  computador: string;
  usuarioDoWindows: string;
  usuario: string | null;
  modo: 'normal' | 'apresentacao';
  versao: string;
  desde: Date;
  ultimoSinal: Date;
}

/**
 * Compara versões `maior.menor.correção` (partes ausentes ou não numéricas contam como 0).
 * @returns negativo se `a` < `b`, 0 se iguais, positivo se `a` > `b`
 */
export function compararVersoes(a: string, b: string): number {
  const partes = (versao: string) => versao.split(/[.+-]/).slice(0, 3).map((parte) => Number.parseInt(parte, 10) || 0);
  const [pa, pb] = [partes(a), partes(b)];
  for (let i = 0; i < 3; i++) {
    const diferenca = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diferenca !== 0) return diferenca;
  }
  return 0;
}

export type FaseDaAtualizacao = 'normal' | 'aviso' | 'bloqueado';

/**
 * Fase deste app diante do aviso.
 * @param aviso pedido gravado (ou `null`)
 * @param agora relógio deste computador
 * @param versaoAtual versão deste app
 * @param janelaMs depois do prazo, por quanto tempo o app fica bloqueado
 * @returns a fase e se o aviso já pode ser apagado (vencida a janela, ou este app já é a versão nova)
 */
export function faseDaAtualizacao(
  aviso: AvisoDeAtualizacao | null,
  agora: Date,
  versaoAtual: string,
  janelaMs: number,
): { fase: FaseDaAtualizacao; encerrado: boolean } {
  if (!aviso) return { fase: 'normal', encerrado: false };
  if (compararVersoes(versaoAtual, aviso.versaoNoPedido) > 0) return { fase: 'normal', encerrado: true };
  const instante = agora.getTime();
  if (instante < aviso.fecharEm.getTime()) return { fase: 'aviso', encerrado: false };
  if (instante < aviso.fecharEm.getTime() + janelaMs) return { fase: 'bloqueado', encerrado: false };
  return { fase: 'normal', encerrado: true };
}
