import { z } from 'zod';
import {
  AREAS_AV,
  CLASSIFICACOES_INVESTIMENTO,
  SECOES_APLICAVEIS_AO_GRUPO,
  TIPOS_NO_ESTRUTURA,
  TIPOS_TEMPLATE_AV,
  ETAPAS_DE_DECLINIO,
  INCOTERMS,
  SECOES_CUSTO_MATERIAL,
  PAPEIS_AV,
  PAPEIS_ESPECIAIS,
} from '@contratos/avs.contrato';
import { CANAIS } from '@contratos/canais';
import { esquemaId, esquemaSemEntrada } from '../../../nucleo/infraestrutura/ipc/esquemas';
import type { RegistradorIpc } from '../../../nucleo/infraestrutura/ipc/registrador-ipc';
import type { AbrirCaminho } from '../aplicacao/casos-de-uso/abrir-caminho';
import type { AtualizarComercial } from '../aplicacao/casos-de-uso/atualizar-comercial';
import type { ListarPerfisAv, ObterMeuPerfilAv, SalvarPerfilAv } from '../aplicacao/casos-de-uso/perfis-av';
import type { AtualizarEquipe } from '../aplicacao/casos-de-uso/atualizar-equipe';
import type { AvancarEtapa } from '../aplicacao/casos-de-uso/avancar-etapa';
import type { ObterContatosAv, SalvarContatosAv } from '../aplicacao/casos-de-uso/contatos-av';
import type { CriarAv } from '../aplicacao/casos-de-uso/criar-av';
import type { DeclinarAv } from '../aplicacao/casos-de-uso/declinar-av';
import type { AbrirAnexo } from '../aplicacao/casos-de-uso/abrir-anexo';
import type { ExcluirAnexo } from '../aplicacao/casos-de-uso/excluir-anexo';
import type {
  AplicarAoGrupo,
  CriarGrupoDeAvs,
  ListarGruposAv,
} from '../aplicacao/casos-de-uso/grupos-av';
import type { FinalizarECriarPreSd } from '../aplicacao/casos-de-uso/finalizar-e-criar-pre-sd';
import type { GerarAvsExemplo } from '../aplicacao/casos-de-uso/gerar-avs-exemplo';
import type {
  ExcluirTemplateAv,
  ListarTemplatesAv,
  SalvarTemplateAv,
} from '../aplicacao/casos-de-uso/templates-av';
import type { ListarAnexos } from '../aplicacao/casos-de-uso/listar-anexos';
import type { ListarAvs } from '../aplicacao/casos-de-uso/listar-avs';
import type { ListarHistoricoAv } from '../aplicacao/casos-de-uso/listar-historico';
import type { ListarMembros } from '../aplicacao/casos-de-uso/listar-membros';
import type { ObterAv } from '../aplicacao/casos-de-uso/obter-av';
import type { ObterCatalogoCusto } from '../aplicacao/casos-de-uso/obter-catalogo-custo';
import type { ObterConteudoAnexo } from '../aplicacao/casos-de-uso/obter-conteudo-anexo';
import type { ObterDashboard } from '../aplicacao/casos-de-uso/obter-dashboard';
import type { ObterEntregasNoPrazo } from '../aplicacao/casos-de-uso/obter-entregas-no-prazo';
import type { ObterPrazosConfig, SalvarPrazosConfig } from '../aplicacao/casos-de-uso/configurar-prazos-das-areas';
import type { ObterCapacidadeConfig, SalvarCapacidadeConfig } from '../aplicacao/casos-de-uso/configurar-capacidade';
import type { ObterSecaoCusto } from '../aplicacao/casos-de-uso/obter-secao-custo';
import type { ObterSecaoProcesso } from '../aplicacao/casos-de-uso/obter-secao-processo';
import type { ObterSecaoProduto } from '../aplicacao/casos-de-uso/obter-secao-produto';
import type { ObterRelatorioAvs } from '../aplicacao/casos-de-uso/obter-relatorio-avs';
import type { ObterSecaoPcp, SalvarSecaoPcp } from '../aplicacao/casos-de-uso/secao-pcp';
import type { SalvarSecaoCusto } from '../aplicacao/casos-de-uso/salvar-secao-custo';
import type { SalvarSecaoProcesso } from '../aplicacao/casos-de-uso/salvar-secao-processo';
import type { SalvarSecaoProduto } from '../aplicacao/casos-de-uso/salvar-secao-produto';
import type { SelecionarCaminho } from '../aplicacao/casos-de-uso/selecionar-caminho';
import type { SelecionarEAnexar } from '../aplicacao/casos-de-uso/selecionar-e-anexar';

