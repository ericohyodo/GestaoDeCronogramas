import type { LinhaRelatorioAvDTO } from '@contratos/avs.contrato';

/** Mesmo teto do chat de cronogramas: acima disso o pedido não cabe em boa parte dos modelos. */
export const LIMITE_DE_CARACTERES_DO_CONTEXTO_DAS_AVS = 400_000;

/** Tudo o que a IA enxerga sobre as AVs: uma linha por AV, sem IDs internos. */
export interface ContextoDasAvs {
  hoje: string;
  avs: Omit<LinhaRelatorioAvDTO, 'id'>[];
}

export function montarContextoDasAvs(linhas: readonly LinhaRelatorioAvDTO[], hoje: string): ContextoDasAvs {
  return {
    hoje,
    avs: linhas.map((linha) => {
      const semId: Partial<LinhaRelatorioAvDTO> = { ...linha };
      delete semId.id;
      // Só a data de abertura: o horário não ajuda a análise e gasta espaço.
      return { ...(semId as Omit<LinhaRelatorioAvDTO, 'id'>), abertaEm: linha.abertaEm.slice(0, 10) };
    }),
  };
}

/** JSON compacto: campos nulos, falsos ou vazios são omitidos (as instruções dizem que ausente = vazio). */
export function serializarContextoDasAvs(contexto: ContextoDasAvs): string {
  return JSON.stringify(contexto, (_chave, valor: unknown) =>
    valor === null || valor === false || (Array.isArray(valor) && valor.length === 0) ? undefined : valor,
  );
}

/** Saúde do conjunto de AVs, calculada a partir dos prazos: sem atraso é "no prazo"; a partir de 30% das
 * AVs em andamento atrasadas, "crítico"; no meio, "atenção". */
export function saudeDasAvs(linhas: readonly LinhaRelatorioAvDTO[]): 'no_prazo' | 'atencao' | 'critico' {
  const emAndamento = linhas.filter((linha) => linha.situacao === 'em_andamento');
  const atrasadas = emAndamento.filter((linha) => linha.atrasada).length;
  if (atrasadas === 0) return 'no_prazo';
  return atrasadas / emAndamento.length >= 0.3 ? 'critico' : 'atencao';
}
