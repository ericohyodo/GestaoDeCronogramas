import { z } from 'zod';
import { CANAIS } from '@contratos/canais';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type {
  AtualizarResponsavel,
  CriarResponsavel,
  ExcluirResponsavel,
  ListarResponsaveis,
} from '../aplicacao/casos-de-uso/gerenciar-responsaveis';

export interface CasosDeUsoResponsaveis {
  listar: ListarResponsaveis;
  criar: CriarResponsavel;
  atualizar: AtualizarResponsavel;
  excluir: ExcluirResponsavel;
}

const esquemaCriar = z.object({
  nome: z.string(),
  email: z.string().nullish(),
  funcao: z.string().nullish(),
});

const esquemaAtualizar = z.object({
  id: esquemaId,
  nome: z.string().optional(),
  email: z.string().nullable().optional(),
  funcao: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
});

export function registrarIpcResponsaveis(ipc: RegistradorIpc, casos: CasosDeUsoResponsaveis): void {
  ipc.registrar(CANAIS.responsaveis.listar, 'leitura', esquemaSemEntrada, () =>
    casos.listar.executar(),
  );
  ipc.registrar(CANAIS.responsaveis.criar, 'planejamento', esquemaCriar, (entrada) =>
    casos.criar.executar(entrada),
  );
  ipc.registrar(CANAIS.responsaveis.atualizar, 'planejamento', esquemaAtualizar, (entrada) =>
    casos.atualizar.executar(entrada),
  );
  ipc.registrar(CANAIS.responsaveis.excluir, 'planejamento', esquemaId, (id) =>
    casos.excluir.executar(id),
  );
}
