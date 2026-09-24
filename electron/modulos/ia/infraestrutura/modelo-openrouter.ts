import { z } from 'zod';
import { ErroNaIa } from '../aplicacao/erro-na-ia';
import type {
  ModeloDeAnalise,
  ModeloIaDTO,
  PedidoDeAnalise,
  PedidoDeAnalisePortfolio,
  PedidoDeConversa,
  ResultadoDaConversa,
  ResultadoDoModelo,
  ResultadoDoPortfolio,
} from '../aplicacao/portas';
import {
  EsquemaDaAnalise,
  EsquemaDoPortfolio,
  LIMITE_DE_TOKENS_DA_RESPOSTA_DO_CHAT,
  mensagemDoCronograma,
  mensagemDoPortfolio,
  sistemaDoChat,
} from './instrucoes-da-analise';

const URL_BASE = 'https://openrouter.ai/api/v1';
const ROTEADOR_GRATUITO = 'openrouter/free';

/** Esperas antes de cada nova tentativa quando o OpenRouter responde 429/5xx (modelos gratuitos oscilam). */
const ESPERAS_ENTRE_TENTATIVAS_MS = [2_000, 5_000];
const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

interface RespostaDeErro {
  error?: { code?: number | string; message?: string };
}

interface RespostaDoChat extends RespostaDeErro {
  model?: string;
  choices?: { message?: { content?: string | null }; finish_reason?: string | null }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** Falha de HTTP (ou erro no corpo de uma resposta 200) devolvida pelo OpenRouter. */
class ErroDoOpenRouter extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const ehErroTemporario = (erro: unknown) =>
  erro instanceof ErroDoOpenRouter && (erro.status === 429 || erro.status >= 500);

/** Erros esperados da API viram mensagens para a pessoa; o resto segue como erro interno. */
function traduzirErro(erro: unknown, modelo: string): never {
  if (erro instanceof ErroDoOpenRouter) {
    // O detalhe técnico vai para o log, onde dá para diagnosticar; a tela recebe a versão legível.
    console.warn(`[ia] erro do OpenRouter (${modelo}): status ${erro.status} — ${erro.message}`);
    if (erro.status === 401) {
      throw new ErroNaIa('O OpenRouter recusou a chave da API: ela pode estar incompleta, revogada ou desativada.');
    }
    if (erro.status === 402) {
      throw new ErroNaIa('A conta do OpenRouter não tem créditos para este modelo. Use um modelo gratuito (":free") ou adicione créditos.');
    }
    if (erro.status === 403) {
      throw new ErroNaIa('O OpenRouter bloqueou esta requisição (política do provedor do modelo). Tente outro modelo em Configurações.');
    }
    if (erro.status === 404) {
      throw new ErroNaIa('O modelo escolhido não está disponível no OpenRouter agora. Troque o modelo em Configurações.');
    }
    if (erro.status === 429) {
      throw new ErroNaIa('O limite de uso gratuito do OpenRouter foi atingido (ou o modelo está congestionado). Tente de novo em alguns minutos ou use outro modelo.');
    }
    if (erro.status >= 500) {
      throw new ErroNaIa(`O modelo ${modelo} está indisponível no OpenRouter agora. Tente de novo em alguns minutos ou use outro modelo em Configurações.`);
    }
  }
  if (erro instanceof DOMException && (erro.name === 'TimeoutError' || erro.name === 'AbortError')) {
    throw new ErroNaIa('O modelo demorou demais para responder. Tente de novo ou use outro modelo em Configurações.');
  }
  // O fetch do Node reporta a falta de rede como TypeError ("fetch failed").
  if (erro instanceof TypeError && /fetch/i.test(erro.message)) {
    throw new ErroNaIa('Não foi possível falar com o OpenRouter. Verifique a conexão com a internet.');
  }
  throw erro;
}

/** A resposta pode vir dentro de uma cerca ```json, ou com texto antes e depois do JSON. */
function extrairJson(texto: string): unknown {
  const semCerca = texto.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  const inicio = semCerca.indexOf('{');
  const fim = semCerca.lastIndexOf('}');
  return JSON.parse(inicio >= 0 && fim > inicio ? semCerca.slice(inicio, fim + 1) : semCerca);
}

/** Chama o chat/completions refazendo a chamada em falhas temporárias; os demais erros viram mensagens. */
async function conversarComNovasTentativas(chave: string, modelo: string, corpo: unknown): Promise<RespostaDoChat> {
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await chamar<RespostaDoChat>('/chat/completions', chave, corpo);
    } catch (erro) {
      const proximaEspera = ESPERAS_ENTRE_TENTATIVAS_MS[tentativa];
      if (!ehErroTemporario(erro) || proximaEspera === undefined) traduzirErro(erro, modelo);
      console.warn(
        `[ia] OpenRouter (${modelo}) respondeu ${(erro as ErroDoOpenRouter).status}; nova tentativa em ${proximaEspera / 1000} s`,
      );
      await espera(proximaEspera);
    }
  }
}

