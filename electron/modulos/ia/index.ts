/**
 * API pública do módulo IA: análise de cronogramas pela Claude API (Anthropic). A chamada sai daqui, do processo principal; as chaves nunca chegam ao renderer.
 * Toda análise gerada fica no arquivo de análises.
 */
import type { GeradorDeId } from '../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../nucleo/aplicacao/portas/relogio';
import type { BancoDeDados } from '../../nucleo/infraestrutura/banco/conexao-sqlite';
import type { RegistradorIpc } from '../../nucleo/infraestrutura/ipc/registrador-ipc';
import {
  AnalisarCronograma,
  AnalisarPortfolio,
  ConfigurarIa,
  ConversarComIa,
  type DependenciasDaAnalise,
  ObterEstadoIa,
  RemoverChaveIa,
} from './aplicacao/casos-de-uso';
import { AnalisarAvs, ConversarSobreAvs, UltimaAnaliseAvs } from './aplicacao/casos-de-uso-avs';
import {
  ExcluirAnalise,
  ListarAnalises,
  ObterAnalise,
  UltimaAnalise,
} from './aplicacao/casos-de-uso-arquivo';
import {
  ObterInstrucoesIa,
  RestaurarChecklistIa,
  SalvarInstrucoesIa,
} from './aplicacao/casos-de-uso-instrucoes';
import type {
  ConsultaDeAvs,
  ConsultaDeCronograma,
  ConsultaDeEstrutura,
  ConsultaDeRecursos,
  EditorDeCronogramas,
  PerfilDeQuemConversa,
  PermissoesDeQuemUsa,
  QuemEstaUsando,
} from './aplicacao/portas';
import { AplicarProposta, DescartarProposta } from './aplicacao/agente-de-cronogramas';
import { ExcluirConversa, limparConversasAntigas, ListarConversas, ObterConversa } from './aplicacao/conversas';
import { registrarIpcIa } from './apresentacao/controlador-ipc-ia';
import { ConfiguracaoIaSqlite } from './infraestrutura/configuracao-ia-sqlite';
import { ModeloClaude } from './infraestrutura/modelo-claude';
import { RepositorioDeAnalisesSqlite } from './infraestrutura/repositorio-de-analises-sqlite';
import { RepositorioDeConversasSqlite } from './infraestrutura/repositorio-de-conversas-sqlite';
import { RepositorioDePropostasSqlite } from './infraestrutura/repositorio-de-propostas-sqlite';
import { ESQUEMAS_DO_AGENTE } from './infraestrutura/esquemas-do-agente';

export type {
  ConsultaDeAvs,
  ConsultaDeCronograma,
  ConsultaDeEstrutura,
  ConsultaDeRecursos,
  EditorDeCronogramas,
  PerfilDeQuemConversa,
  PermissoesDeQuemUsa,
  QuemEstaUsando,
};

export interface DependenciasModuloIa {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  consultaDeCronograma: ConsultaDeCronograma;
  consultaDeEstrutura: ConsultaDeEstrutura;
  consultaDeAvs: ConsultaDeAvs;
  quemEstaUsando: QuemEstaUsando;
  /** Agente do chat de Projetos: aplica as propostas pelo módulo de Tarefas. */
  editorDeCronogramas: EditorDeCronogramas;
  consultaDeRecursos: ConsultaDeRecursos;
  permissoes: PermissoesDeQuemUsa;
}

export interface ModuloIa {
  rotinas: {
    limparConversasAntigas(): Promise<number>;
  };
  /** Consultas que o módulo oferece aos demais módulos. */
  consultas: {
    /** Dados para nomear o PDF da análise; `null` se ela não existe. */
    obterResumoDaAnalise(id: string): Promise<{ titulo: string; geradaEm: string } | null>;
  };
}

