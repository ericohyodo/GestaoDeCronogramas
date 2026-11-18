import type { AppAberto, AvisoDeAtualizacao } from '../dominio/aviso-de-atualizacao';

/**
 * Quadro compartilhado na pasta de rede dos dados reais: o aviso de atualização e a lista de apps abertos.
 * Fica fora do banco de propósito: o modo apresentação (banco próprio) e a tela de login também o leem.
 */
export interface QuadroDaAtualizacao {
  lerAviso(): Promise<AvisoDeAtualizacao | null>;
  gravarAviso(aviso: AvisoDeAtualizacao): Promise<void>;
  /** Apaga o aviso; com `id`, só se ainda for aquele (não apaga um pedido mais novo). */
  apagarAviso(id?: string): Promise<void>;
  registrarApp(app: AppAberto): Promise<void>;
  /** Síncrono: roda no fechamento do app, que não espera promessas. */
  removerApp(instanciaId: string): void;
  listarApps(): Promise<AppAberto[]>;
  /** Apaga registros de apps que pararam de dar sinal (queda de energia, app encerrado à força). */
  apagarAppsSemSinalDesde(limite: Date): Promise<void>;
}

/** Identidade deste app aberto. */
export interface EsteApp {
  instanciaId: string;
  computador: string;
  usuarioDoWindows: string;
  versao: string;
  modo: 'normal' | 'apresentacao';
  desde: Date;
}

export interface QuemEstaLogado {
  nomeDoUsuarioAtual(): string | null;
}
