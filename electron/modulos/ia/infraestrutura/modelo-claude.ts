import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { ErroNaIa } from '../aplicacao/erro-na-ia';
import type {
  FerramentaDoChat,
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

const MODELOS_COM_FALLBACK: ModeloIaDTO[] = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-opus-5'];
/** Limite de idas e voltas com as ferramentas num turno do agente. */
const MAXIMO_DE_RODADAS_DO_AGENTE = 8;

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
    if (pedido.ferramentas?.length) return this.conversarComFerramentas(pedido, pedido.ferramentas);
    const cliente = new Anthropic({ apiKey: pedido.chave, timeout: 180_000 });
    let resposta;
    try {
      resposta = await cliente.messages.create({
        model: pedido.modelo,
        max_tokens: LIMITE_DE_TOKENS_DA_RESPOSTA_DO_CHAT,
        // Os dados dos projetos são iguais a cada pergunta da conversa: o cache barateia as seguintes.
        system: [
          { type: 'text', text: sistemaDoChat(pedido.instrucoes, pedido.contexto, pedido.rotuloDosDados), cache_control: { type: 'ephemeral' } },
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

  /**
   * Chat com ferramentas (agente): a IA pode consultar e registrar uma proposta antes de responder. O laço
   * devolve o conteúdo inteiro de cada resposta (blocos de raciocínio inclusive) e para no fim do turno,
   * numa recusa ou após um número máximo de rodadas.
   */
  private async conversarComFerramentas(pedido: PedidoDeConversa, ferramentas: FerramentaDoChat[]): Promise<ResultadoDaConversa> {
    const cliente = new Anthropic({ apiKey: pedido.chave, timeout: 180_000 });
    const comFallback = (MODELOS_COM_FALLBACK as readonly string[]).includes(pedido.modelo);
    const porNome = new Map(ferramentas.map((ferramenta) => [ferramenta.nome, ferramenta]));
    const tools: Anthropic.Beta.BetaTool[] = ferramentas.map((ferramenta) => ({
      name: ferramenta.nome,
      description: ferramenta.descricao,
      input_schema: ferramenta.esquema as Anthropic.Beta.BetaTool.InputSchema,
    }));
    const mensagens: Anthropic.Beta.BetaMessageParam[] = pedido.mensagens.map((mensagem) => ({
      role: mensagem.papel === 'usuario' ? ('user' as const) : ('assistant' as const),
      content: mensagem.texto,
    }));
    const textos: string[] = [];
    let modeloQueRespondeu: string = pedido.modelo;

    for (let rodada = 0; rodada < MAXIMO_DE_RODADAS_DO_AGENTE; rodada++) {
      let resposta;
      try {
        resposta = await cliente.beta.messages.create({
          model: pedido.modelo,
          max_tokens: 16000,
          ...(comFallback && {
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default' as const,
          }),
          tools,
          system: [
            {
              type: 'text',
              text: sistemaDoChat(pedido.instrucoes, pedido.contexto, pedido.rotuloDosDados),
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages: mensagens,
        });
      } catch (erro) {
        traduzirErro(erro, pedido.modelo);
      }
      modeloQueRespondeu = resposta.model;
      console.info(
        `[ia] agente por ${resposta.model} (rodada ${rodada + 1}): ${resposta.usage.input_tokens} tokens de entrada, ` +
          `${resposta.usage.output_tokens} de saída (${resposta.stop_reason})`,
      );
      if (resposta.stop_reason === 'refusal') {
        throw new ErroNaIa('A IA não conseguiu responder a este pedido. Reformule ou tente de novo.');
      }

      const texto = resposta.content.flatMap((bloco) => (bloco.type === 'text' ? [bloco.text] : [])).join('\n').trim();
      if (texto) textos.push(texto);
      mensagens.push({ role: 'assistant', content: resposta.content });

      if (resposta.stop_reason === 'pause_turn') continue;
      const chamadas = resposta.content.filter((bloco): bloco is Anthropic.Beta.BetaToolUseBlock => bloco.type === 'tool_use');
      if (resposta.stop_reason !== 'tool_use' || chamadas.length === 0) break;

      // Todas as respostas das ferramentas voltam numa única mensagem do usuário.
      const resultados: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const chamada of chamadas) {
        const ferramenta = porNome.get(chamada.name);
        let saida: { conteudo: string; erro?: boolean };
        try {
          saida = ferramenta ? await ferramenta.executar(chamada.input) : { conteudo: `Ferramenta desconhecida: ${chamada.name}.`, erro: true };
        } catch (erro) {
          // Erro de regra (ex.: dado inválido) volta para a IA corrigir; o resto segue como erro interno.
          if (!(erro instanceof Error) || erro.name === 'Error') throw erro;
          saida = { conteudo: erro.message, erro: true };
        }
        resultados.push({ type: 'tool_result', tool_use_id: chamada.id, content: saida.conteudo, ...(saida.erro && { is_error: true }) });
      }
      mensagens.push({ role: 'user', content: resultados });
    }

    const texto = textos.at(-1) ?? '';
    if (!texto) throw new ErroNaIa('A IA não conseguiu concluir a resposta. Tente de novo.');
    return { texto, modelo: modeloQueRespondeu };
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
    // Uma recusa dos classificadores de segurança é refeita no modelo recomendado (o Haiku não tem fallback).
    const comFallback = (MODELOS_COM_FALLBACK as readonly string[]).includes(modelo);

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
