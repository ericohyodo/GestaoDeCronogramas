import { z } from 'zod';
import { TAMANHO_DA_MENSAGEM_DE_ATUALIZACAO } from '@contratos/atualizacao.contrato';
import { CANAIS } from '@contratos/canais';
import { esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type {
  CancelarFechamento,
  ListarAppsAbertos,
  ObterEstadoDaAtualizacao,
  SolicitarFechamento,
} from '../aplicacao/casos-de-uso';

export interface CasosDeUsoAtualizacao {
  obterEstado: ObterEstadoDaAtualizacao;
  solicitar: SolicitarFechamento;
  cancelar: CancelarFechamento;
  listarAppsAbertos: ListarAppsAbertos;
  /** Fecha este app (botão "Fechar agora"). */
  fecharEsteApp(): void;
}

const esquemaSolicitar = z.object({
  minutos: z.number().int().positive(),
  mensagem: z.string().max(TAMANHO_DA_MENSAGEM_DE_ATUALIZACAO).nullish(),
});

/**
 * Estado e "Fechar agora" são públicos: o aviso aparece também na tela de login.
 * Pedir, cancelar e ver os apps abertos é só do administrador.
 */
export function registrarIpcAtualizacao(ipc: RegistradorIpc, casos: CasosDeUsoAtualizacao): void {
  ipc.registrar(CANAIS.atualizacao.obterEstado, 'publico', esquemaSemEntrada, () => casos.obterEstado.executar());
  ipc.registrar(CANAIS.atualizacao.fecharAgora, 'publico', esquemaSemEntrada, async () => {
    casos.fecharEsteApp();
    return null;
  });
  ipc.registrar(CANAIS.atualizacao.solicitar, 'administracao', esquemaSolicitar, (entrada) =>
    casos.solicitar.executar(entrada),
  );
  ipc.registrar(CANAIS.atualizacao.cancelar, 'administracao', esquemaSemEntrada, () => casos.cancelar.executar());
  ipc.registrar(CANAIS.atualizacao.listarAppsAbertos, 'administracao', esquemaSemEntrada, () =>
    casos.listarAppsAbertos.executar(),
  );
}
