import {
  type AnaliseCronogramaDTO,
  type AnalisePortfolioDTO,
  type ConfigurarIaEntrada,
  type ConversarComIaEntrada,
  type EscopoIaDTO,
  LIMITE_DE_CARACTERES_DA_PERGUNTA,
  LIMITE_DE_MENSAGENS_DO_CHAT,
  type RespostaDoChatDTO,
  type EstadoIaDTO,
  type ModeloIaDTO,
  PROVEDORES_IA,
  type ProvedorIaDTO,
  provedorDoModelo,
  type ResumoDeAnaliseDTO,
} from '@contratos/ia.contrato';
import type { CasoDeUso } from '../../../nucleo/aplicacao/caso-de-uso';
import { ErroNaoEncontrado } from '../../../nucleo/aplicacao/erros';
import type { GeradorDeId } from '../../../nucleo/aplicacao/portas/gerador-de-id';
import type { Relogio } from '../../../nucleo/aplicacao/portas/relogio';
import { ErroDeValidacao } from '../../../nucleo/dominio/erro-de-dominio';
import { montarContexto } from './contexto-da-analise';
import { lerInstrucoes } from './casos-de-uso-instrucoes';
import { ErroNaIa } from './erro-na-ia';
import {
  LIMITE_DE_CARACTERES_DO_CONTEXTO,
  montarContextoDoChat,
  serializarContextoDoChat,
} from './contexto-do-chat';
import { montarContextoDoPortfolio } from './contexto-do-portfolio';
import { montarInstrucoes, montarInstrucoesDoChat, montarInstrucoesDoPortfolio } from './instrucoes';
import type {
  CofreDeChave,
  ConsultaDeAvs,
  ConsultaDeCronograma,
  ConsultaDeEstrutura,
  ModeloDeAnalise,
  QuemEstaUsando,
  RepositorioDeAnalises,
  RepositorioDeConfiguracaoIa,
  RepositorioDeInstrucoesIa,
} from './portas';

export const MODELO_PADRAO: ModeloIaDTO = 'claude-opus-5';

/** Formato esperado de cada chave, só para barrar colagens incompletas antes de chamar a API. */
const FORMATO_DA_CHAVE: Record<ProvedorIaDTO, { regra: RegExp; dica: string }> = {
  anthropic: {
    regra: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
    dica: 'A chave da Anthropic começa com "sk-ant-". Copie-a inteira do Console da Anthropic.',
  },
  // Chaves antigas começam com "AIza"; as novas do AI Studio têm pontos (ex.: "AQ.…").
  google: {
    regra: /^[A-Za-z0-9._-]{30,}$/,
    dica: 'Chave do Google incompleta. Copie-a inteira do Google AI Studio.',
  },
  openrouter: {
    regra: /^sk-or-[A-Za-z0-9_-]{20,}$/,
    dica: 'A chave do OpenRouter começa com "sk-or-". Copie-a inteira da página Keys do OpenRouter.',
  },
};

async function lerEstado(
  cofre: CofreDeChave,
  configuracao: RepositorioDeConfiguracaoIa,
  escopo: EscopoIaDTO = 'projetos',
): Promise<EstadoIaDTO> {
  const modelo = (await configuracao.obterModelo(escopo)) ?? MODELO_PADRAO;
  const provedor = provedorDoModelo(modelo);
  const chaves = {} as EstadoIaDTO['chaves'];
  for (const cada of PROVEDORES_IA) {
    const chave = await cofre.obter(cada);
    chaves[cada] = chave ? chave.slice(-4) : null;
  }
  return { configurada: chaves[provedor] !== null, modelo, provedor, chaves };
}

export class ObterEstadoIa implements CasoDeUso<void, EstadoIaDTO> {
  constructor(
    private readonly cofre: CofreDeChave,
    private readonly configuracao: RepositorioDeConfiguracaoIa,
    /** Cada módulo escolhe o seu modelo; as chaves de API são comuns. */
    private readonly escopo: EscopoIaDTO = 'projetos',
  ) {}

  executar(): Promise<EstadoIaDTO> {
    return lerEstado(this.cofre, this.configuracao, this.escopo);
  }
}

/** Uma chave nova só é salva depois de a API do provedor aceitá-la. */
export class ConfigurarIa implements CasoDeUso<ConfigurarIaEntrada, EstadoIaDTO> {
  constructor(
    private readonly cofre: CofreDeChave,
    private readonly configuracao: RepositorioDeConfiguracaoIa,
    private readonly modelo: ModeloDeAnalise,
    private readonly escopo: EscopoIaDTO = 'projetos',
  ) {}

