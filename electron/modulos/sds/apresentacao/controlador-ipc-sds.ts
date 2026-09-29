import { CANAIS } from '@contratos/canais';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { ListarSds, ObterSdPorAv } from '../aplicacao/casos-de-uso/consultar-sds';

export interface CasosDeUsoSds {
  listar: ListarSds;
  obterPorAv: ObterSdPorAv;
}

export function registrarIpcSds(ipc: RegistradorIpc, casos: CasosDeUsoSds): void {
  ipc.registrar(CANAIS.sds.listar, 'leitura', esquemaSemEntrada, () => casos.listar.executar());
  ipc.registrar(CANAIS.sds.obterPorAv, 'leitura', esquemaId, (avId) => casos.obterPorAv.executar(avId));
}
