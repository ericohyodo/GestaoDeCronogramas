/**
 * API pública do módulo Impressão: gera o PDF do cronograma (dashboard + lista de atividades).
 * O conteúdo é a rota /impressao do renderer; aqui fica só a mecânica de gerar e salvar.
 */
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { ExportarPdf } from './aplicacao/exportar-pdf';
import type { ConsultaDeCronogramas } from './aplicacao/portas';
import { registrarIpcImpressao } from './apresentacao/controlador-ipc-impressao';
import { DestinoDoArquivoElectron } from './infraestrutura/destino-do-arquivo-electron';
import { GeradorDePdfElectron, type OpcoesGeradorDePdf } from './infraestrutura/gerador-de-pdf-electron';

export type { ConsultaDeCronogramas };

export interface DependenciasModuloImpressao extends OpcoesGeradorDePdf {
  ipc: RegistradorIpc;
  consultaDeCronogramas: ConsultaDeCronogramas;
}

export function montarModuloImpressao(deps: DependenciasModuloImpressao): void {
  registrarIpcImpressao(deps.ipc, {
    exportarPdf: new ExportarPdf(
      deps.consultaDeCronogramas,
      new GeradorDePdfElectron({ urlBase: deps.urlBase, caminhoDoPreload: deps.caminhoDoPreload }),
      new DestinoDoArquivoElectron(),
    ),
  });
}
