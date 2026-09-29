import { ApiError, GoogleGenAI } from '@google/genai';
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
  mensagemDoCronograma,
  mensagemDoPortfolio,
  sistemaDoChat,
} from './instrucoes-da-analise';

/** Esperas antes de cada nova tentativa quando o Google responde 5xx (sobrecarga é comum). */
const ESPERAS_ENTRE_TENTATIVAS_MS = [2_000, 5_000];
const espera = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

/** A API do Gemini aceita só um subconjunto do JSON Schema; o campo "$schema" fica de fora. */
function paraEsquemaGemini(esquema: z.ZodType): Record<string, unknown> {
  const json: Record<string, unknown> = { ...z.toJSONSchema(esquema) };
  delete json.$schema;
  return json;
}

const ehErroTemporario = (erro: unknown) => erro instanceof ApiError && erro.status >= 500;

/** Executa a chamada refazendo-a em falhas temporárias do Google; os demais erros viram mensagens. */
async function comNovasTentativas<T>(modelo: string, chamada: () => Promise<T>): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await chamada();
    } catch (erro) {
      const proximaEspera = ESPERAS_ENTRE_TENTATIVAS_MS[tentativa];
      if (!ehErroTemporario(erro) || proximaEspera === undefined) traduzirErro(erro, modelo);
      console.warn(
        `[ia] Gemini (${modelo}) respondeu ${(erro as ApiError).status}; nova tentativa em ${proximaEspera / 1000} s`,
      );
      await espera(proximaEspera);
    }
  }
}

/** Erros esperados da API viram mensagens para a pessoa; o resto segue como erro interno. */
function traduzirErro(erro: unknown, modelo: string): never {
  if (erro instanceof ApiError) {
    // O detalhe técnico vai para o log, onde dá para diagnosticar; a tela recebe a versão legível.
    console.warn(`[ia] erro do Gemini (${modelo}): status ${erro.status} — ${erro.message}`);
    const texto = erro.message ?? '';
    if (/API[_ ]?key/i.test(texto) || erro.status === 401 || erro.status === 403) {
      throw new ErroNaIa('O Google recusou a chave da API: ela pode estar incompleta, revogada ou sem acesso à API Gemini.');
    }
    if (erro.status === 404) {
      throw new ErroNaIa('O modelo escolhido não está disponível para esta chave. Troque o modelo em Configurações.');
    }
    if (erro.status === 429) {
      throw new ErroNaIa('O limite de uso da API Gemini foi atingido (no plano gratuito ele é menor). Tente de novo em alguns minutos.');
    }
    if (erro.status >= 500) {
      throw new ErroNaIa(
        `O modelo ${modelo} está sobrecarregado ou indisponível no Google agora. Tente de novo em alguns minutos ou use o Gemini 3.5 Flash-Lite em Configurações.`,
      );
    }
  }
  // O SDK usa fetch: sem rede, a falha chega como TypeError ("fetch failed").
  if (erro instanceof TypeError && /fetch/i.test(erro.message)) {
    throw new ErroNaIa('Não foi possível falar com a API do Google. Verifique a conexão com a internet.');
  }
  throw erro;
}

export class ModeloGemini implements ModeloDeAnalise {
  async testar(chave: string, modelo: ModeloIaDTO): Promise<void> {
    try {
      // Consulta o catálogo de modelos: valida a chave e o acesso ao modelo sem gastar cota de geração.
      await new GoogleGenAI({ apiKey: chave }).models.get({ model: modelo });
    } catch (erro) {
      traduzirErro(erro, modelo);
    }
  }

  async analisar(pedido: PedidoDeAnalise): Promise<ResultadoDoModelo> {
    const dados = await this.gerar(EsquemaDaAnalise, pedido.chave, pedido.modelo, pedido.instrucoes, mensagemDoCronograma(pedido.contexto));
    return { ...dados, modelo: pedido.modelo };
  }

  async analisarPortfolio(pedido: PedidoDeAnalisePortfolio): Promise<ResultadoDoPortfolio> {
    const dados = await this.gerar(EsquemaDoPortfolio, pedido.chave, pedido.modelo, pedido.instrucoes, mensagemDoPortfolio(pedido.contexto));
    return { ...dados, modelo: pedido.modelo };
  }

  async conversar(pedido: PedidoDeConversa): Promise<ResultadoDaConversa> {
    const cliente = new GoogleGenAI({ apiKey: pedido.chave, httpOptions: { timeout: 180_000 } });
    const resposta = await comNovasTentativas(pedido.modelo, () =>
      cliente.models.generateContent({
        model: pedido.modelo,
        contents: pedido.mensagens.map((mensagem) => ({
          role: mensagem.papel === 'usuario' ? 'user' : 'model',
          parts: [{ text: mensagem.texto }],
        })),
        config: { systemInstruction: sistemaDoChat(pedido.instrucoes, pedido.contexto, pedido.rotuloDosDados) },
      }),
    );
    console.info(
      `[ia] chat por ${resposta.modelVersion ?? pedido.modelo}: ` +
        `${resposta.usageMetadata?.promptTokenCount ?? '?'} tokens de entrada, ` +
        `${resposta.usageMetadata?.candidatesTokenCount ?? '?'} de saída`,
    );
    const texto = resposta.text?.trim();
    if (!texto) throw new ErroNaIa('A IA não conseguiu responder a esta pergunta. Reformule ou tente de novo.');
    return { texto, modelo: resposta.modelVersion ?? pedido.modelo };
  }

  /** Pede um JSON no formato do esquema, com novas tentativas em falhas temporárias do Google. */
  protected async gerar<T>(
    esquema: z.ZodType<T>,
    chave: string,
    modelo: ModeloIaDTO,
    instrucoes: string,
    mensagem: string,
  ): Promise<T> {
    const cliente = new GoogleGenAI({ apiKey: chave, httpOptions: { timeout: 180_000 } });

    const resposta = await comNovasTentativas(modelo, () =>
      cliente.models.generateContent({
        model: modelo,
        contents: mensagem,
        config: {
          systemInstruction: instrucoes,
          responseMimeType: 'application/json',
          responseJsonSchema: paraEsquemaGemini(esquema),
        },
      }),
    );

    const motivoDoFim = resposta.candidates?.[0]?.finishReason;
    console.info(
      `[ia] análise por ${resposta.modelVersion ?? modelo}: ` +
        `${resposta.usageMetadata?.promptTokenCount ?? '?'} tokens de entrada, ` +
        `${resposta.usageMetadata?.candidatesTokenCount ?? '?'} de saída (${motivoDoFim ?? 'sem motivo'})`,
    );

    const texto = resposta.text;
    if (!texto) {
      throw new ErroNaIa('A IA não conseguiu fazer esta análise. Tente de novo mais tarde.');
    }
    try {
      return esquema.parse(JSON.parse(texto));
    } catch {
      throw new ErroNaIa('A resposta da IA veio incompleta. Tente gerar a análise de novo.');
    }
  }
}
