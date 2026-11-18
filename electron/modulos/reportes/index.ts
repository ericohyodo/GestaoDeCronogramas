/**
 * API pública do módulo Reportes (erros e sugestões enviados pelos usuários).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Notificador } from '../../nucleo/aplicacao/portas/notificador';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import {
  CriarReporte,
  type DependenciasReportes,
  ListarReportes,
  ObterImagemReporte,
  ObterReporte,
  RegistrarAndamentoReporte,
} from './aplicacao/casos-de-uso';
import type { AcessoDosReportes } from './aplicacao/portas';
import { registrarIpcReportes } from './apresentacao/controlador-ipc-reportes';
import { ArmazenamentoDeImagensReporteFs, codificadorBase64Node } from './infraestrutura/imagens-fs';
import { RepositorioReportesSqlite } from './infraestrutura/repositorio-reportes-sqlite';

export type { AcessoDosReportes } from './aplicacao/portas';

export interface DependenciasModuloReportes {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  acesso: AcessoDosReportes;
  notificador: Notificador;
  versaoDoApp: string;
}

/**
 * Monta o módulo e registra os canais IPC.
 * @param deps banco, IPC, relógio, ids, acesso aos usuários, notificador e versão do app
 */
export function montarModuloReportes(deps: DependenciasModuloReportes): void {
  const dependencias: DependenciasReportes = {
    repositorio: new RepositorioReportesSqlite(deps.db),
    acesso: deps.acesso,
    armazenamento: new ArmazenamentoDeImagensReporteFs(),
    base64: codificadorBase64Node,
    relogio: deps.relogio,
    geradorDeId: deps.geradorDeId,
    notificador: deps.notificador,
    versaoDoApp: deps.versaoDoApp,
  };
  registrarIpcReportes(deps.ipc, {
    criar: new CriarReporte(dependencias),
    listar: new ListarReportes(dependencias),
    obter: new ObterReporte(dependencias),
    registrarAndamento: new RegistrarAndamentoReporte(dependencias),
    obterImagem: new ObterImagemReporte(dependencias),
  });
}