export interface CasosDeUsoAvs {
  listar: ListarAvs;
  obter: ObterAv;
  criar: CriarAv;
  atualizarComercial: AtualizarComercial;
  atualizarEquipe: AtualizarEquipe;
  listarMembros: ListarMembros;
  obterDashboard: ObterDashboard;
  obterPrazosConfig: ObterPrazosConfig;
  entregasNoPrazo: ObterEntregasNoPrazo;
  salvarPrazosConfig: SalvarPrazosConfig;
  obterCapacidadeConfig: ObterCapacidadeConfig;
  salvarCapacidadeConfig: SalvarCapacidadeConfig;
  avancarEtapa: Pick<AvancarEtapa, 'executar'>;
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
  selecionarCaminho: SelecionarCaminho;
  listarAnexos: ListarAnexos;
  selecionarEAnexar: SelecionarEAnexar;
  obterConteudoAnexo: ObterConteudoAnexo;
  excluirAnexo: ExcluirAnexo;
  abrirAnexo: AbrirAnexo;
  gerarExemplos: GerarAvsExemplo;
  finalizarECriarPreSd: Pick<FinalizarECriarPreSd, 'executar'>;
  listarGrupos: ListarGruposAv;
  criarGrupo: Pick<CriarGrupoDeAvs, 'executar'>;
  aplicarAoGrupo: AplicarAoGrupo;
  relatorio: ObterRelatorioAvs;
  obterSecaoPcp: ObterSecaoPcp;
  salvarSecaoPcp: SalvarSecaoPcp;
  obterContatos: ObterContatosAv;
  salvarContatos: SalvarContatosAv;
  listarTemplates: ListarTemplatesAv;
  salvarTemplate: SalvarTemplateAv;
  excluirTemplate: ExcluirTemplateAv;
  listarPerfis: ListarPerfisAv;
  salvarPerfil: SalvarPerfilAv;
  obterMeuPerfil: ObterMeuPerfilAv;
}

const esquemaVersao = z.number().int().positive().nullish();

const esquemaMembros = z.object(Object.fromEntries(AREAS_AV.map((area) => [area, z.string().nullish()])));

const esquemaCriar = z.object({
  tipo: z.enum(['completa', 'portfolio']).optional(),
  itemPortfolioId: z.string().min(1).nullish(),
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
  versaoEsperada: esquemaVersao,
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
  familia: z.string().nullish(),
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
  versaoEsperada: esquemaVersao,
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
  versaoEsperada: esquemaVersao,
  descritivoTecnicoExistente: z.boolean().nullish(),
  descritivoTecnicoDisponivel: z.boolean().nullish(),
  descritivoTecnicoNaoAplica: z.boolean().nullish(),
  desenho2dExistente: z.boolean().nullish(),
  desenho2dDisponivel: z.boolean().nullish(),
  desenho2dNaoAplica: z.boolean().nullish(),
  desenho3dExistente: z.boolean().nullish(),
  desenho3dDisponivel: z.boolean().nullish(),
  desenho3dNaoAplica: z.boolean().nullish(),
  desenhoInterfacesExistente: z.boolean().nullish(),
  desenhoInterfacesDisponivel: z.boolean().nullish(),
  desenhoInterfacesNaoAplica: z.boolean().nullish(),
  normasTecnicasExistente: z.boolean().nullish(),
  normasTecnicasDisponivel: z.boolean().nullish(),
  normasTecnicasNaoAplica: z.boolean().nullish(),
  requisitosClienteExistente: z.boolean().nullish(),
  requisitosClienteDisponivel: z.boolean().nullish(),
  requisitosClienteNaoAplica: z.boolean().nullish(),
  requisitosGarantiaExistente: z.boolean().nullish(),
  requisitosGarantiaDisponivel: z.boolean().nullish(),
  requisitosGarantiaNaoAplica: z.boolean().nullish(),
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
  complexidade: z.string().nullish(),
  estrutura: z
    .array(
      z.object({
        chave: z.string().min(1).max(100),
        paiChave: z.string().max(100).nullable(),
        tipo: z.enum(TIPOS_NO_ESTRUTURA),
        codigo: z.string().nullish(),
        descricao: z.string(),
        quantidade: z.number().nullish(),
        unidade: z.string().nullish(),
        pecasPorEmbalagem: z.number().int().min(1).max(10_000_000).nullish(),
      }),
    )
    .max(500),
  investimentos: z.array(esquemaInvestimento),
});

