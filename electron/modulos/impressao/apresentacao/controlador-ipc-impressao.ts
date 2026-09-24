import { CANAIS } from '@contratos/canais';
import { esquemaId } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { ExportarPdf } from '../aplicacao/exportar-pdf';

export function registrarIpcImpressao(ipc: RegistradorIpc, casos: { exportarPdf: ExportarPdf }): void {
  // Quem pode ver o cronograma pode imprimi-lo.
  ipc.registrar(CANAIS.impressao.exportarPdf, 'leitura', esquemaId, (cronogramaId) =>
    casos.exportarPdf.executar(cronogramaId),
  );
}
