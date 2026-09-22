import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { SITUACOES_CRONOGRAMA } from '@contratos/cronogramas.contrato';
import {
  esquemaData,
  esquemaId,
  esquemaSemEntrada,
} from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { AtualizarCronograma } from '../aplicacao/casos-de-uso/atualizar-cronograma';
import type { CriarCronograma } from '../aplicacao/casos-de-uso/criar-cronograma';
import type { ExcluirCronograma } from '../aplicacao/casos-de-uso/excluir-cronograma';
import type { ListarCronogramas } from '../aplicacao/casos-de-uso/listar-cronogramas';
import type { ObterCronograma } from '../aplicacao/casos-de-uso/obter-cronograma';

export interface CasosDeUsoCronogramas {
  listar: ListarCronogramas;
  obter: ObterCronograma;
  criar: CriarCronograma;
  atualizar: AtualizarCronograma;
  excluir: ExcluirCronograma;
}

const esquemaCriar = z.object({
  nome: z.string(),
  descricao: z.string().nullish(),
  dataInicio: esquemaData,
  dataFim: esquemaData,
});

const esquemaAtualizar = z.object({
  id: esquemaId,
  nome: z.string().optional(),
  descricao: z.string().nullable().optional(),
  dataInicio: esquemaData.optional(),
  dataFim: esquemaData.optional(),
  situacao: z.enum(SITUACOES_CRONOGRAMA).optional(),
});

export function registrarIpcCronogramas(ipc: RegistradorIpc, casos: CasosDeUsoCronogramas): void {
  ipc.registrar(CANAIS.cronogramas.listar, 'leitura', esquemaSemEntrada, () =>
    casos.listar.executar(),
  );
  ipc.registrar(CANAIS.cronogramas.obter, 'leitura', esquemaId, (id) => casos.obter.executar(id));
  ipc.registrar(CANAIS.cronogramas.criar, 'planejamento', esquemaCriar, (entrada) =>
    casos.criar.executar(entrada),
  );
  ipc.registrar(CANAIS.cronogramas.atualizar, 'planejamento', esquemaAtualizar, (entrada) =>
    casos.atualizar.executar(entrada),
  );
  ipc.registrar(CANAIS.cronogramas.excluir, 'planejamento', esquemaId, (id) =>
    casos.excluir.executar(id),
  );
}
