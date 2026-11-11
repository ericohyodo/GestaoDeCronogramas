import { z } from 'zod';
import type { EsquemasDoAgente, LeituraDaEntrada } from '../aplicacao/portas';

// =====================================================================================================
// Esquemas das ferramentas do agente do chat (zod). O mesmo esquema gera o JSON Schema enviado à API e
// valida a entrada que o modelo devolve, antes de qualquer uso.
// =====================================================================================================

const LIMITE_DE_ALTERACOES = 60;
const data = z.string().describe('Data no formato AAAA-MM-DD.');
const id = z.string().min(1).max(64);

const VerCronograma = z.object({
  projeto: z.string().min(1).max(160).describe('Nome do projeto (ou parte dele) ou o código, ex.: "PRO 26-001".'),
});

const Operacao = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('concluir_tarefa').describe('Dar baixa: 100 %, concluída, com a data em que terminou de fato.'),
    tarefaId: id,
    dataEfetiva: data.nullable().describe('Quando terminou de fato; null = hoje.'),
    evidencia: z.string().max(4000).nullable().describe('Comprovação da entrega, se a pessoa informou; senão null.'),
  }),
  z.object({
    tipo: z.literal('atualizar_progresso'),
    tarefaId: id,
    percentual: z.number().int().min(0).max(100),
  }),
  z.object({
    tipo: z.literal('ajustar_datas'),
    tarefaId: id,
    dataInicio: data,
    dataFim: data,
  }),
  z.object({
    tipo: z.literal('criar_tarefa').describe('Nova tarefa no fim da fase, ou logo abaixo de inserirApos (herda a fase dela).'),
    faseId: id.nullable(),
    inserirApos: id.nullable(),
    titulo: z.string().min(1).max(160),
    dataInicio: data,
    dataFim: data,
    responsavelId: id.nullable().describe('Id de um recurso da lista "recursos"; null se não informado.'),
  }),
  z.object({
    tipo: z.literal('ordenar_fase_por_data').describe('Reordena as tarefas da fase pela data de início.'),
    faseId: id,
  }),
]);

const ProporAlteracoes = z.object({
  projetoId: id.describe('Id do projeto, como veio de ver_cronograma.'),
  resumo: z.string().min(1).max(300).describe('Uma frase dizendo o que a proposta faz.'),
  alteracoes: z.array(Operacao).min(1).max(LIMITE_DE_ALTERACOES),
});

/** JSON Schema para a API (sem a chave `$schema`). */
function paraJsonSchema(esquema: z.ZodType): Record<string, unknown> {
  const jsonSchema = { ...(z.toJSONSchema(esquema) as Record<string, unknown>) };
  delete jsonSchema.$schema;
  return jsonSchema;
}

function leitor<T>(esquema: z.ZodType<T>) {
  return (entrada: unknown): LeituraDaEntrada<T> => {
    const lido = esquema.safeParse(entrada);
    return lido.success ? { ok: true, dados: lido.data } : { ok: false, erro: z.prettifyError(lido.error) };
  };
}

export const ESQUEMAS_DO_AGENTE: EsquemasDoAgente = {
  verCronograma: { jsonSchema: paraJsonSchema(VerCronograma), ler: leitor(VerCronograma) },
  proporAlteracoes: { jsonSchema: paraJsonSchema(ProporAlteracoes), ler: leitor(ProporAlteracoes) },
};
