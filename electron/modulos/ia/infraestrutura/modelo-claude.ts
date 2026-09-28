import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
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

/** Erros esperados da API viram mensagens para a pessoa; o resto segue como erro interno. */
function traduzirErro(erro: unknown, modelo: string): never {
  if (erro instanceof Anthropic.APIError) {
    // O detalhe técnico vai para o log, onde dá para diagnosticar; a tela recebe a versão legível.
    console.warn(`[ia] erro da Anthropic (${modelo}): status ${erro.status ?? '?'} — ${erro.message}`);
  }
  if (erro instanceof Anthropic.AuthenticationError) {
    throw new ErroNaIa('A Anthropic recusou a chave da API: ela pode estar incompleta, revogada ou expirada.');
  }
  if (erro instanceof Anthropic.PermissionDeniedError) {
    throw new ErroNaIa('A chave da API não tem permissão para usar este modelo.');
  }
  if (erro instanceof Anthropic.NotFoundError) {
    throw new ErroNaIa('O modelo escolhido não está disponível para esta chave. Troque o modelo em Configurações.');
  }
  if (erro instanceof Anthropic.RateLimitError) {
    throw new ErroNaIa('O limite de uso da API foi atingido. Tente de novo em alguns instantes.');
  }
  if (erro instanceof Anthropic.APIConnectionError) {
    throw new ErroNaIa('Não foi possível falar com a API da Anthropic. Verifique a conexão com a internet.');
  }
  if (erro instanceof Anthropic.APIError && (erro.status ?? 0) >= 500) {
    throw new ErroNaIa('O serviço de IA está indisponível no momento. Tente de novo em alguns minutos.');
  }
  throw erro;
}

export class ModeloClaude implements ModeloDeAnalise {
  async testar(chave: string, modelo: ModeloIaDTO): Promise<void> {
    try {
      // Consulta o catálogo de modelos: valida a chave e o acesso ao modelo sem gastar tokens.
      await new Anthropic({ apiKey: chave, maxRetries: 1 }).models.retrieve(modelo);
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
    const cliente = new Anthropic({ apiKey: pedido.chave, timeout: 180_000 });
    let resposta;
    try {
      resposta = await cliente.messages.create({
        model: pedido.modelo,
        max_tokens: LIMITE_DE_TOKENS_DA_RESPOSTA_DO_CHAT,
        // Os dados dos projetos são iguais a cada pergunta da conversa: o cache barateia as seguintes.
        system: [
          { type: 'text', text: sistemaDoChat(pedido.instrucoes, pedido.contexto), cache_control: { type: 'ephemeral' } },
        ],
        messages: pedido.mensagens.map((mensagem) => ({
          role: mensagem.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
          content: mensagem.texto,
        })),
      });
    } catch (erro) {
      traduzirErro(erro, pedido.modelo);
    }

    console.info(
      `[ia] chat por ${resposta.model}: ${resposta.usage.input_tokens} tokens de entrada, ` +
        `${resposta.usage.output_tokens} de saída (${resposta.stop_reason})`,
    );
    const texto = resposta.content
      .flatMap((bloco) => (bloco.type === 'text' ? [bloco.text] : []))
      .join('\n')
      .trim();
    if (resposta.stop_reason === 'refusal' || !texto) {
      throw new ErroNaIa('A IA não conseguiu responder a esta pergunta. Reformule ou tente de novo.');
    }
    return { texto, modelo: resposta.model };
  }

  /** Pede um JSON no formato do esquema. O SDK já refaz sozinho as falhas temporárias (5xx/429). */
  protected async gerar<T>(
    esquema: z.ZodType<T>,
    chave: string,
    modelo: ModeloIaDTO,
    instrucoes: string,
    mensagem: string,
  ): Promise<{ dados: T; modelo: string }> {
    const cliente = new Anthropic({ apiKey: chave, timeout: 180_000 });
    // No Opus 5, uma recusa dos classificadores de segurança é refeita no modelo recomendado.
    const comFallback = modelo === 'claude-opus-5';

    let resposta;
    try {
      resposta = await cliente.beta.messages.parse({
        model: modelo,
        max_tokens: 16000,
        ...(comFallback && {
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default' as const,
        }),
        thinking: { type: 'adaptive' },
        output_config: { effort: 'high', format: betaZodOutputFormat(esquema) },
        system: instrucoes,
        messages: [{ role: 'user', content: mensagem }],
      });
    } catch (erro) {
      traduzirErro(erro, modelo);
    }

    console.info(
      `[ia] análise por ${resposta.model}: ${resposta.usage.input_tokens} tokens de entrada, ` +
        `${resposta.usage.output_tokens} de saída (${resposta.stop_reason})`,
    );

    if (resposta.stop_reason === 'refusal') {
      throw new ErroNaIa('A IA não conseguiu fazer esta análise. Tente de novo mais tarde.');
    }
    if (resposta.stop_reason === 'max_tokens' || !resposta.parsed_output) {
      throw new ErroNaIa('A resposta da IA veio incompleta. Tente gerar a análise de novo.');
    }
    return { dados: resposta.parsed_output, modelo: resposta.model };
  }
}
