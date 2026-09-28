/**
 * API pública do módulo Impressão: gera o PDF do cronograma (dashboard + lista de atividades) e o
 * das análises com IA. O conteúdo são as rotas /impressao e /impressao-analise do renderer; aqui
 * fica só a mecânica de gerar e salvar.
 */
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { ExportarAnalisePdf } from './aplicacao/exportar-analise-pdf';
import { ExportarPdf } from './aplicacao/exportar-pdf';
import type { ConsultaDeAnalises, ConsultaDeCronogramas } from './aplicacao/portas';
import { registrarIpcImpressao } from './apresentacao/controlador-ipc-impressao';
import { DestinoDoArquivoElectron } from './infraestrutura/destino-do-arquivo-electron';
import { GeradorDePdfElectron, type OpcoesGeradorDePdf } from './infraestrutura/gerador-de-pdf-electron';

export type { ConsultaDeAnalises, ConsultaDeCronogramas };

export interface DependenciasModuloImpressao extends OpcoesGeradorDePdf {
  ipc: RegistradorIpc;
  consultaDeCronogramas: ConsultaDeCronogramas;
  consultaDeAnalises: ConsultaDeAnalises;
}

export function montarModuloImpressao(deps: DependenciasModuloImpressao): void {
  const gerador = new GeradorDePdfElectron({
    urlBase: deps.urlBase,
    caminhoDoPreload: deps.caminhoDoPreload,
  });
  const destino = new DestinoDoArquivoElectron();
  registrarIpcImpressao(deps.ipc, {
    exportarPdf: new ExportarPdf(deps.consultaDeCronogramas, gerador, destino),
    exportarAnalisePdf: new ExportarAnalisePdf(deps.consultaDeAnalises, gerador, destino),
  });
}