  async executar(entrada: ConfigurarIaEntrada): Promise<EstadoIaDTO> {
    const provedor = provedorDoModelo(entrada.modelo);
    const chaveNova = entrada.chave?.trim();
    if (chaveNova) {
      const formato = FORMATO_DA_CHAVE[provedor];
      if (!formato.regra.test(chaveNova)) throw new ErroDeValidacao(formato.dica);
      await this.modelo.testar(chaveNova, entrada.modelo);
      await this.cofre.salvar(provedor, chaveNova);
    } else {
      const chaveSalva = await this.cofre.obter(provedor);
      if (!chaveSalva) throw new ErroDeValidacao('Informe a chave da API deste provedor.');
      await this.modelo.testar(chaveSalva, entrada.modelo);
    }
    await this.configuracao.salvarModelo(entrada.modelo, this.escopo);
    return lerEstado(this.cofre, this.configuracao, this.escopo);
  }
}

/** Remove a chave do provedor do modelo escolhido. */
export class RemoverChaveIa implements CasoDeUso<void, EstadoIaDTO> {
  constructor(
    private readonly cofre: CofreDeChave,
    private readonly configuracao: RepositorioDeConfiguracaoIa,
    private readonly escopo: EscopoIaDTO = 'projetos',
  ) {}

  async executar(): Promise<EstadoIaDTO> {
    const modelo = (await this.configuracao.obterModelo(this.escopo)) ?? MODELO_PADRAO;
    await this.cofre.remover(provedorDoModelo(modelo));
    return lerEstado(this.cofre, this.configuracao, this.escopo);
  }
}

/** O que as duas análises usam. Um objeto só, porque a lista é longa. */
export interface DependenciasDaAnalise {
  cofre: CofreDeChave;
  configuracao: RepositorioDeConfiguracaoIa;
  modelo: ModeloDeAnalise;
  consultaDeCronograma: ConsultaDeCronograma;
  consultaDeEstrutura: ConsultaDeEstrutura;
  consultaDeAvs: ConsultaDeAvs;
  instrucoes: RepositorioDeInstrucoesIa;
  arquivo: RepositorioDeAnalises;
  quemEstaUsando: QuemEstaUsando;
  geradorDeId: GeradorDeId;
  relogio: Relogio;
}

export const TITULO_DO_PORTFOLIO = 'Portfólio';

export async function modeloEChave(
  deps: DependenciasDaAnalise,
  escopo: EscopoIaDTO = 'projetos',
): Promise<{ modelo: ModeloIaDTO; chave: string }> {
  const modelo = (await deps.configuracao.obterModelo(escopo)) ?? MODELO_PADRAO;
  const chave = await deps.cofre.obter(provedorDoModelo(modelo));
  if (!chave) {
    throw new ErroNaIa('A análise com IA ainda não foi configurada. Peça ao administrador para informar a chave da API em Configurações.');
  }
  return { modelo, chave };
}

/**
 * Só lê o cronograma: a IA descreve e sugere, nunca o altera. O relatório vai para o arquivo de
 * análises, para ser consultado depois sem gastar outra chamada.
 */
export class AnalisarCronograma implements CasoDeUso<string, AnaliseCronogramaDTO> {
  constructor(private readonly deps: DependenciasDaAnalise) {}

  async executar(cronogramaId: string): Promise<AnaliseCronogramaDTO> {
    const { modelo, chave } = await modeloEChave(this.deps);
    const cronograma = await this.deps.consultaDeCronograma.obterResumo(cronogramaId);
    if (!cronograma) throw new ErroNaoEncontrado('Cronograma');
    const estrutura = await this.deps.consultaDeEstrutura.obterEstrutura(cronogramaId);
    if (estrutura.linhas.length === 0) {
      throw new ErroNaIa('Este cronograma ainda não tem atividades para analisar.');
    }

    const agora = this.deps.relogio.agora();
    // Data local (AAAA-MM-DD): é a que a equipe vê na tela como "hoje".
    const hoje = agora.toLocaleDateString('sv-SE');

    const { checklist, orientacoes } = await lerInstrucoes(this.deps.instrucoes);
    const resultado = await this.deps.modelo.analisar({
      chave,
      modelo,
      instrucoes: montarInstrucoes(checklist, orientacoes),
      contexto: montarContexto(cronograma, estrutura, hoje),
    });
    const analise: AnaliseCronogramaDTO = {
      ...resultado,
      id: this.deps.geradorDeId.gerar(),
      geradaEm: agora.toISOString(),
      geradaPor: this.deps.quemEstaUsando.nomeDoUsuarioAtual(),
    };
    await this.deps.arquivo.salvar({
      ...resumoDaAnalise(analise, cronogramaId, cronograma.nome),
      tipo: 'cronograma',
      analise,
    });
    return analise;
  }
}

/** Visão macro de todos os cronogramas não arquivados. Só lê, e também vai para o arquivo. */
export class AnalisarPortfolio implements CasoDeUso<void, AnalisePortfolioDTO> {
  constructor(private readonly deps: DependenciasDaAnalise) {}

