import { z } from 'zod';
import { AREAS_AV, ETAPAS_DE_DECLINIO } from '@contratos/avs.contrato';
import { CANAIS } from '@contratos/canais';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { AtualizarComercial } from '../aplicacao/casos-de-uso/atualizar-comercial';
import type { AtualizarEquipe } from '../aplicacao/casos-de-uso/atualizar-equipe';
import type { AvancarEtapa } from '../aplicacao/casos-de-uso/avancar-etapa';
import type { CriarAv } from '../aplicacao/casos-de-uso/criar-av';
import type { DeclinarAv } from '../aplicacao/casos-de-uso/declinar-av';
import type { ListarAvs } from '../aplicacao/casos-de-uso/listar-avs';
import type { ListarHistoricoAv } from '../aplicacao/casos-de-uso/listar-historico';
import type { ListarMembros } from '../aplicacao/casos-de-uso/listar-membros';
import type { ObterAv } from '../aplicacao/casos-de-uso/obter-av';
import type { ObterDashboard } from '../aplicacao/casos-de-uso/obter-dashboard';

export interface CasosDeUsoAvs {
  listar: ListarAvs;
  obter: ObterAv;
  criar: CriarAv;
  atualizarComercial: AtualizarComercial;
  atualizarEquipe: AtualizarEquipe;
  listarMembros: ListarMembros;
  obterDashboard: ObterDashboard;
  avancarEtapa: AvancarEtapa;
  declinar: DeclinarAv;
  listarHistorico: ListarHistoricoAv;
}

const esquemaMembros = z.object(Object.fromEntries(AREAS_AV.map((area) => [area, z.string().nullish()])));

const esquemaCriar = z.object({
  descricao: z.string(),
  cliente: z.string().nullish(),
  codigo: z.string().nullish(),
  complexidade: z.string().nullish(),
  solicitante: z.string().nullish(),
  prazoCliente: z.string().nullish(),
  membros: esquemaMembros.partial().optional(),
});

const esquemaAtualizarComercial = z.object({
  avId: esquemaId,
  cliente: z.string().nullish(),
  codigo: z.string().nullish(),
  descricao: z.string().optional(),
  complexidade: z.string().nullish(),
  solicitante: z.string().nullish(),
  prazoCliente: z.string().nullish(),
  desenhoClienteRef: z.string().nullish(),
  contatoComercial: z.string().nullish(),
  emailComercial: z.string().nullish(),
  foneComercial: z.string().nullish(),
  contatoTecnico: z.string().nullish(),
  dataFechamento: z.string().nullish(),
  programa: z.string().nullish(),
  volumeAnual: z.number().nullish(),
  anoSopEop: z.string().nullish(),
  respAbertura: z.string().nullish(),
  linha: z.string().nullish(),
  origemProjeto: z.string().nullish(),
  localEntrega: z.string().nullish(),
  conceitoLogistico: z.string().nullish(),
  respEmbalagem: z.string().nullish(),
  infoComplementarComercial: z.string().nullish(),
});

const esquemaAtualizarEquipe = z.object({
  avId: esquemaId,
  membros: esquemaMembros.partial(),
});

const esquemaAvancarEtapa = z.object({
  avId: esquemaId,
  comentario: z.string().nullish(),
});

const esquemaDeclinar = z.object({
  avId: esquemaId,
  etapa: z.enum(ETAPAS_DE_DECLINIO),
  motivo: z.string(),
  comentario: z.string().nullish(),
});

export function registrarIpcAvs(ipc: RegistradorIpc, casos: CasosDeUsoAvs): void {
  ipc.registrar(CANAIS.avs.listar, 'leitura', esquemaSemEntrada, () => casos.listar.executar());
  ipc.registrar(CANAIS.avs.obter, 'leitura', esquemaId, (id) => casos.obter.executar(id));
  ipc.registrar(CANAIS.avs.criar, 'leitura', esquemaCriar, (entrada) => casos.criar.executar(entrada));
  ipc.registrar(CANAIS.avs.atualizarComercial, 'leitura', esquemaAtualizarComercial, (entrada) =>
    casos.atualizarComercial.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.atualizarEquipe, 'leitura', esquemaAtualizarEquipe, (entrada) =>
    casos.atualizarEquipe.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.listarMembros, 'leitura', esquemaSemEntrada, () =>
    casos.listarMembros.executar(),
  );
  ipc.registrar(CANAIS.avs.obterDashboard, 'leitura', esquemaSemEntrada, () =>
    casos.obterDashboard.executar(),
  );
  ipc.registrar(CANAIS.avs.avancarEtapa, 'leitura', esquemaAvancarEtapa, (entrada) =>
    casos.avancarEtapa.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.declinar, 'leitura', esquemaDeclinar, (entrada) =>
    casos.declinar.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.listarHistorico, 'leitura', esquemaId, (avId) =>
    casos.listarHistorico.executar(avId),
  );
}
