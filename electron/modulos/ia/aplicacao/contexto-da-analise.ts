import type { EstruturaCronogramaDTO } from '@contratos/tarefas.contrato';
import type { ResumoDoCronograma } from './portas';

/**
 * O que é enviado à IA: só o necessário para analisar prazos e cargas. Ficam de fora a
 * evidência das tarefas e os IDs internos; as tarefas são identificadas pelo número WBS.
 */
export interface ContextoDaAnalise {
  hoje: string;
  cronograma: { nome: string; situacao: string; inicio: string; fim: string; descricao: string | null };
  linhas: LinhaDoContexto[];
}

export interface LinhaDoContexto {
  n: string;
  tipo: 'fase' | 'tarefa';
  titulo: string;
  fase: string | null;
  inicio: string | null;
  fim: string | null;
  /** Data em que a tarefa foi de fato concluída; `null` enquanto não registrada. */
  efetiva: string | null;
  dias: number;
  pct: number;
  responsavel: string | null;
  predecessoras: string[];
  critico: boolean;
  folgaDias: number | null;
  comecaAntesDaPredecessora: boolean;
}

export function montarContexto(
  cronograma: ResumoDoCronograma,
  estrutura: EstruturaCronogramaDTO,
  hoje: string,
): ContextoDaAnalise {
  const nomeDaFase = new Map(
    estrutura.linhas.filter((linha) => linha.tipo === 'fase').map((fase) => [fase.id, fase.titulo]),
  );
  return {
    hoje,
    cronograma: {
      nome: cronograma.nome,
      situacao: cronograma.situacao,
      inicio: cronograma.dataInicio,
      fim: cronograma.dataFim,
      descricao: cronograma.descricao,
    },
    linhas: estrutura.linhas.map((linha) => ({
      n: linha.numero,
      tipo: linha.tipo,
      titulo: linha.titulo,
      fase: linha.faseId ? (nomeDaFase.get(linha.faseId) ?? null) : null,
      inicio: linha.dataInicio,
      fim: linha.dataFim,
      efetiva: linha.dataEfetiva,
      dias: linha.duracaoEmDias,
      pct: linha.percentualConcluido,
      responsavel: linha.responsavelNome,
      predecessoras: linha.dependenciasNumeros,
      critico: linha.critico,
      folgaDias: linha.folgaEmDias,
      comecaAntesDaPredecessora: linha.conflitoDeDependencia,
    })),
  };
}
