import type { EstruturaCronogramaDTO } from '@contratos/tarefas.contrato';
import { type ContextoDaAnalise, montarContexto } from './contexto-da-analise';
import type { ResumoDoCronograma } from './portas';

/**
 * Tamanho máximo do JSON de dados enviado a cada pergunta (~100 mil tokens). Passando disso o
 * pedido não cabe em boa parte dos modelos, então o chat recusa em vez de truncar em silêncio.
 */
export const LIMITE_DE_CARACTERES_DO_CONTEXTO = 400_000;

/**
 * Tudo o que o chat pode consultar: as linhas de cada cronograma em andamento, como na análise de
 * projeto. Valem as mesmas exclusões: sem evidência das tarefas e sem IDs internos.
 */
export interface ContextoDoChat {
  hoje: string;
  projetos: Omit<ContextoDaAnalise, 'hoje'>[];
}

export function montarContextoDoChat(
  itens: { resumo: ResumoDoCronograma; estrutura: EstruturaCronogramaDTO }[],
  hoje: string,
): ContextoDoChat {
  return {
    hoje,
    projetos: itens.map(({ resumo, estrutura }) => {
      const { cronograma, linhas } = montarContexto(resumo, estrutura, hoje);
      return { cronograma, linhas };
    }),
  };
}

/** JSON compacto: campos nulos, falsos ou vazios são omitidos (as instruções dizem que ausente = vazio). */
export function serializarContextoDoChat(contexto: object): string {
  return JSON.stringify(contexto, (_chave, valor: unknown) =>
    valor === null || valor === false || (Array.isArray(valor) && valor.length === 0) ? undefined : valor,
  );
}
