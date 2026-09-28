import { z } from 'zod';
import {
  AREAS_AV,
  CLASSIFICACOES_INVESTIMENTO,
  ETAPAS_DE_DECLINIO,
  INCOTERMS,
  SECOES_CUSTO_MATERIAL,
} from '@contratos/avs.contrato';
import { CANAIS } from '@contratos/canais';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { AbrirCaminho } from '../aplicacao/casos-de-uso/abrir-caminho';
import type { AtualizarComercial } from '../aplicacao/casos-de-uso/atualizar-comercial';
import type { AtualizarEquipe } from '../aplicacao/casos-de-uso/atualizar-equipe';
import type { AvancarEtapa } from '../aplicacao/casos-de-uso/avancar-etapa';
import type { CriarAv } from '../aplicacao/casos-de-uso/criar-av';
import type { DeclinarAv } from '../aplicacao/casos-de-uso/declinar-av';
import type { ExcluirAnexo } from '../aplicacao/casos-de-uso/excluir-anexo';
import type { ListarAnexos } from '../aplicacao/casos-de-uso/listar-anexos';
import type { ListarAvs } from '../aplicacao/casos-de-uso/listar-avs';
import type { ListarHistoricoAv } from '../aplicacao/casos-de-uso/listar-historico';
import type { ListarMembros } from '../aplicacao/casos-de-uso/listar-membros';
import type { ObterAv } from '../aplicacao/casos-de-uso/obter-av';
import type { ObterCatalogoCusto } from '../aplicacao/casos-de-uso/obter-catalogo-custo';
import type { ObterConteudoAnexo } from '../aplicacao/casos-de-uso/obter-conteudo-anexo';
import type { ObterDashboard } from '../aplicacao/casos-de-uso/obter-dashboard';
import type { ObterSecaoCusto } from '../aplicacao/casos-de-uso/obter-secao-custo';
import type { ObterSecaoProcesso } from '../aplicacao/casos-de-uso/obter-secao-processo';
import type { ObterSecaoProduto } from '../aplicacao/casos-de-uso/obter-secao-produto';
import type { SalvarSecaoCusto } from '../aplicacao/casos-de-uso/salvar-secao-custo';
import type { SalvarSecaoProcesso } from '../aplicacao/casos-de-uso/salvar-secao-processo';
import type { SalvarSecaoProduto } from '../aplicacao/casos-de-uso/salvar-secao-produto';
import type { SelecionarEAnexar } from '../aplicacao/casos-de-uso/selecionar-e-anexar';

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
  obterCatalogoCusto: ObterCatalogoCusto;
  obterSecaoCusto: ObterSecaoCusto;
  salvarSecaoCusto: SalvarSecaoCusto;
  obterSecaoProduto: ObterSecaoProduto;
  salvarSecaoProduto: SalvarSecaoProduto;
  obterSecaoProcesso: ObterSecaoProcesso;
  salvarSecaoProcesso: SalvarSecaoProcesso;
  abrirCaminho: AbrirCaminho;
  listarAnexos: ListarAnexos;
  selecionarEAnexar: SelecionarEAnexar;
  obterConteudoAnexo: ObterConteudoAnexo;
  excluirAnexo: ExcluirAnexo;
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

const esquemaItemMaterial = z.object({
  secao: z.enum(SECOES_CUSTO_MATERIAL),
  codigoItem: z.string().nullish(),
  descricao: z.string(),
  qtdeBruta: z.number().nullish(),
  qtdeNet: z.number().nullish(),
  unidadeMedida: z.string().nullish(),
  custoUnitario: z.number().nullish(),
  custoTotal: z.number().nullish(),
});

const esquemaItemProcesso = z.object({
  processo: z.string().nullish(),
  maquina: z.string().nullish(),
  pecasHora: z.number().nullish(),
  qtdeColaboradores: z.number().nullish(),
  taxaMod: z.number().nullish(),
  taxaMoi: z.number().nullish(),
  taxaGgf: z.number().nullish(),
  custoTotal: z.number().nullish(),
});

const esquemaSalvarSecaoCusto = z.object({
  avId: esquemaId,
  incoterm: z.enum(INCOTERMS).nullish(),
  observacoes: z.string().nullish(),
  materiais: z.array(esquemaItemMaterial),
  processo: z.array(esquemaItemProcesso),
});