const esquemaOperacao = z.object({
  descricao: z.string(),
  maquina: z.string().nullish(),
  pecasHora: z.number().nullish(),
});

const esquemaTemplate = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('operacoes'), nome: z.string(), itens: z.array(esquemaOperacao) }),
  z.object({ tipo: z.literal('custo_processo'), nome: z.string(), itens: z.array(esquemaItemProcesso) }),
]);

const esquemaSalvarSecaoProcesso = z.object({
  avId: esquemaId,
  versaoEsperada: esquemaVersao,
  prazoProducaoDias: z.number().nullish(),
  operacoes: z.array(esquemaOperacao),
  investimentos: z.array(esquemaInvestimento),
});

const esquemaSelecionarEAnexar = z.object({
  avId: esquemaId,
  secao: z.enum(AREAS_AV),
});

export function registrarIpcAvs(ipc: RegistradorIpc, casos: CasosDeUsoAvs): void {
  ipc.registrar(CANAIS.avs.listar, 'leitura', esquemaSemEntrada, () => casos.listar.executar());
  ipc.registrar(CANAIS.avs.obter, 'leitura', esquemaId, (id) => casos.obter.executar(id));
  ipc.registrar(CANAIS.avs.criar, 'tarefas', esquemaCriar, (entrada) => casos.criar.executar(entrada));
  ipc.registrar(CANAIS.avs.atualizarComercial, 'tarefas', esquemaAtualizarComercial, (entrada) =>
    casos.atualizarComercial.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.atualizarEquipe, 'tarefas', esquemaAtualizarEquipe, (entrada) =>
    casos.atualizarEquipe.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.listarMembros, 'leitura', esquemaSemEntrada, () =>
    casos.listarMembros.executar(),
  );
  ipc.registrar(CANAIS.avs.obterDashboard, 'leitura', esquemaSemEntrada, () =>
    casos.obterDashboard.executar(),
  );
  ipc.registrar(CANAIS.avs.obterPrazosConfig, 'leitura', esquemaSemEntrada, () => casos.obterPrazosConfig.executar());
  ipc.registrar(CANAIS.avs.obterCapacidadeConfig, 'leitura', esquemaSemEntrada, () =>
    casos.obterCapacidadeConfig.executar(),
  );
  ipc.registrar(
    CANAIS.avs.salvarCapacidadeConfig,
    'administracao',
    z.object({ horasPorTurno: z.number().positive().max(24), diasProdutivosMes: z.number().int().min(1).max(31) }),
    (entrada) => casos.salvarCapacidadeConfig.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.entregasNoPrazo, 'leitura', esquemaSemEntrada, () => casos.entregasNoPrazo.executar());
  const diasUteis = z.number().int().min(1).max(30);
  ipc.registrar(
    CANAIS.avs.salvarPrazosConfig,
    'administracao',
    z.object({ produto: diasUteis, processo: diasUteis, pcp: diasUteis, custo: diasUteis }),
    (entrada) => casos.salvarPrazosConfig.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.avancarEtapa, 'tarefas', esquemaAvancarEtapa, (entrada) =>
    casos.avancarEtapa.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.declinar, 'tarefas', esquemaDeclinar, (entrada) =>
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
  ipc.registrar(CANAIS.avs.salvarSecaoCusto, 'tarefas', esquemaSalvarSecaoCusto, (entrada) =>
    casos.salvarSecaoCusto.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.obterSecaoProduto, 'leitura', esquemaId, (avId) =>
    casos.obterSecaoProduto.executar(avId),
  );
  ipc.registrar(CANAIS.avs.salvarSecaoProduto, 'tarefas', esquemaSalvarSecaoProduto, (entrada) =>
    casos.salvarSecaoProduto.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.obterSecaoProcesso, 'leitura', esquemaId, (avId) =>
    casos.obterSecaoProcesso.executar(avId),
  );
  ipc.registrar(CANAIS.avs.salvarSecaoProcesso, 'tarefas', esquemaSalvarSecaoProcesso, (entrada) =>
    casos.salvarSecaoProcesso.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.abrirCaminho, 'leitura', esquemaId, (caminho) =>
    casos.abrirCaminho.executar(caminho),
  );
  ipc.registrar(CANAIS.avs.selecionarCaminho, 'leitura', esquemaSemEntrada, () =>
    casos.selecionarCaminho.executar(),
  );
  ipc.registrar(CANAIS.avs.listarAnexos, 'leitura', esquemaId, (avId) =>
    casos.listarAnexos.executar(avId),
  );
  ipc.registrar(CANAIS.avs.selecionarEAnexar, 'tarefas', esquemaSelecionarEAnexar, (entrada) =>
    casos.selecionarEAnexar.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.obterConteudoAnexo, 'leitura', esquemaId, (anexoId) =>
    casos.obterConteudoAnexo.executar(anexoId),
  );
  ipc.registrar(CANAIS.avs.excluirAnexo, 'tarefas', esquemaId, (anexoId) =>
    casos.excluirAnexo.executar(anexoId),
  );
  ipc.registrar(CANAIS.avs.abrirAnexo, 'leitura', esquemaId, (anexoId) => casos.abrirAnexo.executar(anexoId));
  ipc.registrar(CANAIS.avs.gerarExemplos, 'administracao', esquemaSemEntrada, () =>
    casos.gerarExemplos.executar(),
  );
  ipc.registrar(CANAIS.avs.finalizarECriarPreSd, 'tarefas', esquemaId, (avId) =>
    casos.finalizarECriarPreSd.executar(avId),
  );
  ipc.registrar(CANAIS.avs.listarTemplates, 'leitura', z.enum(TIPOS_TEMPLATE_AV), (tipo) =>
    casos.listarTemplates.executar(tipo),
  );
  ipc.registrar(CANAIS.avs.salvarTemplate, 'tarefas', esquemaTemplate, (entrada) =>
    casos.salvarTemplate.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.excluirTemplate, 'tarefas', esquemaId, (id) => casos.excluirTemplate.executar(id));
  ipc.registrar(CANAIS.avs.listarGrupos, 'leitura', esquemaSemEntrada, () => casos.listarGrupos.executar());
  ipc.registrar(
    CANAIS.avs.criarGrupo,
    'tarefas',
    z.object({ nome: z.string(), quantidade: z.number() }),
    (entrada) => casos.criarGrupo.executar(entrada),
  );
  ipc.registrar(
    CANAIS.avs.aplicarAoGrupo,
    'tarefas',
    z.object({ avId: esquemaId, secao: z.enum(SECOES_APLICAVEIS_AO_GRUPO) }),
    (entrada) => casos.aplicarAoGrupo.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.relatorio, 'leitura', esquemaSemEntrada, () => casos.relatorio.executar());
  ipc.registrar(CANAIS.avs.obterSecaoPcp, 'leitura', esquemaId, (avId) => casos.obterSecaoPcp.executar(avId));
  ipc.registrar(
    CANAIS.avs.salvarSecaoPcp,
    'tarefas',
    z.object({
      avId: esquemaId,
      versaoEsperada: esquemaVersao,
      observacoes: z.string().nullish(),
      cargas: z.array(
        z.object({
          operacao: z.string(),
          maquina: z.string().nullish(),
          pecasHora: z.number().min(0).nullish(),
          conversao: z.number().positive().nullish(),
          cargaAtualPecas: z.number().min(0).nullish(),
        }),
      ),
      custos: z.array(z.object({ descricao: z.string(), valor: z.number().nullish() })),
      layoutSemAlteracoes: z.boolean().optional(),
      custosSemAlteracoes: z.boolean().optional(),
      observacoesSemAlteracoes: z.boolean().optional(),
    }),
    (entrada) => casos.salvarSecaoPcp.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.obterContatos, 'leitura', esquemaId, (avId) => casos.obterContatos.executar(avId));
  ipc.registrar(
    CANAIS.avs.salvarContatos,
    'tarefas',
    z.object({
      avId: esquemaId,
      contatos: z.array(
        z.object({
          nome: z.string(),
          area: z.string().nullish(),
          telefone: z.string().nullish(),
          email: z.string().nullish(),
        }),
      ),
    }),
    (entrada) => casos.salvarContatos.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.listarPerfis, 'administracao', esquemaSemEntrada, () => casos.listarPerfis.executar());
  ipc.registrar(
    CANAIS.avs.salvarPerfil,
    'administracao',
    z.object({
      usuarioId: esquemaId,
      papelAv: z.enum(PAPEIS_AV),
      competencias: z.array(z.enum(AREAS_AV)).max(AREAS_AV.length),
      papeisEspeciais: z.array(z.enum(PAPEIS_ESPECIAIS)).max(PAPEIS_ESPECIAIS.length),
    }),
    (entrada) => casos.salvarPerfil.executar(entrada),
  );
  ipc.registrar(CANAIS.avs.obterMeuPerfil, 'leitura', esquemaSemEntrada, () => casos.obterMeuPerfil.executar());
}
