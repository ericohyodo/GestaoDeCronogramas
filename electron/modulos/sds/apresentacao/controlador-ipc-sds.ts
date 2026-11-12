import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { ListarSds, ObterSd, ObterSdPorAv } from '../aplicacao/casos-de-uso/consultar-sds';
import type {
  AbrirEvidenciaSd,
  AbrirSd,
  AnexarEvidenciasSd,
  DevolverSd,
  ExcluirEvidenciaSd,
  ListarEvidenciasSd,
  SalvarSd,
} from '../aplicacao/casos-de-uso/fluxo-sd';
import type { AceitarSdEntrada, SdDTO } from '@contratos/sds.contrato';

export interface CasosDeUsoSds {
  listar: ListarSds;
  obterPorAv: ObterSdPorAv;
  obter: ObterSd;
  salvar: SalvarSd;
  abrir: AbrirSd;
  /** Embrulhado em transação (cria projeto e conclui a AV). */
  aceitar: { executar(entrada: AceitarSdEntrada): Promise<SdDTO> };
  devolver: DevolverSd;
  listarEvidencias: ListarEvidenciasSd;
  anexarEvidencias: AnexarEvidenciasSd;
  abrirEvidencia: AbrirEvidenciaSd;
  excluirEvidencia: ExcluirEvidenciaSd;
}

const esquemaData = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato AAAA-MM-DD');

export function registrarIpcSds(ipc: RegistradorIpc, casos: CasosDeUsoSds): void {
  ipc.registrar(CANAIS.sds.listar, 'leitura', esquemaSemEntrada, () => casos.listar.executar());
  ipc.registrar(CANAIS.sds.obterPorAv, 'leitura', esquemaId, (avId) => casos.obterPorAv.executar(avId));
  ipc.registrar(CANAIS.sds.obter, 'leitura', esquemaId, (id) => casos.obter.executar(id));
  ipc.registrar(
    CANAIS.sds.salvar,
    'tarefas',
    z.object({
      id: esquemaId,
      versaoEsperada: z.number().int().positive().nullish(),
      dataEnvioCotacao: esquemaData.nullish(),
      numeroPo: z.string().max(60).nullish(),
      observacoes: z.string().max(2000).nullish(),
      leadTimeDias: z.number().int().min(1).max(1825).nullish(),
      leadTimeObservacao: z.string().max(500).nullish(),
    }),
    (entrada) => casos.salvar.executar(entrada),
  );
  ipc.registrar(CANAIS.sds.abrir, 'tarefas', esquemaId, (id) => casos.abrir.executar(id));
  ipc.registrar(
    CANAIS.sds.aceitar,
    'tarefas',
    z.object({ id: esquemaId, dataInicio: esquemaData, dataFim: esquemaData, parecer: z.string().max(2000).nullish() }),
    (entrada) => casos.aceitar.executar(entrada),
  );
  ipc.registrar(
    CANAIS.sds.devolver,
    'tarefas',
    z.object({ id: esquemaId, motivo: z.string().min(1).max(500) }),
    (entrada) => casos.devolver.executar(entrada),
  );
  ipc.registrar(CANAIS.sds.listarEvidencias, 'leitura', esquemaId, (id) => casos.listarEvidencias.executar(id));
  ipc.registrar(CANAIS.sds.anexarEvidencias, 'tarefas', esquemaId, (id) => casos.anexarEvidencias.executar(id));
  ipc.registrar(CANAIS.sds.abrirEvidencia, 'leitura', esquemaId, (id) => casos.abrirEvidencia.executar(id));
  ipc.registrar(CANAIS.sds.excluirEvidencia, 'tarefas', esquemaId, (id) => casos.excluirEvidencia.executar(id));
}
