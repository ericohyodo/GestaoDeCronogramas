/**
 * API pública do módulo SDs (Solicitações de Desenvolvimento).
 * Outros módulos e a raiz de composição só podem importar deste arquivo.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import { ListarSds, ObterSdPorAv } from './aplicacao/casos-de-uso/consultar-sds';
import { CriarPreSd, type CriarPreSdEntrada } from './aplicacao/casos-de-uso/criar-pre-sd';
import { registrarIpcSds } from './apresentacao/controlador-ipc-sds';
import { RepositorioSdsSqlite } from './infraestrutura/repositorio-sds-sqlite';

export interface DependenciasModuloSds {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
}

type SdCriada = Awaited<ReturnType<CriarPreSd['executar']>>;

export interface ModuloSds {
  comandos: {
    /** Cria a SD (status "pré-SD") da AV informada, herdando o número dela. */
    criarPreSd(entrada: CriarPreSdEntrada): Promise<SdCriada>;
  };
  consultas: {
    obterPorAv(avId: string): Promise<SdCriada | null>;
  };
}

export function montarModuloSds(deps: DependenciasModuloSds): ModuloSds {
  const repositorio = new RepositorioSdsSqlite(deps.db);
  const listar = new ListarSds(repositorio);
  const obterPorAv = new ObterSdPorAv(repositorio);
  const criarPreSd = new CriarPreSd(repositorio, deps.relogio, deps.geradorDeId);

  registrarIpcSds(deps.ipc, { listar, obterPorAv });

  return {
    comandos: { criarPreSd: (entrada) => criarPreSd.executar(entrada) },
    consultas: { obterPorAv: (avId) => obterPorAv.executar(avId) },
  };
}