async function chamar<T>(caminho: string, chave: string, corpo?: unknown): Promise<T> {
  const resposta = await fetch(`${URL_BASE}${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
      'X-Title': 'Gestão de Cronogramas',
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(180_000),
  });
  const json = (await resposta.json().catch(() => ({}))) as T & RespostaDeErro;
  if (!resposta.ok || json.error) {
    const status = resposta.ok ? Number(json.error?.code) || 502 : resposta.status;
    throw new ErroDoOpenRouter(status, json.error?.message ?? resposta.statusText);
  }
  return json;
}

export class ModeloOpenRouter implements ModeloDeAnalise {
  async testar(chave: string, modelo: ModeloIaDTO): Promise<void> {
    try {
      // Consulta os dados da chave: valida-a sem gastar a cota de requisições dos modelos.
      await chamar('/key', chave);
    } catch (erro) {
      traduzirErro(erro, modelo);
    }
  }

  async analisar(pedido: PedidoDeAnalise): Promise<ResultadoDoModelo> {
    const { dados, modelo } = await this.gerar(
      EsquemaDaAnalise,
      pedido.chave,
      pedido.modelo,
      pedido.instrucoes,
      mensagemDoCronograma(pedido.contexto),
    );
    return { ...dados, modelo };
  }

  async analisarPortfolio(pedido: PedidoDeAnalisePortfolio): Promise<ResultadoDoPortfolio> {
    const { dados, modelo } = await this.gerar(
      EsquemaDoPortfolio,
      pedido.chave,
      pedido.modelo,
      pedido.instrucoes,
      mensagemDoPortfolio(pedido.contexto),
    );
    return { ...dados, modelo };
  }

  async conversar(pedido: PedidoDeConversa): Promise<ResultadoDaConversa> {
    const corpo = {
      model: pedido.modelo,
      max_tokens: LIMITE_DE_TOKENS_DA_RESPOSTA_DO_CHAT,
      messages: [
        { role: 'system', content: sistemaDoChat(pedido.instrucoes, pedido.contexto) },
        ...pedido.mensagens.map((mensagem) => ({
          role: mensagem.papel === 'usuario' ? 'user' : 'assistant',
          content: mensagem.texto,
        })),
      ],
    };
    const resposta = await conversarComNovasTentativas(pedido.chave, pedido.modelo, corpo);

    const modeloQueRespondeu = resposta.model ?? pedido.modelo;
    console.info(
      `[ia] chat por ${modeloQueRespondeu}: ${resposta.usage?.prompt_tokens ?? '?'} tokens de entrada, ` +
        `${resposta.usage?.completion_tokens ?? '?'} de saída`,
    );
    const texto = resposta.choices?.[0]?.message?.content?.trim();
    if (!texto) {
      throw new ErroNaIa('A IA não conseguiu responder a esta pergunta. Reformule, tente de novo ou use outro modelo em Configurações.');
    }
    return { texto, modelo: modeloQueRespondeu };
  }

  /** Pede um JSON no formato do esquema, com novas tentativas em falhas temporárias do OpenRouter. */
  protected async gerar<T>(
    esquema: z.ZodType<T>,
    chave: string,
    modelo: ModeloIaDTO,
    instrucoes: string,
    mensagem: string,
  ): Promise<{ dados: T; modelo: string }> {
    const jsonSchema = z.toJSONSchema(esquema);
    delete (jsonSchema as Record<string, unknown>).$schema;

    const corpo = {
      model: modelo,
      messages: [
        {
          role: 'system',
          // Nem todo modelo gratuito respeita o response_format: o esquema também vai no texto.
          content: `${instrucoes}\n\nResponda apenas com um objeto JSON válido, sem texto fora dele, no formato deste JSON Schema:\n${JSON.stringify(jsonSchema)}`,
        },
        { role: 'user', content: mensagem },
      ],
      response_format: { type: 'json_schema', json_schema: { name: 'analise', strict: true, schema: jsonSchema } },
      // Num modelo específico, só aceita provedores que suportem o response_format; o roteador já filtra sozinho.
      ...(modelo !== ROTEADOR_GRATUITO && { provider: { require_parameters: true } }),
    };

    const resposta = await conversarComNovasTentativas(chave, modelo, corpo);

    const modeloQueRespondeu = resposta.model ?? modelo;
    const escolha = resposta.choices?.[0];
    console.info(
      `[ia] análise por ${modeloQueRespondeu}: ` +
        `${resposta.usage?.prompt_tokens ?? '?'} tokens de entrada, ` +
        `${resposta.usage?.completion_tokens ?? '?'} de saída (${escolha?.finish_reason ?? 'sem motivo'})`,
    );

    const texto = escolha?.message?.content;
    if (!texto) {
      throw new ErroNaIa('A IA não conseguiu fazer esta análise. Tente de novo ou use outro modelo em Configurações.');
    }
    try {
      return { dados: esquema.parse(extrairJson(texto)), modelo: modeloQueRespondeu };
    } catch {
      throw new ErroNaIa('A resposta da IA veio incompleta ou fora do formato. Tente gerar a análise de novo ou use outro modelo em Configurações.');
    }
  }
}
