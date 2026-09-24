import type { LinhaEstruturaDTO } from '@contratos/tarefas.contrato';
import { diasEntreDatas } from '@/compartilhado/formatacao';

type Linha = LinhaEstruturaDTO;

const tarefasDe = (linhas: Linha[]) => linhas.filter((linha) => linha.tipo === 'tarefa');

export const estaAtrasada = (linha: Linha, hoje: string) =>
  linha.tipo === 'tarefa' && linha.percentualConcluido < 100 && !!linha.dataFim && linha.dataFim < hoje;

/** Percentual ponderado pela duração: a mesma regra do resumo das fases. */
function percentualPonderado(tarefas: Linha[]): number {
  const duracao = tarefas.reduce((soma, tarefa) => soma + tarefa.duracaoEmDias, 0);
  if (duracao === 0) return 0;
  const avanco = tarefas.reduce((soma, tarefa) => soma + tarefa.percentualConcluido * tarefa.duracaoEmDias, 0);
  return Math.round(avanco / duracao);
}

export interface Indicadores {
  percentual: number;
  total: number;
  concluidas: number;
  emAndamento: number;
  naoIniciadas: number;
  atrasadas: number;
  /** Maior término entre as tarefas. */
  fimProjetado: string | null;
}

export function calcularIndicadores(linhas: Linha[], hoje: string): Indicadores {
  const tarefas = tarefasDe(linhas);
  return {
    percentual: percentualPonderado(tarefas),
    total: tarefas.length,
    concluidas: tarefas.filter((tarefa) => tarefa.percentualConcluido === 100).length,
    emAndamento: tarefas.filter((tarefa) => tarefa.percentualConcluido > 0 && tarefa.percentualConcluido < 100).length,
    naoIniciadas: tarefas.filter((tarefa) => tarefa.percentualConcluido === 0).length,
    atrasadas: tarefas.filter((tarefa) => estaAtrasada(tarefa, hoje)).length,
    fimProjetado: tarefas.reduce<string | null>(
      (maior, tarefa) => (tarefa.dataFim && (!maior || tarefa.dataFim > maior) ? tarefa.dataFim : maior),
      null,
    ),
  };
}

export interface ResumoFase {
  linha: Linha;
  total: number;
  concluidas: number;
  atrasadas: number;
}

export function resumirFases(linhas: Linha[], hoje: string): ResumoFase[] {
  return linhas
    .filter((linha) => linha.tipo === 'fase')
    .map((fase) => {
      const subtarefas = linhas.filter((linha) => linha.tipo === 'tarefa' && linha.faseId === fase.id);
      return {
        linha: fase,
        total: subtarefas.length,
        concluidas: subtarefas.filter((tarefa) => tarefa.percentualConcluido === 100).length,
        atrasadas: subtarefas.filter((tarefa) => estaAtrasada(tarefa, hoje)).length,
      };
    });
}

/** Tarefas em aberto pelo término mais próximo; as atrasadas aparecem primeiro. */
export function proximasEntregas(linhas: Linha[], limite: number): Linha[] {
  return tarefasDe(linhas)
    .filter((tarefa) => tarefa.percentualConcluido < 100 && tarefa.dataFim)
    .sort((a, b) => a.dataFim!.localeCompare(b.dataFim!))
    .slice(0, limite);
}

export interface ResumoResponsavel {
  nome: string;
  abertas: number;
  atrasadas: number;
  proximaEntrega: string | null;
}

export function resumirResponsaveis(linhas: Linha[], hoje: string): ResumoResponsavel[] {
  const porNome = new Map<string, ResumoResponsavel>();
  for (const tarefa of tarefasDe(linhas)) {
    if (tarefa.percentualConcluido === 100) continue;
    const nome = tarefa.responsavelNome ?? 'Sem responsável';
    const resumo = porNome.get(nome) ?? { nome, abertas: 0, atrasadas: 0, proximaEntrega: null };
    resumo.abertas += 1;
    if (estaAtrasada(tarefa, hoje)) resumo.atrasadas += 1;
    if (tarefa.dataFim && (!resumo.proximaEntrega || tarefa.dataFim < resumo.proximaEntrega)) {
      resumo.proximaEntrega = tarefa.dataFim;
    }
    porNome.set(nome, resumo);
  }
  return [...porNome.values()].sort(
    (a, b) => b.atrasadas - a.atrasadas || b.abertas - a.abertas || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
}

export function rotuloDoPrazo(dataFim: string, hoje: string): string {
  const dias = diasEntreDatas(hoje, dataFim);
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  if (dias > 1) return `em ${dias} dias`;
  return dias === -1 ? 'atrasada há 1 dia' : `atrasada há ${-dias} dias`;
}

/** Posição de uma data dentro de [inicio, fim], em % da largura, para as barras do dashboard. */
export function escalaDeTempo(inicio: string, fim: string) {
  const total = Math.max(1, diasEntreDatas(inicio, fim) + 1);
  return {
    posicao: (data: string) => Math.min(100, Math.max(0, (diasEntreDatas(inicio, data) / total) * 100)),
    largura: (de: string, ate: string) => Math.max(0.6, ((diasEntreDatas(de, ate) + 1) / total) * 100),
  };
}

export function mesesEntre(inicio: string, fim: string): { inicio: string; rotulo: string }[] {
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const meses: { inicio: string; rotulo: string }[] = [];
  const [ano, mes] = inicio.split('-').map(Number) as [number, number];
  for (let indice = 0; ; indice++) {
    const data = new Date(Date.UTC(ano, mes - 1 + indice, 1));
    const iso = data.toISOString().slice(0, 10);
    if (iso > fim) break;
    meses.push({ inicio: iso, rotulo: `${nomes[data.getUTCMonth()]}/${String(data.getUTCFullYear()).slice(2)}` });
  }
  return meses;
}
