import { z } from 'zod';
import { type ContextoDoChat, serializarContextoDoChat } from '../aplicacao/contexto-do-chat';

/** Formato do relatório pedido à IA, igual para qualquer provedor. */
export const EsquemaDaAnalise = z.object({
  saude: z.enum(['no_prazo', 'atencao', 'critico']),
  resumo: z.string(),
  riscos: z.array(
    z.object({
      titulo: z.string(),
      detalhe: z.string(),
      gravidade: z.enum(['alta', 'media', 'baixa']),
      tarefas: z.array(z.string()),
    }),
  ),
  gargalos: z.array(z.object({ responsavel: z.string(), motivo: z.string() })),
  sugestoes: z.array(
    z.object({ acao: z.string(), justificativa: z.string(), tarefas: z.array(z.string()) }),
  ),
});

export const mensagemDoCronograma = (contexto: unknown) => `Cronograma:\n${JSON.stringify(contexto)}`;

const saude = z.enum(['no_prazo', 'atencao', 'critico']);

/** Formato do relatório de portfólio (visão macro de todos os projetos). */
export const EsquemaDoPortfolio = z.object({
  saude,
  resumo: z.string(),
  projetos: z.array(z.object({ nome: z.string(), saude, comentario: z.string() })),
  conflitosDeRecursos: z.array(
    z.object({ responsavel: z.string(), projetos: z.array(z.string()), motivo: z.string() }),
  ),
  riscos: z.array(
    z.object({
      titulo: z.string(),
      detalhe: z.string(),
      gravidade: z.enum(['alta', 'media', 'baixa']),
      projetos: z.array(z.string()),
    }),
  ),
  prioridades: z.array(
    z.object({ acao: z.string(), justificativa: z.string(), projetos: z.array(z.string()) }),
  ),
});

export const mensagemDoPortfolio = (contexto: unknown) => `Portfólio de projetos:\n${JSON.stringify(contexto)}`;

/** Texto de sistema do chat: as instruções e, em seguida, os dados que ele pode consultar. */
export const sistemaDoChat = (instrucoes: string, contexto: ContextoDoChat) =>
  `${instrucoes}\n\nDados dos projetos (JSON):\n${serializarContextoDoChat(contexto)}`;

export const LIMITE_DE_TOKENS_DA_RESPOSTA_DO_CHAT = 4096;
