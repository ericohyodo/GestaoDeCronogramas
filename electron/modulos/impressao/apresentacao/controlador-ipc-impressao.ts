import { CANAIS } from '@contratos/canais';
import { esquemaId } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { ExportarAnalisePdf } from '../aplicacao/exportar-analise-pdf';
import type { ExportarPdf } from '../aplicacao/exportar-pdf';

export interface CasosDeUsoImpressao {
  exportarPdf: ExportarPdf;
  exportarAnalisePdf: ExportarAnalisePdf;
}

export function registrarIpcImpressao(ipc: RegistradorIpc, casos: CasosDeUsoImpressao): void {
  // Quem pode ver o cronograma pode imprimi-lo.
  ipc.registrar(CANAIS.impressao.exportarPdf, 'leitura', esquemaId, (cronogramaId) =>
    casos.exportarPdf.executar(cronogramaId),
  );
  // Quem pode ler o arquivo de análises pode exportá-las.
  ipc.registrar(CANAIS.impressao.exportarAnalisePdf, 'leitura', esquemaId, (analiseId) =>
    casos.exportarAnalisePdf.executar(analiseId),
  );
}
