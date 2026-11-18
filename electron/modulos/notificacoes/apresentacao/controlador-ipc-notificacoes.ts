import { CANAIS } from '@contratos/canais';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type {
  MarcarNotificacaoLida,
  MarcarTodasNotificacoesLidas,
  ObterCaixaDeNotificacoes,
} from '../aplicacao/casos-de-uso';

export interface CasosDeUsoNotificacoes {
  obterCaixa: ObterCaixaDeNotificacoes;
  marcarLida: MarcarNotificacaoLida;
  marcarTodasLidas: MarcarTodasNotificacoesLidas;
}

/** Todo usuário logado lê e marca só as próprias notificações (o caso de uso usa a sessão). */
export function registrarIpcNotificacoes(ipc: RegistradorIpc, casos: CasosDeUsoNotificacoes): void {
  ipc.registrar(CANAIS.notificacoes.obterCaixa, 'leitura', esquemaSemEntrada, () => casos.obterCaixa.executar());
  ipc.registrar(CANAIS.notificacoes.marcarLida, 'leitura', esquemaId, (id) => casos.marcarLida.executar(id));
  ipc.registrar(CANAIS.notificacoes.marcarTodasLidas, 'leitura', esquemaSemEntrada, () =>
    casos.marcarTodasLidas.executar(),
  );
}