const esquemaInvestimento = z.object({
  descricao: z.string(),
  classificacao: z.enum(CLASSIFICACOES_INVESTIMENTO).nullish(),
  valor: z.number().nullish(),
});

const esquemaSalvarSecaoProduto = z.object({
  avId: esquemaId,
  descritivoTecnicoExistente: z.boolean().nullish(),
  descritivoTecnicoDisponivel: z.boolean().nullish(),
  desenho2dExistente: z.boolean().nullish(),
  desenho2dDisponivel: z.boolean().nullish(),
  desenho3dExistente: z.boolean().nullish(),
  desenho3dDisponivel: z.boolean().nullish(),
  desenhoInterfacesExistente: z.boolean().nullish(),
  desenhoInterfacesDisponivel: z.boolean().nullish(),
  normasTecnicasExistente: z.boolean().nullish(),
  normasTecnicasDisponivel: z.boolean().nullish(),
  requisitosClienteExistente: z.boolean().nullish(),
  requisitosClienteDisponivel: z.boolean().nullish(),
  requisitosGarantiaExistente: z.boolean().nullish(),
  requisitosGarantiaDisponivel: z.boolean().nullish(),
  descritivoTecnicoLink: z.string().nullish(),
  desenho2dLink: z.string().nullish(),
  desenho3dLink: z.string().nullish(),
  desenhoInterfacesLink: z.string().nullish(),
  normasTecnicasLink: z.string().nullish(),
  requisitosClienteLink: z.string().nullish(),
  requisitosGarantiaLink: z.string().nullish(),
  escopoTecnico: z.string().nullish(),
  riscosProjeto: z.string().nullish(),
  premissasProjeto: z.string().nullish(),
  recursosProjeto: z.string().nullish(),
  restricoesProjeto: z.string().nullish(),
  infoComplementar: z.string().nullish(),
  prazoPrototipoDias: z.number().nullish(),
  investimentos: z.array(esquemaInvestimento),
});

const esquemaSalvarSecaoProcesso = z.object({
  avId: esquemaId,
  prazoProducaoDias: z.number().nullish(),
  investimentos: z.array(esquemaInvestimento),
});

const esquemaSelecionarEAnexar = z.object({
  avId: esquemaId,
  secao: z.enum(AREAS_AV),
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
  ipc.registrar(CANAIS.avs.obterCatalogoCusto, 'leitura', esquemaSemEntrada, () =>
    casos.obterCatalogoCusto.executar(),
  );
  ipc.registrar(CANAIS.avs.obterSecaoCusto, 'leitura', esquemaId, (avId) =>
    casos.obterSecaoCusto.executar(avId),
  );
  ipc.registrar(CANAIS.avs.salvarSecaoCusto, 'leitura', esquemaSalvarSecaoCusto, (entrada) =>
    casos.salvarSecaoCusto.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.obterSecaoProduto, 'leitura', esquemaId, (avId) =>
    casos.obterSecaoProduto.executar(avId),
  );
  ipc.registrar(CANAIS.avs.salvarSecaoProduto, 'leitura', esquemaSalvarSecaoProduto, (entrada) =>
    casos.salvarSecaoProduto.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.obterSecaoProcesso, 'leitura', esquemaId, (avId) =>
    casos.obterSecaoProcesso.executar(avId),
  );
  ipc.registrar(CANAIS.avs.salvarSecaoProcesso, 'leitura', esquemaSalvarSecaoProcesso, (entrada) =>
    casos.salvarSecaoProcesso.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.abrirCaminho, 'leitura', esquemaId, (caminho) =>
    casos.abrirCaminho.executar(caminho),
  );
  ipc.registrar(CANAIS.avs.listarAnexos, 'leitura', esquemaId, (avId) =>
    casos.listarAnexos.executar(avId),
  );
  ipc.registrar(CANAIS.avs.selecionarEAnexar, 'leitura', esquemaSelecionarEAnexar, (entrada) =>
    casos.selecionarEAnexar.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.obterConteudoAnexo, 'leitura', esquemaId, (anexoId) =>
    casos.obterConteudoAnexo.executar(anexoId),
  );
  ipc.registrar(CANAIS.avs.excluirAnexo, 'leitura', esquemaId, (anexoId) =>
    casos.excluirAnexo.executar(anexoId),
  );
}
