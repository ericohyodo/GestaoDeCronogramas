/**
 * API pública do módulo Notificações (sino da barra superior).
 * Outros módulos recebem só o `Notificador`; a caixa do usuário é servida por IPC.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Notificador } from '../../nucleo/aplicacao/portas/notificador';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import {
  MarcarNotificacaoLida,
  MarcarTodasNotificacoesLidas,
  NotificadorInterno,
  ObterCaixaDeNotificacoes,
  type QuemEstaLogado,
} from './aplicacao/casos-de-uso';
import { registrarIpcNotificacoes } from './apresentacao/controlador-ipc-notificacoes';
import { RepositorioNotificacoesSqlite } from './infraestrutura/repositorio-notificacoes-sqlite';

export interface DependenciasModuloNotificacoes {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  logado: QuemEstaLogado;
}

export interface ModuloNotificacoes {
  notificador: Notificador;
}

export function montarModuloNotificacoes(deps: DependenciasModuloNotificacoes): ModuloNotificacoes {
  const repositorio = new RepositorioNotificacoesSqlite(deps.db);
  registrarIpcNotificacoes(deps.ipc, {
    obterCaixa: new ObterCaixaDeNotificacoes(repositorio, deps.logado, deps.relogio),
    marcarLida: new MarcarNotificacaoLida(repositorio, deps.logado, deps.relogio),
    marcarTodasLidas: new MarcarTodasNotificacoesLidas(repositorio, deps.logado, deps.relogio),
  });
  return { notificador: new NotificadorInterno(repositorio, deps.relogio, deps.geradorDeId) };
}