  async executar(): Promise<AnalisePortfolioDTO> {
    const { modelo, chave } = await modeloEChave(this.deps);

    const itens = [];
    for (const id of await this.deps.consultaDeCronograma.listarIdsAtivos()) {
      const resumo = await this.deps.consultaDeCronograma.obterResumo(id);
      if (!resumo) continue;
      const estrutura = await this.deps.consultaDeEstrutura.obterEstrutura(id);
      // Projeto ainda sem atividades não tem o que analisar e só ocuparia espaço no pedido.
      if (estrutura.linhas.some((linha) => linha.tipo === 'tarefa')) itens.push({ resumo, estrutura });
    }
    if (itens.length === 0) {
      throw new ErroNaIa('Não há cronogramas em andamento com atividades para analisar.');
    }

    const agora = this.deps.relogio.agora();
    const hoje = agora.toLocaleDateString('sv-SE');
    const { orientacoes } = await lerInstrucoes(this.deps.instrucoes);

    const resultado = await this.deps.modelo.analisarPortfolio({
      chave,
      modelo,
      instrucoes: montarInstrucoesDoPortfolio(orientacoes),
      contexto: montarContextoDoPortfolio(itens, hoje),
    });
    const analise: AnalisePortfolioDTO = {
      ...resultado,
      id: this.deps.geradorDeId.gerar(),
      geradaEm: agora.toISOString(),
      geradaPor: this.deps.quemEstaUsando.nomeDoUsuarioAtual(),
      quantidadeDeProjetos: itens.length,
    };
    await this.deps.arquivo.salvar({
      ...resumoDaAnalise(analise, null, TITULO_DO_PORTFOLIO),
      tipo: 'portfolio',
      analise,
    });
    return analise;
  }
}

/**
 * Chat de perguntas e respostas sobre todos os cronogramas em andamento. Só lê: a IA nunca altera
 * dados. As conversas não são guardadas; o histórico vem da tela a cada pergunta.
 */
export class ConversarComIa implements CasoDeUso<ConversarComIaEntrada, RespostaDoChatDTO> {
  constructor(private readonly deps: DependenciasDaAnalise) {}

  async executar(entrada: ConversarComIaEntrada): Promise<RespostaDoChatDTO> {
    const mensagens = validarHistorico(entrada.mensagens);
    const { modelo, chave } = await modeloEChave(this.deps);

    const itens = [];
    for (const id of await this.deps.consultaDeCronograma.listarIdsAtivos()) {
      const resumo = await this.deps.consultaDeCronograma.obterResumo(id);
      if (!resumo) continue;
      const estrutura = await this.deps.consultaDeEstrutura.obterEstrutura(id);
      if (estrutura.linhas.length > 0) itens.push({ resumo, estrutura });
    }
    if (itens.length === 0) {
      throw new ErroNaIa('Não há cronogramas em andamento com atividades para consultar.');
    }

    const hoje = this.deps.relogio.agora().toLocaleDateString('sv-SE');
    const contexto = montarContextoDoChat(itens, hoje);
    if (serializarContextoDoChat(contexto).length > LIMITE_DE_CARACTERES_DO_CONTEXTO) {
      throw new ErroNaIa(
        'Há dados demais nos cronogramas em andamento para caberem numa consulta. Arquive os projetos já concluídos e tente de novo.',
      );
    }

    const { orientacoes } = await lerInstrucoes(this.deps.instrucoes);
    const resultado = await this.deps.modelo.conversar({
      chave,
      modelo,
      instrucoes: montarInstrucoesDoChat(orientacoes),
      contexto,
      mensagens,
    });
    return { texto: resultado.texto, modelo: resultado.modelo };
  }
}

/** Mantém só as últimas falas, garante que comecem e terminem no usuário e que se alternem. */
export function validarHistorico(mensagens: ConversarComIaEntrada['mensagens']): ConversarComIaEntrada['mensagens'] {
  const recentes = mensagens.slice(-LIMITE_DE_MENSAGENS_DO_CHAT);
  // Cortar o início pode deixar uma resposta da IA sem a pergunta que a originou.
  const historico = recentes[0]?.papel === 'ia' ? recentes.slice(1) : recentes;

  if (historico.at(-1)?.papel !== 'usuario') {
    throw new ErroDeValidacao('Escreva uma pergunta para a IA.');
  }
  historico.forEach((mensagem, indice) => {
    if (mensagem.papel !== (indice % 2 === 0 ? 'usuario' : 'ia')) {
      throw new ErroDeValidacao('O histórico da conversa está fora de ordem.');
    }
    if (!mensagem.texto.trim()) throw new ErroDeValidacao('Mensagem vazia.');
    if (mensagem.papel === 'usuario' && mensagem.texto.length > LIMITE_DE_CARACTERES_DA_PERGUNTA) {
      throw new ErroDeValidacao(`A pergunta pode ter até ${LIMITE_DE_CARACTERES_DA_PERGUNTA} caracteres.`);
    }
  });
  return historico;
}

function resumoDaAnalise(
  analise: AnaliseCronogramaDTO | AnalisePortfolioDTO,
  cronogramaId: string | null,
  titulo: string,
): Omit<ResumoDeAnaliseDTO, 'tipo'> {
  return {
    id: analise.id,
    cronogramaId,
    titulo,
    modelo: analise.modelo,
    saude: analise.saude,
    geradaEm: analise.geradaEm,
    geradaPor: analise.geradaPor,
  };
}