export function montarModuloIa(deps: DependenciasModuloIa): ModuloIa {
  const configuracao = new ConfiguracaoIaSqlite(deps.db);
  const arquivo = new RepositorioDeAnalisesSqlite(deps.db);
  const modelo = new ModeloClaude();
  const conversas = new RepositorioDeConversasSqlite(deps.db);
  const propostas = new RepositorioDePropostasSqlite(deps.db);
  const agente = {
    recursos: deps.consultaDeRecursos,
    propostas,
    editor: deps.editorDeCronogramas,
    permissoes: deps.permissoes,
    esquemas: ESQUEMAS_DO_AGENTE,
  };

  const dependenciasDaAnalise: DependenciasDaAnalise = {
    cofre: configuracao,
    configuracao,
    modelo,
    consultaDeCronograma: deps.consultaDeCronograma,
    consultaDeEstrutura: deps.consultaDeEstrutura,
    consultaDeAvs: deps.consultaDeAvs,
    instrucoes: configuracao,
    arquivo,
    quemEstaUsando: deps.quemEstaUsando,
    geradorDeId: deps.geradorDeId,
    relogio: deps.relogio,
    conversas,
    agente,
  };
  const dependenciasDasConversas = {
    conversas,
    quemEstaUsando: deps.quemEstaUsando,
    geradorDeId: deps.geradorDeId,
    relogio: deps.relogio,
    propostas,
  };
  const dependenciasDaDecisao = { ...agente, quemEstaUsando: deps.quemEstaUsando, relogio: deps.relogio };

  registrarIpcIa(deps.ipc, {
    estado: new ObterEstadoIa(configuracao, configuracao),
    configurar: new ConfigurarIa(configuracao, configuracao, modelo),
    removerChave: new RemoverChaveIa(configuracao, configuracao),
    analisar: new AnalisarCronograma(dependenciasDaAnalise),
    analisarPortfolio: new AnalisarPortfolio(dependenciasDaAnalise),
    conversar: new ConversarComIa(dependenciasDaAnalise),
    obterInstrucoes: new ObterInstrucoesIa(configuracao),
    salvarInstrucoes: new SalvarInstrucoesIa(configuracao, deps.relogio),
    restaurarChecklist: new RestaurarChecklistIa(configuracao, deps.relogio),
    estadoAvs: new ObterEstadoIa(configuracao, configuracao, 'avs'),
    configurarAvs: new ConfigurarIa(configuracao, configuracao, modelo, 'avs'),
    removerChaveAvs: new RemoverChaveIa(configuracao, configuracao, 'avs'),
    analisarAvs: new AnalisarAvs(dependenciasDaAnalise),
    ultimaAnaliseAvs: new UltimaAnaliseAvs(dependenciasDaAnalise),
    conversarAvs: new ConversarSobreAvs(dependenciasDaAnalise),
    obterInstrucoesAvs: new ObterInstrucoesIa(configuracao, 'avs'),
    salvarInstrucoesAvs: new SalvarInstrucoesIa(configuracao, deps.relogio, 'avs'),
    restaurarChecklistAvs: new RestaurarChecklistIa(configuracao, deps.relogio, 'avs'),
    listarAnalises: new ListarAnalises(arquivo),
    obterAnalise: new ObterAnalise(arquivo),
    ultimaAnalise: new UltimaAnalise(arquivo),
    excluirAnalise: new ExcluirAnalise(arquivo),
    listarConversas: new ListarConversas(dependenciasDasConversas),
    obterConversa: new ObterConversa(dependenciasDasConversas),
    excluirConversa: new ExcluirConversa(dependenciasDasConversas),
    aplicarProposta: new AplicarProposta(dependenciasDaDecisao),
    descartarProposta: new DescartarProposta(dependenciasDaDecisao),
  });

  return {
    rotinas: {
      /** Apaga as conversas do chat sem uso há mais de 90 dias; devolve quantas. */
      limparConversasAntigas: () => limparConversasAntigas(conversas, deps.relogio.agora(), propostas),
    },
    consultas: {
      obterResumoDaAnalise: async (id) => {
        const analise = await arquivo.obter(id);
        return analise ? { titulo: analise.titulo, geradaEm: analise.geradaEm } : null;
      },
    },
  };
}
