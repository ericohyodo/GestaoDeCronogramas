import type {
  AnaliseAvsDTO,
  ConversarComIaEntrada,
  RespostaDoChatDTO,
} from '@contratos/ia.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import { lerInstrucoes } from './casos-de-uso-instrucoes';
import { type DependenciasDaAnalise, modeloEChave, validarHistorico } from './casos-de-uso';
import {
  LIMITE_DE_CARACTERES_DO_CONTEXTO_DAS_AVS,
  montarContextoDasAvs,
  saudeDasAvs,
  serializarContextoDasAvs,
} from './contexto-das-avs';
import { ErroNaIa } from './erro-na-ia';
import { montarInstrucoesDaAnaliseAvs, montarInstrucoesDoChatAvs } from './instrucoes-avs';

export const TITULO_DA_ANALISE_DE_AVS = 'AVs';

const ROTULO_DOS_DADOS = 'Dados das AVs (JSON)';
const PEDIDO_DA_ANALISE = 'Faça a análise das AVs conforme as instruções, no formato e nas seções indicados.';

/** Lê o retrato de todas as AVs e confere se cabe em uma consulta. */
async function contextoDasAvs(deps: DependenciasDaAnalise) {
  const linhas = await deps.consultaDeAvs.relatorio();
  if (linhas.length === 0) throw new ErroNaIa('Ainda não há AVs para analisar.');
  const contexto = montarContextoDasAvs(linhas, deps.relogio.agora().toLocaleDateString('sv-SE'));
  if (serializarContextoDasAvs(contexto).length > LIMITE_DE_CARACTERES_DO_CONTEXTO_DAS_AVS) {
    throw new ErroNaIa('Há AVs demais para caberem numa consulta. Conclua ou declare as AVs antigas e tente de novo.');
  }
  return { linhas, contexto };
}

/** Visão geral de todas as AVs. Só lê: a IA descreve e sugere, nunca altera. O relatório vai para o arquivo. */
export class AnalisarAvs implements CasoDeUso<void, AnaliseAvsDTO> {
  constructor(private readonly deps: DependenciasDaAnalise) {}

  async executar(): Promise<AnaliseAvsDTO> {
    const { modelo, chave } = await modeloEChave(this.deps, 'avs');
    const { linhas, contexto } = await contextoDasAvs(this.deps);
    const { checklist, orientacoes } = await lerInstrucoes(this.deps.instrucoes, 'avs');

    const resposta = await this.deps.modelo.conversar({
      chave,
      modelo,
      instrucoes: montarInstrucoesDaAnaliseAvs(checklist, orientacoes),
      contexto,
      rotuloDosDados: ROTULO_DOS_DADOS,
      mensagens: [{ papel: 'usuario', texto: PEDIDO_DA_ANALISE }],
    });

    const analise: AnaliseAvsDTO = {
      id: this.deps.geradorDeId.gerar(),
      geradaEm: this.deps.relogio.agora().toISOString(),
      geradaPor: this.deps.quemEstaUsando.nomeDoUsuarioAtual(),
      modelo: resposta.modelo,
      quantidadeDeAvs: linhas.length,
      saude: saudeDasAvs(linhas),
      texto: resposta.texto,
    };
    await this.deps.arquivo.salvar({
      id: analise.id,
      tipo: 'avs',
      cronogramaId: null,
      titulo: TITULO_DA_ANALISE_DE_AVS,
      modelo: analise.modelo,
      saude: analise.saude,
      geradaEm: analise.geradaEm,
      geradaPor: analise.geradaPor,
      analise,
    });
    return analise;
  }
}

/** A análise de AVs mais recente do arquivo, para abrir sem chamar a IA de novo. */
export class UltimaAnaliseAvs implements CasoDeUso<void, AnaliseAvsDTO | null> {
  constructor(private readonly deps: DependenciasDaAnalise) {}

  async executar(): Promise<AnaliseAvsDTO | null> {
    const ultima = await this.deps.arquivo.ultima('avs', null);
    return ultima?.tipo === 'avs' ? ultima.analise : null;
  }
}

/** Chat de perguntas e respostas sobre as AVs. Só lê; as conversas não são guardadas. */
export class ConversarSobreAvs implements CasoDeUso<ConversarComIaEntrada, RespostaDoChatDTO> {
  constructor(private readonly deps: DependenciasDaAnalise) {}

  async executar(entrada: ConversarComIaEntrada): Promise<RespostaDoChatDTO> {
    const mensagens = validarHistorico(entrada.mensagens);
    const { modelo, chave } = await modeloEChave(this.deps, 'avs');
    const { contexto } = await contextoDasAvs(this.deps);
    const { orientacoes } = await lerInstrucoes(this.deps.instrucoes, 'avs');

    const resultado = await this.deps.modelo.conversar({
      chave,
      modelo,
      instrucoes: montarInstrucoesDoChatAvs(orientacoes),
      contexto,
      rotuloDosDados: ROTULO_DOS_DADOS,
      mensagens,
    });
    return { texto: resultado.texto, modelo: resultado.modelo };
  }
}
