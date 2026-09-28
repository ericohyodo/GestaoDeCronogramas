/**
 * API pública do módulo IA: análise de cronogramas pela Claude API (Anthropic) ou pela API Gemini
 * (Google). A chamada sai daqui, do processo principal; as chaves nunca chegam ao renderer.
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
import type { ConsultaDeCronograma, ConsultaDeEstrutura, QuemEstaUsando } from './aplicacao/portas';
import { registrarIpcIa } from './apresentacao/controlador-ipc-ia';
import { ConfiguracaoIaSqlite } from './infraestrutura/configuracao-ia-sqlite';
import { ModeloClaude } from './infraestrutura/modelo-claude';
import { ModeloGemini } from './infraestrutura/modelo-gemini';
import { ModeloOpenRouter } from './infraestrutura/modelo-openrouter';
import { ModeloPorProvedor } from './infraestrutura/modelo-por-provedor';
import { RepositorioDeAnalisesSqlite } from './infraestrutura/repositorio-de-analises-sqlite';

export type { ConsultaDeCronograma, ConsultaDeEstrutura, QuemEstaUsando };

export interface DependenciasModuloIa {
  db: BancoDeDados;
  ipc: RegistradorIpc;
  relogio: Relogio;
  geradorDeId: GeradorDeId;
  consultaDeCronograma: ConsultaDeCronograma;
  consultaDeEstrutura: ConsultaDeEstrutura;
  quemEstaUsando: QuemEstaUsando;
}

export interface ModuloIa {
  /** Consultas que o módulo oferece aos demais módulos. */
  consultas: {
    /** Dados para nomear o PDF da análise; `null` se ela não existe. */
    obterResumoDaAnalise(id: string): Promise<{ titulo: string; geradaEm: string } | null>;
  };
}

export function montarModuloIa(deps: DependenciasModuloIa): ModuloIa {
  const configuracao = new ConfiguracaoIaSqlite(deps.db);
  const arquivo = new RepositorioDeAnalisesSqlite(deps.db);
  const modelo = new ModeloPorProvedor({
    anthropic: new ModeloClaude(),
    google: new ModeloGemini(),
    openrouter: new ModeloOpenRouter(),
  });

  const dependenciasDaAnalise: DependenciasDaAnalise = {
    cofre: configuracao,
    configuracao,
    modelo,
    consultaDeCronograma: deps.consultaDeCronograma,
    consultaDeEstrutura: deps.consultaDeEstrutura,
    instrucoes: configuracao,
    arquivo,
    quemEstaUsando: deps.quemEstaUsando,
    geradorDeId: deps.geradorDeId,
    relogio: deps.relogio,
  };

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
    listarAnalises: new ListarAnalises(arquivo),
    obterAnalise: new ObterAnalise(arquivo),
    ultimaAnalise: new UltimaAnalise(arquivo),
    excluirAnalise: new ExcluirAnalise(arquivo),
  });

  return {
    consultas: {
      obterResumoDaAnalise: async (id) => {
        const analise = await arquivo.obter(id);
        return analise ? { titulo: analise.titulo, geradaEm: analise.geradaEm } : null;
      },
    },
  };
}
